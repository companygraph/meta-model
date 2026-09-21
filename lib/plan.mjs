// What a command would do, worked out before anything is written: a map of paths to the text
// they get. Pure, so every decision — what a new instance holds, what a conflict is, what the
// manifest says — is tested without a filesystem, and the writer that carries it out is thin
// enough to read in one sitting.
import {
  agentFilesFor, hashOf, manifestOf, readmesFor, rootFolders, startingEntities, workflowFor,
} from "./instance-files.mjs";
import { isNewer } from "./checks.mjs";

// The agents this release can write files for. A prompt whose only possible answer is already
// known is not worth forcing, so `init` does not ask when this list holds one entry — it states
// the agent it wrote for in its own output instead, so a reader learns Claude is what this
// release writes for rather than being left to infer it. An agent that is not here is refused by
// name, so a reader also learns what exists rather than what is missing.
export const AGENTS = ["claude"];

// A core newer than this tooling makes an instance no released checker runs: `tooling` can only
// name this release, this release's checker refuses a core newer than itself, and the release
// that could run the core refuses a manifest naming another. The tool has no third value to
// write, so both commands refuse before anything is written, and name the release to run instead.
function newerCore(core, tooling, tag) {
  const { version } = JSON.parse(core.get("manifest.json"));
  if (!isNewer(version, tooling)) return null;
  return (
    `${tag} carries core ${version}, which is newer than this tooling, ${tooling}, and no checker can hold an ` +
    `instance to a core newer than itself; nothing was written. Run the command from ${tag} itself, whose ` +
    "own core is that one."
  );
}

// The folders `init` writes: every root folder unless `--folders` names some. `sources` is always
// among them, because the instance's starting source is written there whatever is asked for.
function chosenFolders(folders) {
  const all = rootFolders();
  if (folders === undefined) return { folders: all };
  const unknown = folders.filter((f) => !all.includes(f));
  if (unknown.length)
    return { refused: `${unknown.join(", ")} ${unknown.length === 1 ? "is no folder" : "are no folders"} of core; the folders are ${all.join(", ")}.` };
  return { folders: all.filter((f) => f === "sources" || folders.includes(f)) };
}

// Where the chosen agent's skills are written. They are the tooling's, as the vendored core is:
// hashed into the manifest, moved by an upgrade, and refused when edited in place. An instance's
// own skills sit beside them under any other name and are never touched.
export const SKILLS = ".claude/skills/";

export function initPlan({ core, skills = new Map(), tooling, tag, name, agent, units = "meta", folders, present = new Set(), fetched = false }) {
  const called = (name ?? "").trim();
  if (!AGENTS.includes(agent))
    return { refused: `${agent} is not an agent this release writes for; it writes for ${AGENTS.join(", ")}.` };
  if (!called) return { refused: "The instance needs a name: it is the H1 of its identity." };
  const newer = newerCore(core, tooling, tag);
  if (newer) return { refused: newer };
  const chosen = chosenFolders(folders);
  if (chosen.refused) return chosen;

  // --here refuses when the units folder or .companygraph/ is already there, named as itself,
  // even when the plan below would not literally clash with one of their files: a repository
  // holding an unrelated `meta/notes.txt` is a folder already claimed, not something to merge
  // into one file at a time. This runs before the per-file check below, which still catches
  // everything else.
  for (const claimed of [units, ".companygraph"]) {
    if (present.has(claimed) || [...present].some((p) => p.startsWith(`${claimed}/`)))
      return { refused: `${claimed}/ is already there; --here refuses rather than merging into it.` };
  }

  const writes = new Map();
  for (const [path, text] of core) writes.set(`${units}/core/${path}`, text);
  for (const [path, text] of skills) writes.set(`${SKILLS}${path}`, text);
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
  for (const [path, text] of readmesFor(chosen.folders, units)) writes.set(path, text);
  for (const [path, text] of startingEntities({ name: called })) writes.set(path, text);
  // The workflow's pin names the release of this checker the instance's CI must agree with — the
  // same version `tooling` records, which `check-instance.mjs`'s first guard compares itself
  // against — never the tag whose core happened to be fetched. Core is allowed to lag behind the
  // checker by design (that guard refuses only a core newer than itself), so pinning the workflow
  // to the fetched tag instead made an instance's own CI red on its first commit whenever
  // `--core` named a release older than this package's own version. `tag` still feeds `source`,
  // below, because which core is vendored is a separate fact from which checker runs it.
  writes.set(".github/workflows/companygraph.yml", workflowFor(`v${tooling}`));
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
export function upgradePlan({ core, skills = new Map(), tooling, tag, manifest, held, workflow, fetched = false, force = false }) {
  const newer = newerCore(core, tooling, tag);
  if (newer) return { refused: newer };
  const units = manifest.units ?? "meta";
  if (!plainRelative(units))
    return {
      refused: `.companygraph/manifest.json names units as ${JSON.stringify(manifest.units)}, which is not a plain relative folder; nothing was written.`,
    };

  const was = manifest.files ?? {};
  const prefix = `${units}/core/`;
  // Skills are the tooling's in an instance whose manifest records them, and move with every
  // upgrade. One that records none is given them when it holds none of the files they would be:
  // an instance `init` made before the skills existed. One that holds any of those files already
  // wrote its own under the tooling's names, and they are left as they are, skills and all,
  // rather than refused or replaced — the reference instance is that case.
  const recorded = Object.keys(was).some((path) => path.startsWith(SKILLS));
  const takes = !recorded && ![...skills.keys()].some((path) => held.has(`${SKILLS}${path}`));
  const hasSkills = recorded || takes;
  const owned = (path) => path.startsWith(prefix) || (hasSkills && path.startsWith(SKILLS));
  const rogue = Object.keys(was).filter((path) => !plainRelative(path) || !owned(path)).sort();
  if (rogue.length)
    return {
      refused:
        "These files in .companygraph/manifest.json are not under this upgrade's own core, so nothing was trusted:\n" +
        `${rogue.map((p) => `  ${p}`).join("\n")}\n` +
        `An upgrade only ever moves ${prefix}, the skills it installed, .companygraph/manifest.json and the workflow's tag.`,
    };

  // A file whose hash differs was edited in place; a file the manifest lists but the instance no
  // longer holds was removed. Both stop a plain upgrade for the same reason — core is not the
  // instance's to touch — but they are not the same fact: `--force` overwrites the first and
  // writes the second fresh, and a report that calls the second "overwritten" would be describing
  // a file that was never there to overwrite. Kept apart here so each is named accurately below.
  const missing = Object.keys(was).filter((path) => held.get(path) === undefined).sort();
  const edited = Object.keys(was)
    .filter((path) => held.get(path) !== undefined && hashOf(held.get(path)) !== was[path])
    .sort();
  if ((edited.length || missing.length) && !force)
    return {
      refused:
        "These vendored files are not as this tooling last wrote them, so nothing was written:\n" +
        `${[...edited, ...missing].sort().map((p) => `  ${p}`).join("\n")}\n` +
        "Put them back, or pass --force to overwrite or rewrite them.",
    };

  // Everything this release owns in the instance, at the path it lands on.
  const release = new Map();
  for (const [path, text] of core) release.set(`${prefix}${path}`, text);
  if (hasSkills) for (const [path, text] of skills) release.set(`${SKILLS}${path}`, text);

  // A path this release would write that the instance already holds and the manifest never
  // recorded is the instance's own, not this tooling's to replace: a skill written by hand under
  // the same name is the case. It stops a plain upgrade as an edit does, and `--force` takes it.
  const foreign = [...release.keys()]
    .filter((path) => !(path in was) && held.get(path) !== undefined && held.get(path) !== release.get(path))
    .sort();
  if (foreign.length && !force)
    return {
      refused:
        "These are there already and this tooling did not write them, so nothing was written:\n" +
        `${foreign.map((p) => `  ${p}`).join("\n")}\n` +
        "Move them aside, or pass --force to replace them.",
    };

  const writes = new Map();
  const files = {};
  for (const [at, text] of release) {
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
  // The pin names the release of this checker the instance's CI must agree with — `tooling`,
  // exactly as `initPlan` derives it — never the tag whose core happened to be fetched; see the
  // note beside the same line there. `tag` only ever feeds `source`, above.
  const PIN = /companygraph\/meta-model\/\.github\/workflows\/instance-check\.yml@[^\s"']+/g;
  if (moved && workflow) {
    const next = workflow.replace(PIN, `companygraph/meta-model/.github/workflows/instance-check.yml@v${tooling}`);
    if (next !== workflow) writes.set(".github/workflows/companygraph.yml", next);
  }
  return { writes, removes, edited: [...edited, ...foreign].sort(), missing, from, to };
}
