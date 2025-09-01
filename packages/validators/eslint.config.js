import baseConfig from "@repo/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  {
    // Override zod import restriction for proposal files (needs standard zod for @openai/agents)
    files: ["src/proposal-engine.ts", "src/proposal.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
