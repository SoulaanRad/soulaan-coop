import { defineConfig } from "tsup";
import { createRequire } from "module";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  bundle: true,
  // Bundle packages that have ESM issues
  noExternal: [
    "@sashimo/lib",
    "@openai/agents-core",
    "@openai/agents",
    "@repo/trpc",
    "@repo/validators",
  ],
  external: [
    "@repo/db",
    "@prisma/client",
    ".prisma/client",
  ],
  // Ensure proper ESM output
  platform: "node",
  target: "node18",
  outExtension: () => ({ js: ".js" }),
  // Inject require shim for ESM
  banner: {
    js: `import { createRequire } from 'module';
const require = createRequire(import.meta.url);`,
  },
  shims: true,
});

