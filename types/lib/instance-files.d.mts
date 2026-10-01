export type Manifest = {
    tooling: string;
    core: {
        version: string;
        shape: number;
        source: string;
    };
    units: string;
    packs: string[];
    files: Record<string, string>;
};
/** @import { TypeEntry } from "./checks.mjs" */
/**
 * `.companygraph/manifest.json`: the release of the tooling the instance runs, the core it
 * vendors and where from, the folder that core sits under, and the hash of every file the
 * tooling wrote and owns.
 * @typedef {object} Manifest
 * @property {string} tooling
 * @property {{ version: string; shape: number; source: string }} core
 * @property {string} units
 * @property {string[]} packs
 * @property {Record<string, string>} files
 */
/** @type {(text: string | Uint8Array) => string} */
export declare const hashOf: (text: string | Uint8Array) => string;
/** @type {(text: string) => string} */
export declare const unixLines: (text: string) => string;
export declare const GITATTRIBUTES = "* text=auto eol=lf\n";
export declare const GITIGNORE = "dist/\n.obsidian/\n";
/**
 * @param {Omit<Manifest, "packs"> & { packs?: string[] }} manifest
 * @returns {string}
 */
export declare function manifestOf({ tooling, core, units, packs, files }: Omit<Manifest, "packs"> & {
    packs?: string[];
}): string;
/** @type {() => string[]} */
export declare const rootFolders: () => string[];
/**
 * @param {string[]} folders
 * @param {string} [units]
 * @returns {Map<string, string>}
 */
export declare function readmesFor(folders: string[], units?: string): Map<string, string>;
/**
 * @param {{ name: string; id?: () => string }} instance
 * @returns {Map<string, string>}
 */
export declare function startingEntities({ name, id }: {
    name: string;
    id?: () => string;
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
export declare const HOOK = "#!/bin/sh\n# Refuses a commit whose author is a seat of this instance that the phase named in its trailers\n# does not list. Written by companygraph init; see `companygraph commits`.\nhere=$(cd \"$(dirname \"$0\")/../..\" && pwd)\ntooling=$(sed -n 's/.*\"tooling\" *: *\"\\([^\"]*\\)\".*/\\1/p' \"$here/.companygraph/manifest.json\" | head -1)\n# git commit hands its hooks the repository it is committing to, GIT_INDEX_FILE above all\n# (absolute in a worktree and for commit -a), and the git clone npx runs to fetch the tooling\n# would inherit it and write the tooling's index over this one. Git runs a hook at the top of the\n# worktree, so the checker finds the same repository from its cwd without them.\nunset GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES\n# A passing check says nothing: its stdout is kept, and shown only when it did not pass. Its\n# refusals are on stderr, which always reaches the committer.\nif [ -n \"${COMPANYGRAPH_CLI:-}\" ]; then\n  said=$(node \"$COMPANYGRAPH_CLI\" commits \"$here\" --message \"$1\")\nelif command -v npx > /dev/null 2>&1 && [ -n \"$tooling\" ]; then\n  said=$(npx --yes --prefer-offline --package \"github:companygraph/meta-model#v$tooling\" companygraph commits \"$here\" --message \"$1\")\nelse\n  false\nfi\nstatus=$?\n[ \"$status\" -eq 0 ] && exit 0\n[ -n \"${said:-}\" ] && printf '%s\\n' \"$said\"\n[ \"$status\" -eq 3 ] && exit 1\necho \"commit-msg: the seat check did not run here (exit $status); the pull request's check will run it\" >&2\nexit 0\n";
/** @type {(page: { id: string; source: string }) => string} */
export declare const IDENTIFIER_PAGE: (page: {
    id: string;
    source: string;
}) => string;
/** @type {(page: { id: string; source: string; primary?: string }) => string} */
export declare const LOCALIZATION_PAGE: (page: {
    id: string;
    source: string;
    primary?: string;
}) => string;
/**
 * @param {{ agent: string; name: string; units: string }} ask
 * @returns {Map<string, string>}
 */
export declare function agentFilesFor({ agent, name, units }: {
    agent: string;
    name: string;
    units: string;
}): Map<string, string>;
