import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep these React/JSX diagnostics visible without blocking typecheck and production-build verification.
  { rules: { "react-hooks/set-state-in-effect": "warn", "react/no-unescaped-entities": "warn" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
