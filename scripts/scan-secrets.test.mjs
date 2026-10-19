// Unit tests for the repository secret scanner (roadmap P2.4).
// Every "secret" below is a SYNTHETIC value that matches the SHAPE of a real
// credential format but is not a credential. Findings must never echo the
// matched value back (asserted explicitly).
import { describe, it, expect } from "vitest";
import {
  CONTENT_RULES,
  scanText,
  isPlaceholderValue,
  isDynamicReference,
  checkCredentialPath,
} from "./scan-secrets.mjs";

// Synthetic shapes — obviously fake, pattern-conformant.
const FAKE_GH_CLASSIC = "ghp_" + "Z9y8X7W6v5U4t3S2r1Q0p9O8n7M6l5K4j3H2"; // 36 chars
const FAKE_GH_FINE_EXACT =
  "github_pat_" +
  "A1".repeat(11) +
  "_" +
  ("b2c3d4".repeat(10)).slice(0, 59); // 22 + 1 + 59
// Built by concatenation so this test source contains NO literals matching
// the credential formats under test — otherwise the scanner would flag its
// own fixture file on every run (and no suppression rules are allowed).
const FAKE_KEY_LINE = ["-----", "BEGIN ", "OPENSSH", " PRIVATE ", "KEY", "-----"].join("");
const FAKE_KEY_LINE_RSA = ["-----", "BEGIN ", "RSA", " PRIVATE ", "KEY", "-----"].join("");
const FAKE_ASSIGN_VALUE = "Abc123" + "def456" + "ghi789jkl";
const FAKE_URL_CRED = "url: https://deploy-user:" + "SuperSecret" + "Value9" + "@host.example/x";
const FAKE_AWS = "AKIA" + "QW3ERTYUIOPASDFG"; // exactly 16 uppercase
const FAKE_GOOGLE = "AIza" + "Aa1".repeat(11) + "Aa"; // exactly 35
const FAKE_SLACK = "xoxb-" + "1234567890abcdef";
const FAKE_STRIPE = "sk_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2";
const FAKE_OPENAI = "sk-" + "a1B2c3D4e5F6g7H8i9J0" + "T3BlbkFJ" + "Z9y8X7W6v5U4t3S2r1Q0";

function rulesFor(id) {
  return CONTENT_RULES.filter((r) => r.id === id).map((r) => r.id);
}

describe("secret scanner — content rules detect synthetic credential shapes", () => {
  it("SEC-002 detects a synthetic classic GitHub token", () => {
    const f = scanText(`token: ${FAKE_GH_CLASSIC}`);
    expect(f.map((x) => x.rule)).toContain("SEC-002");
  });

  it("SEC-002 detects a synthetic fine-grained GitHub token", () => {
    expect(FAKE_GH_FINE_EXACT.length).toBe("github_pat_".length + 22 + 1 + 59);
    expect(FAKE_GOOGLE.length).toBe(4 + 35);
    expect(FAKE_AWS.length).toBe(4 + 16);
    const f = scanText(`GITHUB_TOKEN=${FAKE_GH_FINE_EXACT}`);
    expect(f.map((x) => x.rule)).toContain("SEC-002");
  });

  it("SEC-001 detects private key block headers", () => {
    expect(FAKE_KEY_LINE.length).toBe(35); // structural check, no literal in source
    expect(scanText(FAKE_KEY_LINE).map((x) => x.rule)).toContain("SEC-001");
    expect(scanText(FAKE_KEY_LINE_RSA).map((x) => x.rule)).toContain("SEC-001");
  });

  it("SEC-003/004/005/006/007 detect their vendor formats", () => {
    expect(scanText(`aws_access_key_id=${FAKE_AWS}`).map((x) => x.rule)).toContain("SEC-003");
    expect(scanText(`key: ${FAKE_GOOGLE}`).map((x) => x.rule)).toContain("SEC-004");
    expect(scanText(`slack ${FAKE_SLACK}`).map((x) => x.rule)).toContain("SEC-005");
    expect(scanText(`stripe ${FAKE_STRIPE}`).map((x) => x.rule)).toContain("SEC-006");
    expect(scanText(`openai ${FAKE_OPENAI}`).map((x) => x.rule)).toContain("SEC-007");
  });

  it("SEC-009 flags a hard-coded credential-looking literal", () => {
    const f = scanText(`API_KEY = "${FAKE_ASSIGN_VALUE}"`);
    expect(f.map((x) => x.rule)).toContain("SEC-009");
  });

  it("SEC-010 flags URL-embedded credentials", () => {
    const f = scanText(FAKE_URL_CRED);
    expect(f.map((x) => x.rule)).toContain("SEC-010");
  });
});

describe("secret scanner — placeholders and dynamic references are not flagged", () => {
  it("skips environment lookups", () => {
    expect(scanText("password: process.env.DB_PASSWORD")).toEqual([]);
    expect(scanText('apiKey = import.meta.env.VITE_KEY_1')).toEqual([]);
  });

  it("skips documentation placeholder values", () => {
    expect(scanText('password = "changeme-123456"')).toEqual([]);
    expect(scanText("api_key: <your-api-key-here>")).toEqual([]);
    expect(scanText("secret: ${SECRET_VALUE_1}")).toEqual([]);
    expect(scanText("client_secret = XXXXXXXXXXXXXXXX")).toEqual([]);
  });

  it("skips prose and benign code", () => {
    expect(scanText("DATABASE_URL=file:./db/custom.db")).toEqual([]);
    expect(scanText("const token = req.headers.authorization;")).toEqual([]);
    expect(
      scanText("The password field is stored hashed; never log the raw value."),
    ).toEqual([]);
  });
});

describe("secret scanner — credential-store paths", () => {
  it("flags private-key and credential-store filenames", () => {
    for (const p of ["deploy/id_rsa", "keys/server.pem", "app.p12", ".netrc", ".git-credentials", "gcloud/credentials.json"]) {
      expect(checkCredentialPath(p)?.rule).toBe("SEC-011");
    }
    expect(checkCredentialPath(".ssh/known_hosts")?.rule).toBe("SEC-011");
  });

  it("does not flag ordinary project paths", () => {
    for (const p of ["src/index.ts", "docs/notes.md", "public/fonts/inter/InterVariable.woff2", "scripts/verify.mjs"]) {
      expect(checkCredentialPath(p)).toBeNull();
    }
  });
});

describe("secret scanner — output safety and misc", () => {
  it("findings never contain the matched value", () => {
    const f = scanText(`GITHUB_TOKEN=${FAKE_GH_CLASSIC}\nPASSWORD='${FAKE_ASSIGN_VALUE}'`);
    expect(f.length).toBeGreaterThan(0);
    expect(JSON.stringify(f)).not.toContain(FAKE_GH_CLASSIC);
    expect(JSON.stringify(f)).not.toContain(FAKE_ASSIGN_VALUE);
    expect(JSON.stringify(f)).not.toContain("ghp_");
  });

  it("reports line numbers", () => {
    const f = scanText("line1\nline2\n" + FAKE_KEY_LINE_RSA);
    expect(f[0].line).toBe(3);
  });

  it("every rule id referenced in tests exists", () => {
    expect(rulesFor("SEC-001")).toEqual(["SEC-001"]);
    expect(rulesFor("SEC-002")).toEqual(["SEC-002"]);
  });
});

describe("value filters", () => {
  it("isPlaceholderValue", () => {
    expect(isPlaceholderValue("XXXXXXXXXXXXXXXX")).toBe(true);
    expect(isPlaceholderValue("<your-key-here>")).toBe(true);
    expect(isPlaceholderValue("${SECRET_1}")).toBe(true);
    expect(isPlaceholderValue("changeme-123456")).toBe(true);
    expect(isPlaceholderValue("Z9y8X7W6v5U4t3S2r1Q0p9O8n7M6l5K4j3H2")).toBe(false);
  });

  it("isDynamicReference", () => {
    expect(isDynamicReference("process.env.DATABASE_URL")).toBe(true);
    expect(isDynamicReference("Z9y8X7W6v5U4t3S2r1Q0p9O8n7M6l5K4j3H2")).toBe(false);
  });
});
