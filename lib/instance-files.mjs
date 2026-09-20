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
// first run says `model/ is missing`.
export function readmesFor(folders) {
  const files = new Map([["model/README.md", "# The model\n\nOne folder per type, one file per entity.\n"]]);
  for (const folder of folders)
    files.set(`model/${folder}/README.md`, `# ${folder}\n\nOne file per entity of this type.\n`);
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
  const agents =
    `# ${name} — working conventions\n\n` +
    `This repository is a CompanyGraph instance. The rules it is held to are vendored under\n` +
    `\`${units}/core/\`, and \`${units}/core/CONVENTIONS.md\` is the one to read before writing\n` +
    "anything here: one file per entity, a reference written as a canonical name, and a schema\n" +
    "for every type under the same folder.\n\n" +
    "The mechanical half of those rules is checked by CI, and locally by\n" +
    "`npx companygraph-meta-model check`. What no check reads is each schema's\n" +
    "`## Writing rules`, which an agent judges by reading them against the entity.\n\n" +
    "Everything below this line is this instance's own: how it is written, what it does not\n" +
    "claim, and where its facts are mastered.\n";
  return new Map([
    ["AGENTS.md", agents],
    ["CLAUDE.md", "@AGENTS.md\n"],
  ]);
}
