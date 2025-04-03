import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/runtime/lazyMemo.ts",
    "src/babel-plugin/index.ts",
  ],
  format: ["esm", "cjs"],
  experimentalDts: true,
  noExternal: ["@solid-primitives/memo"],
});
