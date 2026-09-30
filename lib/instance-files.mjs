// Every file an instance starts with that is not vendored core: its manifest, the README that
// makes a folder exist at all, the entities without which the checks refuse, the workflow
// that runs them, and the files the chosen agent reads. Pure: text in, text out, so what `init`
// would write is decided here and tested without a filesystem.
import { createHash } from "node:crypto";
import { TYPES } from "./checks.mjs";
import { uuidv7 } from "./ids.mjs";

// The hash the manifest carries per vendored file, and what `upgrade` compares against.
export const hashOf = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

// A text file as the tooling reads it: line ends as `\n`. Git for Windows checks files out with
// `\r\n` unless told otherwise, and the parser splits on `\n`, so every line kept a stray `\r`, a
// list value stopped matching its reference, and every vendored file failed its hash. Every read
// of an instance file from disk goes through this, before it is parsed or hashed.
export const unixLines = (text) => text.replace(/\r\n/g, "\n");

// What `init` writes so a Windows checkout keeps `\n` in the first place. The reads above do not
// depend on it; it is for everything else that opens the files, an agent's own scripts among them.
export const GITATTRIBUTES = "* text=auto eol=lf\n";
// What every instance keeps out of git: dist/, where the export, surface and company skills write
// what they produce, a research ledger among it that names people; and .obsidian/, the vault state
// the obsidian command's Obsidian keeps beside the model.
export const GITIGNORE = "dist/\n.obsidian/\n";

// `packs` is empty from day one so that an agent can tell an intentionally absent type from a
// forgotten one; the older tooling design settled that, and nothing here revisits it.
export function manifestOf({ tooling, core, units, files }) {
  return `${JSON.stringify({ tooling, core, units, packs: [], files }, null, 2)}\n`;
}

// The folders a model holds from the start: one per type that has a folder of its own. An owned
// type's folder is made by its owner (R5), and a singular type has a file and no folder.
export const rootFolders = () =>
  TYPES.filter((t) => t.folder && !t.owner)
    .map((t) => t.folder.split("/")[0])
    .filter((folder, i, all) => all.indexOf(folder) === i)
    .sort();

// An empty folder does not exist to the checks, which read a map of files: without these the
// first run says `model/ is missing`. Each folder's README names the schema its files are written
// against, as the reference instance's do, so a reader arriving in a folder does not have to know
// already which contract it answers to; a folder whose type owns others names their schemas too.
export function readmesFor(folders, units = "meta") {
  const schema = (type) => `\`${units}/core/${type}-schema.md\``;
  const words = (slug) => slug.replace(/-/g, " ");
  const files = new Map([["model/README.md", "# The model\n\nOne folder per type, one file per entity.\n"]]);
  for (const folder of folders) {
    const { type, noun } = TYPES.find((t) => t.folder && !t.owner && t.folder.split("/")[0] === folder);
    const heading = noun ? `${noun}s` : words(folder).replace(/^./, (c) => c.toUpperCase());
    const one = noun ?? words(type);
    const owned = TYPES.filter((t) => t.owner === type).map((t) => {
      const sub = t.folder.split("/").at(-1);
      return `its ${words(sub)} in \`${sub}/\` against ${schema(t.type)}`;
    });
    const body = owned.length
      ? `One folder per ${one}, written against ${schema(type)}, with ${owned.join(" and ")}.`
      : `One file per ${one}, written against ${schema(type)}.`;
    files.set(`model/${folder}/README.md`, `# ${heading}\n\n${body}\n`);
  }
  return files;
}

// The entities an instance cannot pass without: every singular type must have its file,
// and every `source` reference must resolve, so the source they name is written too. Each
// is a stub whose prose says what belongs there, and the name is the instance's own. Every page
// opens with an id of its own (R18), and the identifier file that declares their format is one
// of the singular files; `id` is a parameter so a test can fix what a random one would not.
export function startingEntities({ name, id = () => uuidv7() }) {
  return new Map([
    [
      "model/sources/local.md",
      `---\nid: ${id()}\n---\n\n# Local\n\n> Written here, in this repository, and mastered nowhere else.\n`,
    ],
    [
      "model/identity.md",
      `---\nid: ${id()}\nsource: Local\n---\n\n# ${name}\n\n> One paragraph saying what this company is.\n\n` +
        "## What it is\n\nWhat the company does, and for whom.\n",
    ],
    [
      "model/vision.md",
      `---\nid: ${id()}\nsource: Local\n---\n\n# The vision\n\n> One paragraph stating the future being worked toward.\n\n` +
        "## What it means\n\nWhat is true when it holds, and what it excludes.\n",
    ],
    [
      "model/brand.md",
      `---\nid: ${id()}\nsource: Local\n---\n\n# ${name}\n\n> One paragraph saying what carrying this name promises a reader.\n\n` +
        "## Mark\n\nWhat the mark is, and where its file is mastered.\n\n- One rule per item: clear space, minimum size, what it sits on.\n\n" +
        "## Color\n\n| Name | Means | Never |\n| --- | --- | --- |\n" +
        "| A color role | What painting something in it is saying | The one misuse it is most often put to |\n\n" +
        "## Typography\n\n| Face | Job |\n| --- | --- |\n" +
        "| A typeface | What it sets |\n\n" +
        "## Voice\n\n| Trait | Means | Never |\n| --- | --- | --- |\n" +
        "| A trait | What a sentence with it does | What a sentence without it does |\n\n" +
        "## References\n\n| What | URL |\n| --- | --- |\n" +
        "| Where a value is mastered | The link |\n",
    ],
    ["model/identifier.md", IDENTIFIER_PAGE({ id: id(), source: "Local" })],
  ]);
}

// What `companygraph-export` reads from the instance, beside the skill: the reading guide its
// Gemini Notebook bundle ships as `AGENTS.md`, and the README that says what the folder is. A
// bundle without the guide leaves a reader who opens a notebook cold no way to learn that
// references are by name, so `init` writes one and `upgrade` writes one where the instance has
// none. Like the agent's files they are the instance's own from the moment they exist: never
// hashed, never moved, never replaced. The guide says only what is true of every instance, and
// every count in it is a token the build substitutes, so it holds for any model `init` starts.
export function exportFilesFor({ name }) {
  const readme = [
    "# Export inputs",
    "What `companygraph-export` reads from the instance when it builds its two artifacts. The skill holds the procedure; this folder holds what is true of this instance and not of CompanyGraph. Both files here are the instance's own from the moment they exist: an upgrade writes one only where the instance has none, and never replaces it.",
    "- `gemini-notebook-AGENTS.md` — the reading guide the Gemini Notebook bundle ships as its `AGENTS.md`: what the notebook is, how its sources are read, and what a claim in the model rests on. A reader who opens a notebook cold has no other way to learn any of it. Every count it states is a `{{...}}` token the build substitutes with what it counted, so the guide cannot state a number the bundle does not hold. It starts general; a table of the sources and what each is read for, and a paragraph on what the model answers, are what make it this instance's.",
    "A `SKILL-intro.md` beside it would open the agent skill in the instance's own voice, and a `gemini-notebook-sources.md` would group the entities into sources of the instance's own naming, one `##` heading per source. Without the second, the export cuts the model by its own root types.",
  ].join("\n\n") + "\n";
  const guide = [
    `# ${name} — the model`,
    `> ${name}, described in CompanyGraph. This notebook is that model whole: {{entities}} entities across {{sources}} sources, every page as it is written in the repository it is mastered in.`,
    "## The sources",
    "Two of these sources carry documents about the model: this guide, `AGENTS.md`, and the repository's `README.md`, which says how the model is laid out and licensed. The rest carry its {{entities}} entities, each source named for what it holds, most of them for one type. An entity of which there is only one has a source of its own, as `identity.md` and `vision.md` do. `meta.md` holds CompanyGraph core, its conventions and its schemas, and `sources.md` holds the places the pages are mastered in.",
    "## How to read the model",
    "A source is a stack of whole pages. Each one begins at a line reading `<!-- entity: … -->`, which names the file it comes from; then comes the page, unchanged. Its frontmatter fence carries the fields a validator reads. The `#` heading under the fence is the entity's name, and that name is the handle everything else uses.",
    "**References between entities are by name, not by link.** A field or a table cell that names another entity spells it exactly as that entity's heading does. To follow a reference, take the name and find the heading.",
    "`meta.md` holds the rules every entity obeys: which fields a page of each type must carry, how a date is written, and the rule that a reference naming something that does not exist is an error rather than a note. Read it when an answer turns on whether the model is allowed to say something, not on what it says.",
    "## What a claim rests on",
    "A page's `source` field names where it is mastered, and `sources.md` says what each of those places is. A fact that is wrong is corrected there and nowhere else. A public document a claim rests on is linked from its page.",
  ].join("\n\n") + "\n";
  return new Map([
    ["export/README.md", readme],
    ["export/gemini-notebook-AGENTS.md", guide],
  ]);
}

// The instance's own CI: one file and one pin, as the reusable workflow's comment asks. The tag
// is the release of this checker the manifest's `tooling` names — the one `checkPath`'s first
// guard compares itself against — never the vendored core's own version, which `core.version`
// records separately and which may legally lag behind it. It is one of the places an upgrade
// moves.
export const workflowFor = (tag) =>
  `name: companygraph\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/instance-check.yml@${tag}\n`;

// The instance's commit-msg hook, written once by init and the instance's own from then on. It
// runs `companygraph commits` at the release the manifest's `tooling` names, read each time, so
// an upgrade moves it without touching it. A refusal (exit 3) refuses the commit; any other
// failure is the checker not running — offline, no npx, an older release — and the commit goes
// through with a sentence, because the pull request's check runs it again.
export const HOOK = `#!/bin/sh
# Refuses a commit whose author is a seat of this instance that the phase named in its trailers
# does not list. Written by companygraph init; see \`companygraph commits\`.
here=$(cd "$(dirname "$0")/../.." && pwd)
tooling=$(sed -n 's/.*"tooling" *: *"\\([^"]*\\)".*/\\1/p' "$here/.companygraph/manifest.json" | head -1)
# git commit hands its hooks the repository it is committing to, GIT_INDEX_FILE above all
# (absolute in a worktree and for commit -a), and the git clone npx runs to fetch the tooling
# would inherit it and write the tooling's index over this one. Git runs a hook at the top of the
# worktree, so the checker finds the same repository from its cwd without them.
unset GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
# A passing check says nothing: its stdout is kept, and shown only when it did not pass. Its
# refusals are on stderr, which always reaches the committer.
if [ -n "\${COMPANYGRAPH_CLI:-}" ]; then
  said=$(node "$COMPANYGRAPH_CLI" commits "$here" --message "$1")
elif command -v npx > /dev/null 2>&1 && [ -n "$tooling" ]; then
  said=$(npx --yes --prefer-offline --package "github:companygraph/meta-model#v$tooling" companygraph commits "$here" --message "$1")
else
  false
fi
status=$?
[ "$status" -eq 0 ] && exit 0
[ -n "\${said:-}" ] && printf '%s\\n' "$said"
[ "$status" -eq 3 ] && exit 1
echo "commit-msg: the seat check did not run here (exit $status); the pull request's check will run it" >&2
exit 0
`;

// The identifier file a backfill writes where an instance has none: UUID version 7, the format
// the tooling makes, with the source the identity names. An instance that means another format
// edits the file before its first new page.
export const IDENTIFIER_PAGE = ({ id, source }) =>
  `---\nid: ${id}\nsource: ${source}\nformat: uuidv7\n---\n\n# Entity id\n\n` +
  "> An entity keeps this id through every rename and every language it is written in, so whatever holds one outside the model still finds the entity.\n";

// What the chosen agent reads. Written once and never upgraded: they are the instance's own from
// the moment they exist, as the tooling design has it.
export function agentFilesFor({ agent, name, units }) {
  if (agent !== "claude") throw new Error(`no files are written for ${agent}`);
  // One line per paragraph, the family's Markdown form. No release is written into the text:
  // this file is never upgraded, so a version here would be wrong after the first upgrade, and
  // the manifest is where the release is read from.
  const agents = [
    `# ${name} — working conventions`,
    `This repository is a CompanyGraph instance. The rules it is held to are vendored under \`${units}/core/\`, and \`${units}/core/CONVENTIONS.md\` is the one to read before writing anything here: one file per entity, a reference written as a canonical name, and a schema for every type under the same folder.`,
    "The mechanical half of those rules is checked by CI, and locally by `npx github:companygraph/meta-model#v<tooling> check`, where `<tooling>` is the release `.companygraph/manifest.json` names. What no check reads is each schema's `## Writing rules`, which an agent judges by reading them against the entity: the `companygraph-validate` skill runs both halves. `companygraph-export` packages the model for an agent and for Gemini Notebook, and `companygraph-surface` produces a surface the model records; both need Python 3. `companygraph-profile` builds a profile, or extends one, from a folder of the person's documents, `companygraph-company` builds the instance from a company's web address, and `companygraph-consent`, which both of them call, records the terms and consents a source's content is used under. All of them are the tooling's and move with an upgrade, so an instance's own skills go beside them under another name.",
    "Everything below this line is this instance's own: how it is written, what it does not claim, and where its facts are mastered.",
  ].join("\n\n") + "\n";
  return new Map([
    ["AGENTS.md", agents],
    ["CLAUDE.md", "@AGENTS.md\n"],
  ]);
}
