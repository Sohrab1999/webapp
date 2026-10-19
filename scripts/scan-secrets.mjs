#!/usr/bin/env node
// Repository secret scanner — roadmap task P2.4 (`npm run verify`, stage 5).
//
// Scope (per P2.4 spec §3): inspect the files that would actually be included
// in the repository — the git index (tracked + staged additions) and
// non-ignored untracked files. Git-ignored files (.env, upload/, books/,
// node_modules/, .next/, ...) are NOT scanned as project source. Git history
// is NOT scanned (separate concern, out of P2.4 scope).
//
// Output safety: a finding prints ONLY <path>:<line>, the rule id, and
// remediation guidance. The matched value is never printed, logged, or
// included in any finding field.
//
// Exit codes: 0 = clean, 1 = findings, 2 = environment/usage error.
// No network access; deterministic; does not modify the working tree.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  EXIT,
  CONTENT_SCAN_SIZE_CAP,
  banner,
  isMain,
  listCommitCandidates,
  printFinding,
  printSummary,
  repoRoot,
} from "./lib/verify-common.mjs";

/* ------------------------------------------------------------------ */
/* Content rules — grounded in real credential formats, not keywords.  */
/* ------------------------------------------------------------------ */

export const CONTENT_RULES = [
  {
    id: "SEC-001",
    description: "Private key block (RSA/EC/DSA/OPENSSH/PGP/ENCRYPTED)",
    regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY( BLOCK)?-----/g,
    message:
      "private key material — remove the file from the index " +
      "(git rm --cached <path>), rotate the key, keep it out of git",
  },
  {
    id: "SEC-002",
    description: "GitHub token (classic ghp_/gho_/ghu_/ghs_/ghr_ or fine-grained github_pat_)",
    regex:
      /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})\b/g,
    message:
      "GitHub token — revoke it (settings/tokens), git rm --cached the file, " +
      "load tokens from the environment instead",
  },
  {
    id: "SEC-003",
    description: "AWS access key id (AKIA/ASIA…)",
    regex: /\bA(?:KIA|SIA)[0-9A-Z]{16}\b/g,
    message:
      "AWS access key id — deactivate the key in IAM, remove the file from git",
  },
  {
    id: "SEC-004",
    description: "Google API key (AIza…)",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    message:
      "Google API key — rotate it in Google Cloud console, remove from git",
  },
  {
    id: "SEC-005",
    description: "Slack token (xoxb/xoxa/xoxp/xoxr/xoxs-…)",
    regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
    message: "Slack token — revoke it, remove from git",
  },
  {
    id: "SEC-006",
    description: "Stripe live secret/roll key (sk_live_/rk_live_…)",
    regex: /\b[sr]k_live_[A-Za-z0-9]{20,}\b/g,
    message: "Stripe live secret key — roll it in the dashboard, remove from git",
  },
  {
    id: "SEC-007",
    description: "OpenAI-style API key (sk-…T3BlbkFJ… or sk-proj-…)",
    regex:
      /\b(?:sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9_-]{40,})\b/g,
    message: "OpenAI-style API key — rotate it, remove from git",
  },
  {
    id: "SEC-008",
    description: "npm registry auth token (_authToken=<value>)",
    regex: /_authToken\s*[=:]\s*["']?([A-Za-z0-9_-]{16,})["']?/g,
    message:
      "npm auth token in a committed file — keep registry tokens in " +
      "~/.npmrc or the environment, not in the repository",
  },
  {
    id: "SEC-009",
    description:
      "Credential assignment (password/api_key/secret/token… = high-entropy-looking literal)",
    regex:
      /\b(?:password|passwd|pwd|api[_-]?key|api[_-]?secret|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|auth[_-]?secret|private[_-]?key|secret)\b\s*[:=]\s*["']?([A-Za-z][A-Za-z0-9._+/-]{15,})["']?/gi,
    message:
      "hard-coded credential-looking literal — load it from the environment " +
      "instead; if this is a placeholder, reword it so it cannot be mistaken " +
      "for a real value",
  },
  {
    id: "SEC-010",
    description: "Credentials embedded in a URL userinfo slot (scheme://user:secret@host)",
    regex: /\bhttps?:\/\/[^\s/:@]+:([^\s/@]{8,})@[^\s/@]/gi,
    message:
      "URL-embedded credential — use the environment or a credential helper; " +
      "never put secrets in URLs",
  },
];

/** Value filters for the loose rules (SEC-008/009/010) so documentation
 * placeholders and dynamic references are not flagged. Narrow by design —
 * never used to silence whole directories. */
const PLACEHOLDER_WORDS = new Set([
  "none", "null", "undefined", "true", "false", "empty", "redacted",
  "todo", "tbd", "na", "n/a", "changeme", "change-me", "placeholder",
  // Canonical documentation placeholders for the userinfo/assignment slots:
  "password", "pass", "secret", "token", "apikey", "api-key",
]);

export function isPlaceholderValue(raw) {
  const v = String(raw).trim().toLowerCase();
  if (v.length === 0) return true;
  if (PLACEHOLDER_WORDS.has(v)) return true;
  if (/^(?:[$<{%])/.test(v)) return true; // $VAR, ${VAR}, <PLACEHOLDER>, {{tpl}}
  // Placeholder-word-prefixed values, matched against the WHOLE value so a
  // real secret that merely contains these letters elsewhere is unaffected:
  if (
    /^(?:your|my|example|sample|dummy|fake|insert|enter|replace|placeholder|changeme|change-me|redacted)[-_0-9a-z]*$/.test(
      v,
    )
  ) {
    return true;
  }
  if (/^(.)\1{7,}$/.test(v)) return true; // aaaaaaaa / xxxxxxxx / ********
  return false;
}

export function isDynamicReference(raw) {
  const v = String(raw);
  return /(?:process\.env|import\.meta\.env|os\.environ|config\.|params\.|props\.|settings\.|options\.|this\.|env\.)/i.test(
    v,
  );
}

/* ------------------------------------------------------------------ */
/* Path rules — credential stores that must not be committed.          */
/* ------------------------------------------------------------------ */

export const CREDENTIAL_PATH_PATTERNS = [
  {
    id: "SEC-011",
    test: /(^|\/)id_(rsa|ed25519|ecdsa|dsa)(\..*)?$/i,
    message:
      "SSH private-key file — keep it in ~/.ssh (never commit); if this is a " +
      "test fixture, rename it so it cannot be mistaken for a key store",
  },
  {
    id: "SEC-011",
    test: /(^|\/)\.ssh(\/|$)/i,
    message: "SSH directory content must not be committed",
  },
  {
    id: "SEC-011",
    test: /\.(pem|key|pfx|p12|p12b|jks|keystore)$/i,
    message:
      "key/certificate store file — if it contains a private key it must not " +
      "be committed; if a public certificate genuinely must be committed, " +
      "document an explicit narrow allowlist in this scanner first",
  },
  {
    id: "SEC-011",
    test: /(^|\/)(\.netrc|\.git-credentials|credentials\.json)$/i,
    message:
      "credential store file (.netrc/.git-credentials/credentials.json) — " +
      "must not be committed",
  },
];

export function checkCredentialPath(relPath) {
  for (const rule of CREDENTIAL_PATH_PATTERNS) {
    if (rule.test.test(relPath)) {
      return { path: relPath, line: null, rule: rule.id, message: rule.message };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Pure content scan (used by CLI and unit tests).                     */
/* ------------------------------------------------------------------ */

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/** Scan one file's text with all content rules. Findings never carry the
 * matched value — only rule id + line + remediation. */
export function scanText(text) {
  const findings = [];
  for (const rule of CONTENT_RULES) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(text)) !== null) {
      // Loose rules (SEC-008/009/010) get placeholder/dynamic-reference
      // filtering on the captured value; strict format rules never do.
      const loose = rule.id === "SEC-008" || rule.id === "SEC-009" || rule.id === "SEC-010";
      if (loose) {
        const value = m[1] ?? m[0];
        if (isPlaceholderValue(value) || isDynamicReference(value)) continue;
        // SEC-009 additionally requires a letter+digit mix so that ordinary
        // prose phrases assigned to credential-sounding keys are not flagged.
        // Known limitation (documented): an all-letter hard-coded password is
        // not caught by this rule — such cases rely on human review.
        if (rule.id === "SEC-009" && !/[A-Za-z]/.test(value)) continue;
        if (rule.id === "SEC-009" && !/[0-9]/.test(value)) continue;
      }
      findings.push({
        path: null, // filled by caller
        line: lineOf(text, m.index),
        rule: rule.id,
        message: rule.message,
      });
      if (m.index === rule.regex.lastIndex) rule.regex.lastIndex++; // zero-length guard
    }
  }
  return findings;
}

/** CLI main. */
export function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/scan-secrets.mjs\n\n" +
        "Scans git index (tracked + staged) and non-ignored untracked files for\n" +
        "credential-shaped content and credential-store filenames. Never prints\n" +
        "matched values. Exit 0 clean / 1 findings / 2 environment error.\n\n" +
        "Rules:\n" +
        CONTENT_RULES.map((r) => `  ${r.id}  ${r.description}`).join("\n") +
        "\n  SEC-011  Credential-store filenames (id_rsa, *.pem/*.key/*.pfx/*.p12/*.jks, .netrc, .git-credentials, credentials.json, .ssh/)\n",
    );
    return EXIT.OK;
  }

  const root = repoRoot();
  banner("Secret scan (scripts/scan-secrets.mjs)");
  const candidates = listCommitCandidates(root);
  const findings = [];
  let contentScanned = 0;
  let skippedBinary = 0;
  let skippedSize = 0;
  let unreadable = 0;

  for (const rel of candidates) {
    const pathFinding = checkCredentialPath(rel);
    if (pathFinding) findings.push(pathFinding);

    const abs = join(root, rel);
    let size;
    try {
      size = statSync(abs).size;
    } catch {
      // In the index but absent from the work tree (staged deletion): nothing
      // to content-scan; the path rules above already ran.
      unreadable++;
      continue;
    }
    if (size > CONTENT_SCAN_SIZE_CAP) {
      skippedSize++;
      continue;
    }
    let buf;
    try {
      buf = readFileSync(abs);
    } catch {
      unreadable++;
      continue;
    }
    if (buf.includes(0)) {
      skippedBinary++;
      continue;
    }
    contentScanned++;
    for (const f of scanText(buf.toString("utf8"))) {
      findings.push({ ...f, path: rel });
    }
  }

  for (const f of findings) printFinding(f);
  printSummary(contentScanned, findings, "secret-scan");
  if (skippedBinary || skippedSize || unreadable) {
    process.stdout.write(
      `  (content scan skipped: ${skippedBinary} binary, ${skippedSize} over ` +
        `${Math.round(CONTENT_SCAN_SIZE_CAP / 1024 / 1024)} MiB cap, ${unreadable} absent from work tree)\n`,
    );
  }
  return findings.length > 0 ? EXIT.FINDINGS : EXIT.OK;
}

if (isMain(import.meta.url)) {
  process.exitCode = main();
}
