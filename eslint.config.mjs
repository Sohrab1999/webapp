import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local scratch persisted by tooling (gitignored, never committed):
    "tool-results/**",
    // Platform-provided environment material, not part of this repo (gitignored):
    "skills/**",
    // Vendored third-party sources (unmodified upstream Papermorph engine, see
    // docs/architecture/PAPERMORPH_VENDORING.md) — upstream code is never
    // re-styled to fit app lint conventions; the app boundary is src/.
    "vendor/**",
  ]),
]);

export default eslintConfig;
