import { build } from "esbuild";

await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ["chrome110", "firefox115", "safari17"],
  format: "iife",
  outfile: "viewer.bundle.js",
  legalComments: "eof",
  logLevel: "info",
});
