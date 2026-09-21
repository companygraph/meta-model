// Every file an instance starts with that is not vendored core: its manifest, the README that
// makes a folder exist at all, the three entities without which the checks refuse, the workflow
// that runs them, and the files the chosen agent reads. Pure: text in, text out, so what `init`
// would write is decided here and tested without a filesystem.
import { createHash } from "node:crypto";
import { TYPES } from "./checks.mjs";

// The hash the manifest carries per vendored file, and what `upgrade` compares against.
export const hashOf = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

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
    const { type } = TYPES.find((t) => t.folder && !t.owner && t.folder.split("/")[0] === folder);
    const heading = words(folder).replace(/^./, (c) => c.toUpperCase());
    const owned = TYPES.filter((t) => t.owner === type).map((t) => {
      const sub = t.folder.split("/").at(-1);
      return `its ${words(sub)} in \`${sub}/\` against ${schema(t.type)}`;
    });
    const body = owned.length
      ? `One folder per ${words(type)}, written against ${schema(type)}, with ${owned.join(" and ")}.`
      : `One file per ${words(type)}, written against ${schema(type)}.`;
    files.set(`model/${folder}/README.md`, `# ${heading}\n\n${body}\n`);
  }
  return files;
}

// The three entities an instance cannot pass without: every singular type must have its file,
// and every `source` reference must resolve, so the source those two name is written too. Each
// is a stub whose prose says what belongs there, and the name is the instance's own.
export function startingEntities({ name }) {
  return new Map([
    [
      "model/sources/local.md",
      "# Local\n\n> Written here, in this repository, and mastered nowhere else.\n",
    ],
    [
      "model/identity.md",
      `---\nsource: Local\n---\n\n# ${name}\n\n> One paragraph saying what this company is.\n\n` +
        "## What it is\n\nWhat the company does, and for whom.\n",
    ],
    [
      "model/vision.md",
      "---\nsource: Local\n---\n\n# The vision\n\n> One paragraph stating the future being worked toward.\n\n" +
        "## What it means\n\nWhat is true when it holds, and what it excludes.\n",
    ],
  ]);
}

// The instance's own CI: one file and one pin, as the reusable workflow's comment asks. The tag
// is the release of this checker the manifest's `tooling` names — the one `checkPath`'s first
// guard compares itself against — never the vendored core's own version, which `core.version`
// records separately and which may legally lag behind it. It is one of the places an upgrade
// moves.
export const workflowFor = (tag) =>
  `name: companygraph\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/instance-check.yml@${tag}\n`;

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
    "The mechanical half of those rules is checked by CI, and locally by `npx github:companygraph/meta-model#v<tooling> check`, where `<tooling>` is the release `.companygraph/manifest.json` names. What no check reads is each schema's `## Writing rules`, which an agent judges by reading them against the entity: the `companygraph-validate` skill runs both halves. `companygraph-export` packages the model for an agent and for Gemini Notebook, and `companygraph-surface` produces a surface the model records; both need Python 3. The three are the tooling's and move with an upgrade, so an instance's own skills go beside them under another name.",
    "Everything below this line is this instance's own: how it is written, what it does not claim, and where its facts are mastered.",
  ].join("\n\n") + "\n";
  return new Map([
    ["AGENTS.md", agents],
    ["CLAUDE.md", "@AGENTS.md\n"],
  ]);
}
