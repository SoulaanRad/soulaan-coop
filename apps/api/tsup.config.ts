import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  bundle: true,
  // Bundle everything except Node.js built-ins and these specific packages
  noExternal: [
    "@sashimo/lib",
    "@openai/agents-core",
  ],
  external: [
    "@repo/db",
    "@repo/validators",
  ],
  // Ensure proper ESM output
  platform: "node",
  target: "node18",
  outExtension: () => ({ js: ".js" }),
});

