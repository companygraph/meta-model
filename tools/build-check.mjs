// The JavaScript in `lib/` and `bin/` is what a consumer runs and what an instance's CI checks
// out at a tag, so it is committed: nothing installs or builds on their side. It is written from
// `src/` by `npm run build`, and this holds the committed copy to what that build writes. It
// builds into a temporary folder, never over the committed files, because CI never writes what
// the repository commits; it only says whether the two are the same.
//
// Two failures, each named by path. A file the build writes that is missing or differs byte for
// byte is a source edited without `npm run build` after it, or an edit to the output that the
// next build would undo. A committed file of the kind the build writes that it did not write is
// output left behind by a source that is gone, and a consumer would still import it.
//
//   node tools/build-check.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = ["lib", "bin"];
// What tsc writes for a `.mts` source; anything else in `lib/` or `bin/` is not the build's.
const EMITTED = /\.(mjs|d\.mts)$/;

// The compiler as installed by `npm ci`, run by this Node rather than through a shell, so the
// same line works on Windows, where `node_modules/.bin/tsc` is a `.cmd`.
const tsc = join(dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin", "tsc");

// Every file under a folder, keyed by its path from `base` with `/`, whatever the platform says.
function filesUnder(base, rel) {
  const out = [];
  if (!existsSync(join(base, rel))) return out;
  for (const entry of readdirSync(join(base, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesUnder(base, child));
    else out.push(child);
  }
  return out;
}

const temp = mkdtempSync(join(tmpdir(), "meta-model-build-"));
const failures = [];
try {
  const built = spawnSync(process.execPath, [tsc, "--project", ROOT, "--outDir", temp], { cwd: ROOT, encoding: "utf8" });
  if (built.status !== 0) {
    console.error(`${built.stdout}${built.stderr}`);
    console.error(`✗ tsc answered ${built.status ?? built.signal}; nothing was compared`);
    process.exit(1);
  }
  const written = new Set(OUT.flatMap((dir) => filesUnder(temp, dir)));
  for (const path of [...written].sort()) {
    const committed = join(ROOT, path);
    if (!existsSync(committed)) failures.push(`${path} is what the build writes, and it is not committed`);
    else if (!readFileSync(committed).equals(readFileSync(join(temp, path))))
      failures.push(`${path} is not what the build writes from src/; run npm run build and commit what it writes`);
  }
  for (const path of OUT.flatMap((dir) => filesUnder(ROOT, dir)).sort())
    if (EMITTED.test(path) && !written.has(path))
      failures.push(`${path} is committed, and no source in src/ writes it`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} generated file${failures.length > 1 ? "s" : ""} out of step with src/\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ ${OUT.map((dir) => `${dir}/`).join(" and ")} are what src/ compiles to`);
