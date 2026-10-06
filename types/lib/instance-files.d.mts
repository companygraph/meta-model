import type { TypeEntry } from "./checks.mjs";
export type Manifest = {
    tooling: string;
    gate?: string;
    core: {
        version: string;
        shape: number;
        source: string;
    };
    units: string;
    packs: string[];
    exclude?: string[];
    files: Record<string, string>;
};
/** @import { TypeEntry } from "./checks.mjs" */
/**
 * `.companygraph/manifest.json`: the release of the tooling the instance runs, the core it
 * vendors and where from, the folder that core sits under, and the hash of every file the
 * tooling wrote and owns.
 * @typedef {object} Manifest
 * @property {string} tooling
 * @property {string} [gate]
 * @property {{ version: string; shape: number; source: string }} core
 * @property {string} units
 * @property {string[]} packs
 * @property {string[]} [exclude]
 * @property {Record<string, string>} files
 */
/** @type {(text: string | Uint8Array) => string} */
export declare const hashOf: (text: string | Uint8Array) => string;
/** @type {(text: string) => string} */
export declare const unixLines: (text: string) => string;
export declare const GITATTRIBUTES = "* text=auto eol=lf\n";
export declare const GITIGNORE = "dist/\n.obsidian/\n";
export declare const INSTANCE_PINS: string;
export declare const GATES: string[];
/** @type {(manifest: { gate?: unknown }) => string | null} */
export declare const gateFault: (manifest: {
    gate?: unknown;
}) => string | null;
/** @type {(manifest: { tooling: string; exclude: string[]; gate?: string }) => string} */
export declare const adoptedManifestOf: (manifest: {
    tooling: string;
    exclude: string[];
    gate?: string;
}) => string;
/** @type {(tag: string) => string} */
export declare const repositoryWorkflowFor: (tag: string) => string;
/** @type {(units: string) => string[]} */
export declare const excludeFor: (units: string) => string[];
/**
 * @param {Omit<Manifest, "packs" | "exclude"> & { packs?: string[]; exclude?: string[] }} manifest
 * @returns {string}
 */
export declare function manifestOf({ tooling, gate, core, units, packs, exclude, files }: Omit<Manifest, "packs" | "exclude"> & {
    packs?: string[];
    exclude?: string[];
}): string;
/** @type {(types?: TypeEntry[]) => string[]} */
export declare const rootFolders: (types?: TypeEntry[]) => string[];
/**
 * @param {string[]} folders
 * @param {string} [units]
 * @param {(TypeEntry & { unit?: string })[]} [types] the vocabulary the folders are drawn from; core's unless a pack is taken
 * @returns {Map<string, string>}
 */
export declare function readmesFor(folders: string[], units?: string, types?: (TypeEntry & {
    unit?: string;
})[]): Map<string, string>;
/**
 * @param {{ name: string; id?: () => string; localizationSchema?: string | undefined }} instance
 * @returns {Map<string, string>}
 */
export declare function startingEntities({ name, id, localizationSchema }: {
    name: string;
    id?: () => string;
    localizationSchema?: string | undefined;
}): Map<string, string>;
/**
 * @param {{ name: string }} instance
 * @returns {Map<string, string>}
 */
export declare function exportFilesFor({ name }: {
    name: string;
}): Map<string, string>;
/** @type {(tag: string) => string} */
export declare const workflowFor: (tag: string) => string;
export declare const HOOK = "#!/bin/sh\n# Refuses a commit whose author is a seat of this instance that the phase named in its trailers\n# does not list. Written by companygraph init; see `companygraph commits`.\nhere=$(cd \"$(dirname \"$0\")/../..\" && pwd)\ntooling=$(sed -n 's/.*\"tooling\" *: *\"\\([^\"]*\\)\".*/\\1/p' \"$here/.companygraph/manifest.json\" | head -1)\n# git commit hands its hooks the repository it is committing to, GIT_INDEX_FILE above all\n# (absolute in a worktree and for commit -a), and the git clone npx runs to fetch the tooling\n# would inherit it and write the tooling's index over this one. Git runs a hook at the top of the\n# worktree, so the checker finds the same repository from its cwd without them.\nunset GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES\n# A passing check says nothing: its stdout is kept, and shown only when it did not pass. Its\n# refusals are on stderr, which always reaches the committer.\nstatus=1\nif [ -n \"${COMPANYGRAPH_CLI:-}\" ]; then\n  said=$(node \"$COMPANYGRAPH_CLI\" commits \"$here\" --message \"$1\")\n  status=$?\nelif command -v npx > /dev/null 2>&1 && [ -n \"$tooling\" ]; then\n  package=\"github:companygraph/meta-model#v$tooling\"\n  said=$(npx --yes --prefer-offline --package \"$package\" companygraph commits \"$here\" --message \"$1\")\n  status=$?\n  # Up to 0.71.0 git recorded the bin without its execute bit, and npm sets the bit only when it\n  # links a bin: a repository whose own node_modules holds the release npx asks for, put back\n  # under a link that was already there, has a bin sh cannot run: bash says 126, Debian's dash\n  # 127. node can, from the bin npm exec puts first on PATH.\n  if [ \"$status\" -eq 126 ] || [ \"$status\" -eq 127 ]; then\n    said=$(COMPANYGRAPH_HERE=\"$here\" COMPANYGRAPH_MESSAGE=\"$1\" npx --yes --prefer-offline --package \"$package\" -c \\\n      'IFS=:; for d in $PATH; do [ -f \"$d/companygraph\" ] && exec node \"$d/companygraph\" commits \"$COMPANYGRAPH_HERE\" --message \"$COMPANYGRAPH_MESSAGE\"; done; exit 127')\n    status=$?\n  fi\nfi\n[ \"$status\" -eq 0 ] && exit 0\n[ -n \"${said:-}\" ] && printf '%s\\n' \"$said\"\n[ \"$status\" -eq 3 ] && exit 1\necho \"commit-msg: the seat check did not run here (exit $status); the pull request's check will run it\" >&2\nexit 0\n";
export declare const GATE_HOOK = "#!/bin/sh\n# Refuses a commit that does not pass this repository's checks: companygraph check and ids, then\n# each command in pins.json's verify. Written by companygraph for the git gate.\nhere=$(cd \"$(dirname \"$0\")/../..\" && pwd)\ncd \"$here\" || exit 1\n# The checks read the working tree, so the tree has to be what is being committed. Asked before\n# the variables below are unset: commit -a hands this hook an index of its own in GIT_INDEX_FILE.\nif ! git diff --quiet || [ -n \"$(git ls-files --others --exclude-standard)\" ]; then\n  echo \"\u2717 pre-commit: the working tree holds changes this commit leaves out; stage them or set them aside, and commit again\" >&2\n  exit 1\nfi\n# ids compares commits, not the working tree, so the tree being committed is written as git holds\n# it: from the index this hook was handed, which is why it is written before that is unset.\nif ! tree=$(git write-tree); then\n  echo \"\u2717 pre-commit: the tree being committed could not be written, so ids could not compare it\" >&2\n  exit 1\nfi\ntooling=$(sed -n 's/.*\"tooling\" *: *\"\\([^\"]*\\)\".*/\\1/p' \"$here/.companygraph/manifest.json\" | head -1)\n# The clone npx makes of the tooling would inherit these and write its index over this one.\nunset GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES\nfailed=0\nrun() {\n  said=$(\"$@\" 2>&1) || { printf '%s\\n' \"$said\" >&2; failed=1; }\n}\ncompanygraph() {\n  if [ -n \"${COMPANYGRAPH_CLI:-}\" ]; then\n    run node \"$COMPANYGRAPH_CLI\" \"$@\"\n  else\n    run npx --yes --prefer-offline --package \"github:companygraph/meta-model#v$tooling\" companygraph \"$@\"\n  fi\n}\nif [ -z \"${COMPANYGRAPH_CLI:-}\" ] && { ! command -v npx > /dev/null 2>&1 || [ -z \"$tooling\" ]; }; then\n  echo \"\u2717 pre-commit: check could not run here, no npx or no tooling in the manifest; nothing else runs it, or ids, on this gate\" >&2\n  failed=1\nelse\n  companygraph check \"$here\"\n  # What the pull request's ids --range holds on the github gate: an id already landed changed, a\n  # decision rewritten or deleted, a label moved or used again. It holds an instance's model or\n  # the schemas of the repository that makes core; a repository that took the machinery alone\n  # has neither, and ids would refuse it as no instance. A first commit has no HEAD and nothing to\n  # compare. ids reads a range of commits, so the tree is made a commit on HEAD that nothing\n  # references; git fsck shows it as dangling, and git's gc removes it once it is older than\n  # gc.pruneExpire.\n  if { [ -d \"$here/model\" ] || [ -f \"$here/core/CONVENTIONS.md\" ]; } && git rev-parse --verify --quiet HEAD > /dev/null; then\n    # The range starts where a pull request's would: the merge base with the default branch,\n    # init.defaultBranch, else main, else master, whichever is a branch here. On the default\n    # branch, or where there is none, every commit has landed, and the range starts at HEAD.\n    default=$(git config init.defaultBranch)\n    if [ -z \"$default\" ]; then\n      for name in main master; do\n        if git rev-parse --verify --quiet \"refs/heads/$name\" > /dev/null; then\n          default=$name\n          break\n        fi\n      done\n    fi\n    base=HEAD\n    if [ -n \"$default\" ] && [ \"$(git symbolic-ref --quiet --short HEAD)\" != \"$default\" ] \\\n        && git rev-parse --verify --quiet \"refs/heads/$default\" > /dev/null; then\n      base=$(git merge-base \"refs/heads/$default\" HEAD) || base=HEAD\n    fi\n    if staged=$(GIT_AUTHOR_NAME=companygraph GIT_AUTHOR_EMAIL=pre-commit@companygraph.invalid \\\n        GIT_COMMITTER_NAME=companygraph GIT_COMMITTER_EMAIL=pre-commit@companygraph.invalid \\\n        git commit-tree \"$tree\" -p HEAD -m \"companygraph pre-commit: the tree being committed\"); then\n      companygraph ids \"$here\" --range \"$base..$staged\"\n    else\n      echo \"\u2717 pre-commit: the tree being committed could not be made a commit, so ids could not compare it\" >&2\n      failed=1\n    fi\n  fi\nfi\n# verify is read with node, so without node it is not read at all, and that is said as itself\n# rather than as a pins.json that is not JSON. Each command is one line, since the lines are what\n# the loop below runs: a command holding a line break would run as several, so it refuses\n# the commit (exit 4) before any of them runs.\nif [ -f pins.json ]; then\n  if ! command -v node > /dev/null 2>&1; then\n    echo \"\u2717 pre-commit: pins.json is here and node is not on PATH to read it, so its verify commands did not run\" >&2\n    failed=1\n  else\n    verify=$(node -e 'const v = JSON.parse(require(\"fs\").readFileSync(\"pins.json\", \"utf8\")).verify; if (v !== undefined && !Array.isArray(v)) throw new Error(\"verify is not a list\"); if ((v ?? []).some((c) => typeof c === \"string\" && /[\\r\\n]/.test(c))) process.exit(4); for (const c of v ?? []) console.log(c)' 2>/dev/null)\n    status=$?\n    if [ \"$status\" -eq 0 ]; then\n      while IFS= read -r command; do\n        [ -n \"$command\" ] && run sh -c \"$command\" < /dev/null\n      done <<VERIFY\n$verify\nVERIFY\n    elif [ \"$status\" -eq 4 ]; then\n      echo \"\u2717 pre-commit: a command in pins.json's verify holds a line break, and each command is one line, so none of them ran\" >&2\n      failed=1\n    else\n      echo \"\u2717 pre-commit: pins.json could not be read as JSON with a list for verify, so its verify commands did not run\" >&2\n      failed=1\n    fi\n  fi\nfi\n[ \"$failed\" -eq 0 ] && exit 0\necho \"\u2717 pre-commit: a check failed, so nothing was committed\" >&2\nexit 1\n";
/** @type {readonly string[]} */
export declare const PAST_GATE_HOOKS: readonly string[];
export declare const MERGE_HOOK = "#!/bin/sh\nexec \"$(dirname \"$0\")/pre-commit\"\n";
/** @type {(page: { id: string; source: string }) => string} */
export declare const IDENTIFIER_PAGE: (page: {
    id: string;
    source: string;
}) => string;
/** @type {(page: { id: string; source: string; locale?: string }) => string} */
export declare const LOCALIZATION_PAGE: (page: {
    id: string;
    source: string;
    locale?: string;
}) => string;
/** @type {(schema: string | undefined, page: { id: string; source: string }) => string} */
export declare const localizationPageFor: (schema: string | undefined, page: {
    id: string;
    source: string;
}) => string;
/** @param {string} gate */
export declare function checkedBy(gate: string): string;
/**
 * @param {{ agent: string; name: string; units: string; gate?: string }} ask
 * @returns {Map<string, string>}
 */
export declare function agentFilesFor({ agent, name, units, gate }: {
    agent: string;
    name: string;
    units: string;
    gate?: string;
}): Map<string, string>;
