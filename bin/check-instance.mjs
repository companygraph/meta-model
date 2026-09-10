#!/usr/bin/env node
// The mechanical half of R0, run over one instance:
//
//   node bin/check-instance.mjs [path to the instance, default .]
//
// It is not the whole of R0 and says so on every run. `companygraph-validate` judges every
// entity against its schema's `## Writing rules`, and nothing mechanical reaches those — a
// machine can check that an evidence cell's reference resolves, not that the cell states a fact
// rather than restating the level. A green run here covers the rules named below and no others.
//
// Where the rules come from is the point. The schemas are read from the instance's own vendored
// core, never from this package's `core/`, so taking a newer release of this checker never
// re-validates an instance against rules it has not adopted. The two pins that decide that are
// held against each other before anything is read: an instance names the release of this
// checker it calls in `.companygraph/manifest.json`, and a checker that is not that release
// refuses rather than reporting on rules nobody chose.
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstance, MODEL } from "../lib/checks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8")).version;

const root = resolve(process.argv[2] ?? ".");
const die = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const manifestPath = join(root, ".companygraph", "manifest.json");
if (!existsSync(manifestPath))
  die(`${root} has no .companygraph/manifest.json — an instance names the core it vendored`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// The guard, and the reason it cannot be left to whoever moves a pin: a caller names a release
// in a workflow line and another in this manifest, and nothing in a runner can see the first.
// So the release compares itself against the one the instance asked for.
if (manifest.tooling !== VERSION)
  die(
    `this checker is ${VERSION} and .companygraph/manifest.json names ${manifest.tooling} — ` +
      `move the pin and the workflow together, or call the release the manifest names`,
  );

// R13: one container, and the manifest names where the vendored units sit beside it.
const units = manifest.units ?? "meta";
const core = `${units}/core`;
for (const rel of [MODEL, core])
  if (!existsSync(join(root, rel))) die(`${root} has no ${rel}/`);

const files = new Map();
const walk = (rel) => {
  for (const entry of readdirSync(join(root, rel))) {
    const child = `${rel}/${entry}`;
    if (statSync(join(root, child)).isDirectory()) walk(child);
    else files.set(child, readFileSync(join(root, child), "utf8"));
  }
};
walk(MODEL);
walk(core);

const { failures, skipped } = checkInstance(files, { core, model: MODEL });
const against = `${MODEL}/ against ${core}/ at core ${manifest.core?.version ?? "an unnamed version"}`;

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem${failures.length > 1 ? "s" : ""} in ${against}\n`);
  for (const f of failures) console.error(`  ${f}`);
} else {
  console.log(`✓ ${against}: the mechanical checks pass`);
}

// Always, and on both paths: a report says what it did not check.
if (skipped.length)
  console.log(`  not checked: ${skipped.join(", ")} — the vendored core carries no schema for ${skipped.length === 1 ? "it" : "them"}`);
console.log("  not checked: every `## Writing rules` in every schema — that is the agent pass, R0");

process.exit(failures.length ? 1 : 0);
