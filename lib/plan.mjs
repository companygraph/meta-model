// What a command would do, worked out before anything is written: a map of paths to the text
// they get. Pure, so every decision — what a new instance holds, what a conflict is, what the
// manifest says — is tested without a filesystem, and the writer that carries it out is thin
// enough to read in one sitting.
import {
  adoptedManifestOf, agentFilesFor, excludeFor, exportFilesFor, GITATTRIBUTES, GITIGNORE, hashOf, HOOK, IDENTIFIER_PAGE, INSTANCE_PINS, localizationPageFor, manifestOf, readmesFor, repositoryWorkflowFor, rootFolders, startingEntities, workflowFor,
} from "./instance-files.mjs";
import { isNewer, typeOfPath, TYPES, vocabularyOf } from "./checks.mjs";
import { uuidv7, idOf, withId, idFormatOf } from "./ids.mjs";
import { migratedLocalization } from "./localization.mjs";
/** @import { Files } from "./instance.mjs" */

/**
 * What `init` is asked for: the core and skills to vendor, as path → text; this tooling's release
 * and the tag the core came from; the instance's name, its agent and its units folder; the root
 * folders to write, all where none are named; what `--here` finds already there; and whether the
 * core was fetched and the commit-msg hook is written.
 * @typedef {object} InitAsk
 * @property {Files} core
 * @property {Files | undefined} [skills]
 * @property {Map<string, Files> | undefined} [packs]
 * @property {string} tooling
 * @property {string} tag
 * @property {string | undefined} [name]
 * @property {string} agent
 * @property {string | undefined} [units]
 * @property {string[] | undefined} [folders]
 * @property {Set<string> | undefined} [present]
 * @property {boolean | undefined} [fetched]
 * @property {boolean | undefined} [hook]
 */
/**
 * A plan, or a refusal saying why nothing may be written. `writes` maps path → text.
 * @typedef {{ refused: string; writes?: undefined } | { refused?: undefined; writes: Map<string, string> }} InitPlan
 */
/**
 * What `upgrade` is asked for: as `init`, and the manifest the instance holds, the files it holds
 * at every path the manifest or this release names, and its workflow's text, null where it has none.
 * @typedef {object} UpgradeAsk
 * @property {Files} core
 * @property {Files | undefined} [skills]
 * @property {Map<string, Files> | undefined} [packs]
 * @property {string} tooling
 * @property {string} tag
 * @property {{ files?: Record<string, string>; units?: string; core?: { version?: string }; tooling?: string; packs?: string[]; exclude?: string[] }} manifest
 * @property {Map<string, string | undefined>} held
 * @property {string | null} workflow
 * @property {boolean | undefined} [fetched]
 * @property {boolean | undefined} [force]
 * @property {string | undefined} [name]
 * @property {Set<string> | undefined} [present]
 */
/**
 * What an upgrade writes and removes, what it overwrote or rewrote under `--force`, the export
 * inputs it gave, and the core versions it moves between; or a refusal, which carries nothing else.
 * @typedef {object} UpgradeWrites
 * @property {undefined} [refused]
 * @property {Map<string, string>} writes
 * @property {string[]} removes
 * @property {string[]} edited
 * @property {string[]} missing
 * @property {string[]} given
 * @property {string[]} rewritten
 * @property {string} from
 * @property {string} to
 */
/** @typedef {{ refused: string } | UpgradeWrites} UpgradePlan */
/**
 * What a backfill is asked for: the moment a path was first committed, null where it never was;
 * the moment to stamp a page with none; and the random bytes of each new id, where a test fixes them.
 * @typedef {object} BackfillAsk
 * @property {(path: string) => number | null} firstCommitMs
 * @property {number} [now]
 * @property {() => ArrayLike<number>} [random]
 */

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
/**
 * @param {Files} core
 * @param {string} tooling
 * @param {string} tag
 */
function newerCore(core, tooling, tag) {
  const { version } = JSON.parse(/** @type {string} */ (core.get("manifest.json")));
  if (!isNewer(version, tooling)) return null;
  return (
    `${tag} carries core ${version}, which is newer than this tooling, ${tooling}, and no checker can hold an ` +
    `instance to a core newer than itself; nothing was written. Run the command from ${tag} itself, whose ` +
    "own core is that one."
  );
}

// The folders `init` writes: every root folder unless `--folders` names some. `sources` is always
// among them, because the instance's starting source is written there whatever is asked for.
/**
 * @param {string[] | undefined} folders
 * @param {import("./checks.mjs").TypeEntry[]} types
 * @param {boolean} packed whether the instance takes a pack, so the refusal says the folders are not core's alone
 */
function chosenFolders(folders, types, packed) {
  const all = rootFolders(types);
  if (folders === undefined) return { folders: all };
  const unknown = folders.filter((f) => !all.includes(f));
  if (unknown.length)
    return { refused: `${unknown.join(", ")} ${unknown.length === 1 ? "is no folder" : "are no folders"} of ${packed ? "the vocabulary taken" : "core"}; the folders are ${all.join(", ")}.` };
  return { folders: all.filter((f) => f === "sources" || folders.includes(f)) };
}

// Where the chosen agent's skills are written. They are the tooling's, as the vendored core is:
// hashed into the manifest, moved by an upgrade, and refused when edited in place. An instance's
// own skills sit beside them under any other name and are never touched.
export const SKILLS = ".claude/skills/";

/**
 * @param {InitAsk} ask
 * @returns {InitPlan}
 */
export function initPlan({ core, skills = new Map(), packs = new Map(), tooling, tag, name, agent, units = "meta", folders, present = new Set(), fetched = false, hook = true }) {
  const called = (name ?? "").trim();
  if (!AGENTS.includes(agent))
    return { refused: `${agent} is not an agent this release writes for; it writes for ${AGENTS.join(", ")}.` };
  if (!called) return { refused: "The instance needs a name: it is the H1 of its identity." };
  const newer = newerCore(core, tooling, tag);
  if (newer) return { refused: newer };
  const types = vocabularyOf({ packs: [...packs.keys()].map((name) => ({ name, dir: `${units}/${name}` })) }).types;
  const chosen = chosenFolders(folders, types, packs.size > 0);
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

  /** @type {Map<string, string>} */
  const writes = new Map();
  for (const [path, text] of core) writes.set(`${units}/core/${path}`, text);
  // A pack is a unit beside core (R20): vendored the same way, hashed the same way, and moved by
  // the same upgrade.
  for (const [name, packFiles] of packs) for (const [path, text] of packFiles) writes.set(`${units}/${name}/${path}`, text);
  for (const [path, text] of skills) writes.set(`${SKILLS}${path}`, text);
  /** @type {Record<string, string>} */
  const files = {};
  for (const [path, text] of writes) files[path] = hashOf(text);

  const vendored = JSON.parse(/** @type {string} */ (core.get("manifest.json")));
  writes.set(
    ".companygraph/manifest.json",
    manifestOf({
      tooling,
      core: { version: vendored.version, shape: vendored.shape, source: fetched ? `fetched:${tag}` : "bundled" },
      units,
      packs: [...packs.keys()],
      exclude: excludeFor(units),
      files,
    }),
  );
  for (const [path, text] of readmesFor(/** @type {string[]} */ (chosen.folders), units, types)) writes.set(path, text);
  for (const [path, text] of startingEntities({ name: called, localizationSchema: core.get("localization-schema.md") })) writes.set(path, text);
  // The workflow's pin names the release of this checker the instance's CI must agree with — the
  // same version `tooling` records, which `check-instance.mjs`'s first guard compares itself
  // against — never the tag whose core happened to be fetched. Core is allowed to lag behind the
  // checker by design (that guard refuses only a core newer than itself), so pinning the workflow
  // to the fetched tag instead made an instance's own CI red on its first commit whenever
  // `--core` named a release older than this package's own version. `tag` still feeds `source`,
  // below, because which core is vendored is a separate fact from which checker runs it.
  writes.set(".github/workflows/companygraph.yml", workflowFor(`v${tooling}`));
  // The hook is the instance's own once written, like the agent's files: not in `files`, so no
  // upgrade holds it to a hash or replaces it. It reads its release from the manifest instead.
  if (hook) writes.set(".companygraph/hooks/commit-msg", HOOK);
  for (const [path, text] of agentFilesFor({ agent, name: called, units })) writes.set(path, text);
  // The export's inputs are the instance's own, as the agent's files are, so one `--here` finds
  // already there is the repository's and is left alone rather than counted a conflict.
  for (const [path, text] of exportFilesFor({ name: called })) if (!present.has(path)) writes.set(path, text);
  // A repository that `--here` adds to may already say how its line ends are kept, and that is its
  // own decision, so a `.gitattributes` already there is left alone rather than counted a conflict.
  if (!present.has(".gitattributes")) writes.set(".gitattributes", GITATTRIBUTES);
  // Likewise what it ignores: a `.gitignore` already there is the repository's own. Without one,
  // nothing keeps `dist/` out, and the company skill writes a ledger there that names people.
  if (!present.has(".gitignore")) writes.set(".gitignore", GITIGNORE);
  // A repository's pins are its own, so a `pins.json` already there is left alone, as `.gitignore` is.
  if (!present.has("pins.json")) writes.set("pins.json", INSTANCE_PINS);

  // Every conflict, before anything is written: a refusal leaves nothing behind, and a file the
  // plan does not write is not a conflict, which is what lets `--here` add to a repository.
  const taken = [...writes.keys()].filter((path) => present.has(path)).sort();
  if (taken.length)
    return { refused: `These are there already, so nothing was written:\n${taken.map((p) => `  ${p}`).join("\n")}` };
  return { writes };
}

// A plain relative folder or file path: no leading slash, no backslash, no empty or "." or ".."
// segment. Both `manifest.units` and every key of `manifest.files` are checked against this,
// because a manifest is a file inside the instance and can say anything — a correct hash next to
// a path like "../victim.txt" or "model/identity.md" is still not this tooling's to delete or
// overwrite, and "../escaped" as `units` would carry every write outside the instance root. A
// backslash is refused whole rather than read as a separator: on Windows `meta/core/..\..\x.md`
// has no `..` segment when split on `/` and still resolves two folders up, and on any other
// platform it is a file name no manifest of this tooling ever wrote.
/** @param {unknown} path */
const plainRelative = (path) =>
  typeof path === "string" && path !== "" && !path.startsWith("/") && !path.includes("\\") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

// Moving an instance's vendored core. The tooling owns exactly three places — the vendored files
// under `<units>/core/`, the manifest, and the workflow's tag — and nothing a manifest names
// outside those is trusted. A file whose hash no longer matches was edited inside the instance,
// and core is not the instance's to edit: the whole upgrade is refused rather than leaving it
// half old and half new, and `--force` overwrites and says which. A manifest naming files outside
// its own core, or a `units` that escapes the instance, gets the same whole-upgrade refusal and
// for the same reason — a manifest that has already shown it cannot be trusted is not something
// to carry on from by quietly filtering out the entries that look wrong.
//
// Beside those three, an upgrade gives the instance the export's inputs it does not hold: `name`
// is its identity's, and `present` the paths it holds already. Each is written only where it is
// absent and recorded nowhere, so one the instance has is never read, compared or replaced; no
// `name`, and none is written.
/**
 * @param {UpgradeAsk} ask
 * @returns {UpgradePlan}
 */
export function upgradePlan({ core, skills = new Map(), packs = new Map(), tooling, tag, manifest, held, workflow, fetched = false, force = false, name, present = new Set() }) {
  const newer = newerCore(core, tooling, tag);
  if (newer) return { refused: newer };
  const units = manifest.units ?? "meta";
  if (!plainRelative(units))
    return {
      refused: `.companygraph/manifest.json names units as ${JSON.stringify(manifest.units)}, which is not a plain relative folder; nothing was written.`,
    };

  const was = manifest.files ?? {};
  const prefix = `${units}/core/`;
  const packPrefixes = [...packs.keys()].map((name) => `${units}/${name}/`);
  // Skills are the tooling's in an instance whose manifest records them, and move with every
  // upgrade. One that records none is given them when it holds none of the files they would be:
  // an instance `init` made before the skills existed. One that holds any of those files already
  // wrote its own under the tooling's names, and they are left as they are, skills and all,
  // rather than refused or replaced — the reference instance is that case.
  const recorded = Object.keys(was).some((path) => path.startsWith(SKILLS));
  const takes = !recorded && ![...skills.keys()].some((path) => held.has(`${SKILLS}${path}`));
  const hasSkills = recorded || takes;
  /** @param {string} path */
  const owned = (path) => path.startsWith(prefix) || packPrefixes.some((p) => path.startsWith(p)) || (hasSkills && path.startsWith(SKILLS));
  const rogue = Object.keys(was).filter((path) => !plainRelative(path) || !owned(path)).sort();
  if (rogue.length)
    return {
      refused:
        "These files in .companygraph/manifest.json are not under this upgrade's own core, so nothing was trusted:\n" +
        `${rogue.map((p) => `  ${p}`).join("\n")}\n` +
        `An upgrade only ever moves ${[prefix, ...packPrefixes].join(", ")}, the skills it installed, .companygraph/manifest.json and the workflow's tag.`,
    };

  // A file whose hash differs was edited in place; a file the manifest lists but the instance no
  // longer holds was removed. Both stop a plain upgrade for the same reason — core is not the
  // instance's to touch — but they are not the same fact: `--force` overwrites the first and
  // writes the second fresh, and a report that calls the second "overwritten" would be describing
  // a file that was never there to overwrite. Kept apart here so each is named accurately below.
  const missing = Object.keys(was).filter((path) => held.get(path) === undefined).sort();
  const edited = Object.keys(was)
    .filter((path) => held.get(path) !== undefined && hashOf(/** @type {string} */ (held.get(path))) !== was[path])
    .sort();
  if ((edited.length || missing.length) && !force)
    return {
      refused:
        "These vendored files are not as this tooling last wrote them, so nothing was written:\n" +
        `${[...edited, ...missing].sort().map((p) => `  ${p}`).join("\n")}\n` +
        "Put them back, or pass --force to overwrite or rewrite them.",
    };

  // Everything this release owns in the instance, at the path it lands on.
  /** @type {Map<string, string>} */
  const release = new Map();
  for (const [path, text] of core) release.set(`${prefix}${path}`, text);
  for (const [name, packFiles] of packs) for (const [path, text] of packFiles) release.set(`${units}/${name}/${path}`, text);
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

  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {Record<string, string>} */
  const files = {};
  for (const [at, text] of release) {
    files[at] = hashOf(text);
    if (held.get(at) !== text) writes.set(at, text);
  }
  const removes = Object.keys(was).filter((path) => !files[path]).sort();
  const vendored = JSON.parse(/** @type {string} */ (core.get("manifest.json")));
  const manifestText = manifestOf({
    tooling,
    core: { version: vendored.version, shape: vendored.shape, source: fetched ? `fetched:${tag}` : "bundled" },
    units,
    packs: [...packs.keys()],
    exclude: manifest.exclude ?? excludeFor(units),
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
  /** @type {string[]} */
  const given = [];
  if (name) for (const [path, text] of exportFilesFor({ name })) if (!present.has(path)) {
    writes.set(path, text);
    given.push(path);
  }
  // pins.json is the instance's own once it exists, so it is written only where there is none:
  // an instance made before this release, outside the family. A family instance holds its own,
  // with the conventions pin and the commands the family's resync runs, and it is never read here:
  // whether one is there, which `present` says, is all this asks.
  if (!present.has("pins.json")) {
    writes.set("pins.json", INSTANCE_PINS);
    given.push("pins.json");
  }
  // The localization page, `model/localization.md`, is not vendored and carries no hash: it is the
  // instance's own from the moment it exists, exactly as the export inputs above are. A core
  // that has grown `localization-schema.md` since the instance last upgraded left it with no
  // such page and nothing to write one until now; an instance that already has one — written by
  // `init`, or by hand — is never replaced. `source` is read from `model/identity.md` the same
  // way `backfillPlan` reads it, because this page is the same kind of write: a fresh id, once.
  if (core.has("localization-schema.md") && held.get("model/localization.md") === undefined) {
    const identityText = held.get("model/identity.md") ?? "";
    const source = identityText.match(/^source:[ \t]*(\S.*?)[ \t]*$/m)?.[1] ?? "Local";
    writes.set("model/localization.md", localizationPageFor(core.get("localization-schema.md"), { id: uuidv7(), source }));
    given.push("model/localization.md");
  }
  // A pack the instance did not list until now brings root folders of its own, and a folder with
  // no README does not exist to the checks. They are written once, as `init` writes them, and are
  // the instance's own from then on; a pack it already took has them, or its owner removed them.
  const listed = manifest.packs ?? [];
  const added = [...packs.keys()].filter((name) => !listed.includes(name));
  if (added.length) {
    const types = vocabularyOf({ packs: [...packs.keys()].map((name) => ({ name, dir: `${units}/${name}` })) }).types;
    const folders = rootFolders(types.filter((t) => added.includes(t.unit)));
    for (const [path, text] of readmesFor(folders, units, types)) {
      if (path === "model/README.md" || present.has(path) || held.get(path) !== undefined) continue;
      writes.set(path, text);
      given.push(path);
    }
  }
  // One language per model: a core whose localization schema declares `locale` rewrites a page
  // still in the earlier form, a `## Locales` table, into the field, keeping its id, its H1, its
  // statement and every other section. A page that already names its locale is left as it is,
  // and one that declares a translated language refuses the whole upgrade rather than drop it.
  const rewritten = /** @type {string[]} */ ([]);
  const own = held.get("model/localization.md");
  if (own !== undefined && /^\| `locale` \|/m.test(core.get("localization-schema.md") ?? "")) {
    const migrated = migratedLocalization(own);
    if (migrated?.error !== undefined) return { refused: `model/localization.md ${migrated.error}; nothing was written.` };
    if (migrated) {
      writes.set("model/localization.md", migrated.text);
      rewritten.push("model/localization.md");
    }
  }
  return { writes, removes, edited: [...edited, ...foreign].sort(), missing, given, rewritten, from, to };
}

// A repository that is not an instance takes the machinery and no model: a manifest naming the
// release and what the form leaves out, the workflow that runs the form, the seat hook, and the
// pins.json an instance gets, declaring its tooling pin, where it has none. One that holds a
// manifest already is an instance, or took the machinery before, and either way `upgrade` is what
// moves it.
/**
 * @param {{ tooling: string; present: Set<string> }} ask
 * @returns {InitPlan}
 */
export function adoptPlan({ tooling, present }) {
  if (present.has(".companygraph/manifest.json"))
    return { refused: `.companygraph/manifest.json is already there, so this is an instance or took the tooling before; "companygraph upgrade" moves it, and nothing was written.` };
  /** @type {Map<string, string>} */
  const writes = new Map([
    [".companygraph/manifest.json", adoptedManifestOf({ tooling, exclude: ["dist"] })],
    [".github/workflows/companygraph.yml", repositoryWorkflowFor(`v${tooling}`)],
    [".companygraph/hooks/commit-msg", HOOK],
  ]);
  if (!present.has("pins.json")) writes.set("pins.json", INSTANCE_PINS);
  const taken = [...writes.keys()].filter((path) => present.has(path)).sort();
  if (taken.length)
    return { refused: `These are there already, so nothing was written:\n${taken.map((p) => `  ${p}`).join("\n")}` };
  return { writes };
}

// Moving a repository that took the machinery: the manifest's `tooling`, its own `exclude` kept,
// and the workflow's ref, matched on the full reusable-workflow path as an instance's is. pins.json
// is written where it has none. No core is vendored into it.
/**
 * @param {{ tooling: string; manifest: { tooling?: string; exclude?: string[] }; workflow: string | null; present: Set<string> }} ask
 * @returns {{ writes: Map<string, string>; given: string[]; from: string; to: string }}
 */
export function adoptedUpgradePlan({ tooling, manifest, workflow, present }) {
  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {string[]} */
  const given = [];
  if (manifest.tooling !== tooling) {
    writes.set(".companygraph/manifest.json", adoptedManifestOf({ tooling, exclude: manifest.exclude ?? ["dist"] }));
    const PIN = /companygraph\/meta-model\/\.github\/workflows\/repository-check\.yml@[^\s"']+/g;
    const next = workflow?.replace(PIN, `companygraph/meta-model/.github/workflows/repository-check.yml@v${tooling}`);
    if (workflow && next !== workflow) writes.set(".github/workflows/companygraph.yml", /** @type {string} */ (next));
  }
  if (!present.has("pins.json")) {
    writes.set("pins.json", INSTANCE_PINS);
    given.push("pins.json");
  }
  return { writes, given, from: manifest.tooling ?? "unknown", to: tooling };
}

// R18 for an instance written before it: every entity page without an id gets one stamped with
// the moment its file was first committed, so the ids sort as the entities came into the model.
// A README and a file no type claims are not entities and are left alone; a page that has an id
// keeps it. Run twice, it writes nothing the second time.
//
// An identifier.md already declaring `format: pattern` means the instance makes its own ids and
// the tooling only checks them (the spec's words); stamping UUIDv7 over that would leave the
// instance with two id formats at once, so the whole backfill is refused rather than half of it
// run. A declaration the tooling cannot read is refused the same way, naming `idFormatOf`'s own
// error, since a backfill that guessed past it could stamp ids no later check would accept.
/**
 * @param {Map<string, string | Uint8Array>} files
 * @param {BackfillAsk & { model?: string; types?: import("./checks.mjs").TypeEntry[] }} ask
 * @returns {Map<string, string> | { refused: string }}
 */
export function backfillPlan(files, { model = "model", firstCommitMs, now = Date.now(), random, types = TYPES }) {
  const identifier = `${model}/identifier.md`;
  const identifierText = /** @type {string | undefined} */ (files.get(identifier));
  if (identifierText !== undefined) {
    const declared = idFormatOf(identifierText);
    if (declared.format === "pattern")
      return { refused: `${identifier} declares a pattern; the tooling makes only UUID version 7 (R18)` };
    if (declared.error) return { refused: `${identifier}: ${declared.error} (R18)` };
  }
  /** @param {number} ms */
  const make = (ms) => (random ? uuidv7(ms, random()) : uuidv7(ms));
  /** @type {Map<string, string>} */
  const writes = new Map();
  for (const [path, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (typeof text !== "string" || !path.endsWith(".md") || !typeOfPath(path, model, types)) continue;
    if (idOf(text) !== null) continue;
    writes.set(path, withId(text, make(firstCommitMs(path) ?? now)));
  }
  if (!files.has(identifier)) {
    const identity = /** @type {string | undefined} */ (files.get(`${model}/identity.md`)) ?? "";
    const source = identity.match(/^source:[ \t]*(\S.*?)[ \t]*$/m)?.[1] ?? "Local";
    writes.set(identifier, IDENTIFIER_PAGE({ id: make(now), source }));
  }
  return writes;
}

// R18 for core: every schema without an id gets one stamped with its file's first commit, in
// the frontmatter R9 gives it. Run once in the repository that makes core; a schema made later
// takes a fresh id from `companygraph id`. A schema that has one keeps it.
/**
 * @param {Map<string, string | Uint8Array>} files
 * @param {BackfillAsk & { core?: string }} ask
 * @returns {Map<string, string>}
 */
export function schemaBackfillPlan(files, { core = "core", firstCommitMs, now = Date.now(), random }) {
  /** @param {number} ms */
  const make = (ms) => (random ? uuidv7(ms, random()) : uuidv7(ms));
  /** @type {Map<string, string>} */
  const writes = new Map();
  for (const [path, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (typeof text !== "string" || !path.startsWith(`${core}/`) || !path.endsWith("-schema.md")) continue;
    if (idOf(text) !== null) continue;
    writes.set(path, withId(text, make(firstCommitMs(path) ?? now)));
  }
  return writes;
}
