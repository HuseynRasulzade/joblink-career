import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    // The four rules below are diagnostics of React's optional compiler (they decide what it may optimise); this project does not use
    // the compiler, and the patterns they flag (loading data in an effect, a timestamp as a key, writing location.hash) are correct here.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // A switch row holds its text a few levels down (label > span > b), which the default depth does not reach.
      "jsx-a11y/label-has-associated-control": ["error", { depth: 4 }],
      // The public pages (jobs, calculators) are separate server-rendered pages: a plain link is what leads to them from the app.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    // The desktop wrapper is a CommonJS Electron main file.
    files: ["desktop/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);

export default eslintConfig;
