// Unit tests for the forbidden-file / repository-hygiene scanner (P2.4).
// Covers the Gate C2 criterion 5 patterns (*.pdf, books/*/pages/) plus the
// documented hygiene rules, template exceptions, and permitted-file passes.
import { describe, it, expect } from "vitest";
import { checkPath, MAX_FILE_BYTES } from "./scan-forbidden-files.mjs";

describe("FORB-001 — PDFs are rejected", () => {
  it("flags .pdf in any directory and any case", () => {
    for (const p of ["doc.pdf", "docs/manual.pdf", "upload/x.PDF", "a/b/c/Book.pdf"]) {
      expect(checkPath(p)?.rule).toBe("FORB-001");
    }
  });

  it("does not flag non-PDF extensions that merely contain 'pdf'", () => {
    expect(checkPath("docs/pdfutils.ts")).toBeNull();
    expect(checkPath("assets/pdfx-reader.mjs")).toBeNull();
  });
});

describe("FORB-002 — generated book artifacts are rejected (subsumes books/*/pages/)", () => {
  it("flags the C2 criterion 5 pattern books/*/pages/", () => {
    for (const p of ["books/demo/pages/page-001.png", "books/v1/L1/pages/foo.jpg"]) {
      expect(checkPath(p)?.rule).toBe("FORB-002");
    }
  });

  it("flags the whole generated books/ tree", () => {
    expect(checkPath("books/demo/lib/engine.js")?.rule).toBe("FORB-002");
    expect(checkPath("books/demo/book.json")?.rule).toBe("FORB-002");
  });

  it("does not overreach into names that merely start with 'book'", () => {
    expect(checkPath("storybook/pages/home.tsx")).toBeNull();
    expect(checkPath("src/lib/bookmarks.ts")).toBeNull();
  });
});

describe("FORB-003 — env files except sanctioned templates", () => {
  it("flags real env files, including force-added or nested ones", () => {
    for (const p of [".env", "web/.env", ".env.local", ".env.production", "apps/api/.env.staging"]) {
      expect(checkPath(p)?.rule).toBe("FORB-003");
    }
  });

  it("allows the explicitly permitted template(s)", () => {
    expect(checkPath(".env.example")).toBeNull();
    expect(checkPath(".env.local.example")).toBeNull();
  });
});

describe("FORB-004 — generated directories (defense-in-depth)", () => {
  it("flags committed build output regardless of .gitignore state", () => {
    for (const p of ["node_modules/x/index.js", ".next/cache/1", "out/index.html", "dist/bundle.js", "coverage/lcov.info"]) {
      expect(checkPath(p)?.rule).toBe("FORB-004");
    }
  });
});

describe("FORB-005 — temp/backup/OS-junk files", () => {
  it("flags editor backups, temp files, and OS junk", () => {
    for (const p of ["notes.bak", "f.orig", "f.rej", "f.tmp", "f.swp", "f~", ".DS_Store", "img/Thumbs.db"]) {
      expect(checkPath(p)?.rule).toBe("FORB-005");
    }
  });

  it("does not flag legitimate files with similar names", () => {
    expect(checkPath("notes.backup.ts")).toBeNull();
    expect(checkPath("template.jsx")).toBeNull();
  });
});

describe("FORB-006 — size guard", () => {
  it("flags files above the 5 MiB threshold", () => {
    expect(checkPath("assets/big-archive.zip", MAX_FILE_BYTES + 1)?.rule).toBe("FORB-006");
  });

  it("allows files at/below the threshold (incl. the ~2.3 MiB MathJax bundle)", () => {
    expect(checkPath("vendor/engine/vendor/mathjax/tex-svg-full.js", 2_275_113)).toBeNull();
    expect(checkPath("at-limit.bin", MAX_FILE_BYTES)).toBeNull();
  });
});

describe("permitted repository content passes naturally", () => {
  it("fonts, licenses, notices, vendor tree, permissions docs", () => {
    const permitted = [
      "public/fonts/vazirmatn/Vazirmatn-Variable.woff2",
      "public/fonts/inter/InterVariable.woff2",
      "public/fonts/vazirmatn/OFL.txt",
      "public/fonts/inter/LICENSE.txt",
      "vendor/LICENSE",
      "vendor/engine/engine.js",
      "vendor/engine/vendor/mathjax/LICENSE",
      "vendor/papermorph.pin",
      "THIRD_PARTY_NOTICES.md",
      "docs/content/RIGHTS_REGISTER.md",
      "docs/content/permissions/PERMISSION_REQUEST_jamal-ahmadi.md",
      ".gitignore",
    ];
    for (const p of permitted) {
      expect(checkPath(p, 1000)).toBeNull();
    }
  });
});
