// What a command would do, worked out before anything is written: a map of paths to the text
// they get. Pure, so every decision — what a new instance holds, what a conflict is, what the
// manifest says — is tested without a filesystem, and the writer that carries it out is thin
// enough to read in one sitting.
import {
  agentFilesFor, hashOf, manifestOf, readmesFor, rootFolders, startingEntities, workflowFor,
} from "./instance-files.mjs";

// The agents this release can write files for. It is asked rather than assumed, and one that is
// not here is refused by name, so a reader learns what exists rather than what is missing.
export const AGENTS = ["claude"];

export function initPlan({ core, tooling, tag, name, agent, units = "meta", present = new Set(), fetched = false }) {
  const called = (name ?? "").trim();
  if (!AGENTS.includes(agent))
    return { refused: `${agent} is not an agent this release writes for; it writes for ${AGENTS.join(", ")}.` };
  if (!called) return { refused: "The instance needs a name: it is the H1 of its identity." };

  const writes = new Map();
  for (const [path, text] of core) writes.set(`${units}/core/${path}`, text);
  const files = {};
  for (const [path, text] of writes) files[path] = hashOf(text);

  const vendored = JSON.parse(core.get("manifest.json"));
  writes.set(
    ".companygraph/manifest.json",
    manifestOf({
      tooling,
      core: { version: vendored.version, shape: vendored.shape, source: fetched ? `fetched:${tag}` : "bundled" },
      units,
      files,
    }),
  );
  for (const [path, text] of readmesFor(rootFolders())) writes.set(path, text);
  for (const [path, text] of startingEntities({ name: called })) writes.set(path, text);
  writes.set(".github/workflows/companygraph.yml", workflowFor(tag));
  for (const [path, text] of agentFilesFor({ agent, name: called, units })) writes.set(path, text);

  // Every conflict, before anything is written: a refusal leaves nothing behind, and a file the
  // plan does not write is not a conflict, which is what lets `--here` add to a repository.
  const taken = [...writes.keys()].filter((path) => present.has(path)).sort();
  if (taken.length)
    return { refused: `These are there already, so nothing was written:\n${taken.map((p) => `  ${p}`).join("\n")}` };
  return { writes };
}

// A plain relative folder or file path: no leading slash, no empty or "." or ".." segment. Both
// `manifest.units` and every key of `manifest.files` are checked against this, because a
// manifest is a file inside the instance and can say anything — a correct hash next to a path
// like "../victim.txt" or "model/identity.md" is still not this tooling's to delete or overwrite,
// and "../escaped" as `units` would carry every write outside the instance root.
const plainRelative = (path) =>
  typeof path === "string" && path !== "" && !path.startsWith("/") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

// Moving an instance's vendored core. The tooling owns exactly three places — the vendored files
// under `<units>/core/`, the manifest, and the workflow's tag — and nothing a manifest names
// outside those is trusted. A file whose hash no longer matches was edited inside the instance,
// and core is not the instance's to edit: the whole upgrade is refused rather than leaving it
// half old and half new, and `--force` overwrites and says which. A manifest naming files outside
// its own core, or a `units` that escapes the instance, gets the same whole-upgrade refusal and
// for the same reason — a manifest that has already shown it cannot be trusted is not something
// to carry on from by quietly filtering out the entries that look wrong.
export function upgradePlan({ core, tooling, tag, manifest, held, workflow, fetched = false, force = false }) {
  const units = manifest.units ?? "meta";
  if (!plainRelative(units))
    return {
      refused: `.companygraph/manifest.json names units as ${JSON.stringify(manifest.units)}, which is not a plain relative folder; nothing was written.`,
    };

  const was = manifest.files ?? {};
  const prefix = `${units}/core/`;
  const rogue = Object.keys(was).filter((path) => !plainRelative(path) || !path.startsWith(prefix)).sort();
  if (rogue.length)
    return {
      refused:
        "These files in .companygraph/manifest.json are not under this upgrade's own core, so nothing was trusted:\n" +
        `${rogue.map((p) => `  ${p}`).join("\n")}\n` +
        `An upgrade only ever moves ${prefix}, .companygraph/manifest.json and the workflow's tag.`,
    };

  const edited = Object.keys(was)
    .filter((path) => {
      const text = held.get(path);
      return text === undefined || hashOf(text) !== was[path];
    })
    .sort();
  if (edited.length && !force)
    return {
      refused:
        "These vendored files are not as this tooling wrote them, so nothing was written:\n" +
        `${edited.map((p) => `  ${p}`).join("\n")}\n` +
        "Put them back, or pass --force to overwrite them.",
    };

  const writes = new Map();
  const files = {};
  for (const [path, text] of core) {
    const at = `${units}/core/${path}`;
    files[at] = hashOf(text);
    if (held.get(at) !== text) writes.set(at, text);
  }
  const removes = Object.keys(was).filter((path) => !files[path]).sort();
  const vendored = JSON.parse(core.get("manifest.json"));
  const manifestText = manifestOf({
    tooling,
    core: { version: vendored.version, shape: vendored.shape, source: fetched ? `fetched:${tag}` : "bundled" },
    units,
    files,
  });
  const from = manifest.core?.version ?? "unknown";
  const to = vendored.version;
  const moved = writes.size > 0 || removes.length > 0 || manifest.tooling !== tooling;
  if (moved) writes.set(".companygraph/manifest.json", manifestText);
  // The workflow's tag is the third place a release lands. An instance that has no such file
  // made its own arrangements, and this tooling does not give it one on an upgrade. The pattern
  // is anchored on the full reusable-workflow path, not just "instance-check.yml@", because that
  // shorter anchor also matches a differently named workflow such as "model-instance-check.yml@";
  // the tag is read as everything up to the next quote or space rather than `\S+`, which would
  // reach straight through a closing quote and leave invalid YAML behind; and the match is global,
  // because a workflow that pins the same reusable job twice must have both moved, not just the
  // first, or CI fails the pin guard on the second job with no upgrade left to run.
  const PIN = /companygraph\/meta-model\/\.github\/workflows\/instance-check\.yml@[^\s"']+/g;
  if (moved && workflow) {
    const next = workflow.replace(PIN, `companygraph/meta-model/.github/workflows/instance-check.yml@${tag}`);
    if (next !== workflow) writes.set(".github/workflows/companygraph.yml", next);
  }
  return { writes, removes, edited, from, to };
}
