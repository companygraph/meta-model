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

// Moving an instance's vendored core. The tooling owns what it wrote and nothing else: the
// vendored files, the manifest, and the workflow's tag. A file whose hash no longer matches was
// edited inside the instance, and core is not the instance's to edit: the whole upgrade is
// refused rather than leaving it half old and half new, and `--force` overwrites and says which.
export function upgradePlan({ core, tooling, tag, manifest, held, workflow, fetched = false, force = false }) {
  const units = manifest.units ?? "meta";
  const was = manifest.files ?? {};
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
  // made its own arrangements, and this tooling does not give it one on an upgrade.
  if (moved && workflow) {
    const next = workflow.replace(/instance-check\.yml@\S+/, `instance-check.yml@${tag}`);
    if (next !== workflow) writes.set(".github/workflows/companygraph.yml", next);
  }
  return { writes, removes, edited, from, to };
}
