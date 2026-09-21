#!/usr/bin/env node
// The mechanical half of R0, run over one instance:
//
//   node bin/check-instance.mjs [path to the instance, default .]
//
// It is not the whole of R0 and says so on every run. `companygraph-validate` judges every
// entity against its schema's `## Writing rules`, and nothing mechanical reaches those — a
// machine can check that an Evidence row's reference resolves, not that its `What it shows`
// cell states a fact rather than restating the level. A green run here covers the rules named
// below and no others.
//
// Where the rules come from is the point. The schemas are read from the instance's own vendored
// core, never from this package's `core/`, so taking a newer release of this checker never
// re-validates an instance against rules it has not adopted. The two pins that decide that are
// held against each other before anything is read: an instance names the release of this
// checker it calls in `.companygraph/manifest.json`, and a checker that is not that release
// refuses rather than reporting on rules nobody chose. It refuses a vendored core newer than
// itself for the same reason: a release that adds a type adds a folder an older checker has
// never heard of.
//
// It also holds the vendored core to the per-file hashes the manifest records, because core is
// not the instance's to edit and this is the one command every commit runs.
//
// The checking itself lives in `checkPath(root)`, which returns the number of failures and
// throws rather than exiting, so `bin/companygraph.mjs` can stand a `check` command on the same
// code without every invocation of that CLI running these checks against the current directory
// and quitting the process underneath it. Running this file directly is unchanged: the guarded
// block at the foot calls `checkPath`, prints exactly what it always printed for a guard
// failure, and exits with the same codes — because the reusable workflow and every instance's
// CI call it by this path.
import { readdirSync, statSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstance, isNewer, MODEL } from "../lib/checks.mjs";
import { hashOf } from "../lib/instance-files.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8")).version;

export function checkPath(path) {
  const root = resolve(path);
  const die = (message) => {
    throw new Error(message);
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

  // The other half of the same pin, and the first release where it can bite. `tooling` names the
  // checker an instance asked for; the core it vendored is a separate number that moves
  // separately. Until a release added a type, a checker older than the core read the same folders
  // either way. Now it meets one it has never heard of and says "not a folder of any type", which
  // reads as a broken model rather than as a workflow pin nobody moved. Core behind the checker
  // stays legal — a checker knowing more of the vocabulary than an instance uses holds it to the
  // part it uses — so only newer is refused.
  const vendored = manifest.core?.version;
  if (vendored && /^\d+\.\d+\.\d+$/.test(vendored) && isNewer(vendored, VERSION))
    die(
      `this checker is ${VERSION} and .companygraph/manifest.json vendors core ${vendored} — ` +
        `a checker cannot hold an instance to a core newer than itself; move the manifest's tooling and the workflow pin to v${vendored} together`,
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

  // The manifest's per-file hashes, read on the one command every commit runs. Core is not the
  // instance's to edit, and an edit found only by the next `upgrade` is refused there, on whoever
  // upgrades rather than on whoever made it; found here, it is named on the commit that made it.
  // A manifest with no `files` recorded none, and there is nothing to hold it to.
  for (const [path, recorded] of Object.entries(manifest.files ?? {})) {
    const text = files.get(path);
    if (text === undefined)
      failures.push(`${path}: named in .companygraph/manifest.json and not in the instance's vendored core`);
    else if (hashOf(text) !== recorded)
      failures.push(`${path}: not as the release vendored it, and core is not the instance's to edit — \`companygraph upgrade --force\` puts it back`);
  }
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

  return failures.length;
}

// The direct-run entry, behaving exactly as this file always has: a guard failure prints its
// message with the same "✗ " prefix and exits 1, and a checked run exits on the failure count.
// The guard excludes an import — `bin/companygraph.mjs` takes `checkPath` without ever reaching
// this block — by comparing the resolved path actually run to this module's own. Resolving
// argv[1] can itself fail (a test harness's argv[1] need not be a real file on disk), and that
// failure means "not run directly," not a crash — importing this module must never throw for a
// reason that has nothing to do with the check it runs.
function ranDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (ranDirectly()) {
  try {
    process.exit(checkPath(process.argv[2] ?? ".") ? 1 : 0);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
