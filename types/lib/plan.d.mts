import type { Files } from "./instance.mjs";
export type InitAsk = {
    core: Files;
    skills?: Files | undefined;
    packs?: Map<string, Files> | undefined;
    tooling: string;
    tag: string;
    name?: string | undefined;
    agent: string;
    units?: string | undefined;
    folders?: string[] | undefined;
    present?: Set<string> | undefined;
    fetched?: boolean | undefined;
    hook?: boolean | undefined;
    gate?: string | undefined;
    repository?: boolean | undefined;
};
export type InitPlan = {
    refused: string;
    writes?: undefined;
} | {
    refused?: undefined;
    writes: Map<string, string>;
};
export type UpgradeAsk = {
    core: Files;
    skills?: Files | undefined;
    packs?: Map<string, Files> | undefined;
    tooling: string;
    tag: string;
    manifest: {
        files?: Record<string, string>;
        units?: string;
        core?: {
            version?: string;
        };
        tooling?: string;
        packs?: string[];
        exclude?: string[];
        gate?: string;
    };
    /**
     * The files the repository holds at every path the manifest or this release names, and at `.companygraph/hooks/commit-msg`, `.companygraph/hooks/pre-commit` and `.companygraph/hooks/pre-merge-commit` where they exist.
     */
    held: Map<string, string | undefined>;
    /**
     * Whether the folder is a git repository; the git gate refuses where it is not.
     */
    repository?: boolean | undefined;
    workflow: string | null;
    /**
     * Every page under the instance's `model/` as text, and every other file under `model/roles/` as its bytes, keyed by its path from the instance root; a core with `seat-schema.md` refuses an ask that omits it, because a caller that has not read the model cannot say what to carry across.
     */
    model: Map<string, string | Uint8Array>;
    fetched?: boolean | undefined;
    force?: boolean | undefined;
    name?: string | undefined;
    /**
     * The gate to move to; absent keeps the one the manifest names.
     */
    gate?: string | undefined;
    /**
     * The paths the repository holds; a caller that omits it has not said, so `pins.json` is never written for it.
     */
    present?: Set<string> | undefined;
};
export type UpgradeWrites = {
    refused?: undefined;
    writes: Map<string, string | Uint8Array>;
    removes: string[];
    edited: string[];
    missing: string[];
    given: string[];
    rewritten: string[];
    /**
     * The files an upgrade moves, as `[from, to]`, each page keeping its id.
     */
    moved: [string, string][];
    forced: string[];
    /**
     * Gate hooks in an earlier release's text, brought to this one.
     */
    refreshed: string[];
    /**
     * Gate hooks edited since the tooling wrote them, left as they are.
     */
    unreplaced: string[];
    from: string;
    to: string;
};
export type UpgradePlan = {
    refused: string;
} | UpgradeWrites;
export type BackfillAsk = {
    firstCommitMs: (path: string) => number | null;
    now?: number;
    random?: () => ArrayLike<number>;
};
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
 * @property {string | undefined} [gate]
 * @property {boolean | undefined} [repository]
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
 * @property {{ files?: Record<string, string>; units?: string; core?: { version?: string }; tooling?: string; packs?: string[]; exclude?: string[]; gate?: string }} manifest
 * @property {Map<string, string | undefined>} held The files the repository holds at every path the manifest or this release names, and at `.companygraph/hooks/commit-msg`, `.companygraph/hooks/pre-commit` and `.companygraph/hooks/pre-merge-commit` where they exist.
 * @property {boolean | undefined} [repository] Whether the folder is a git repository; the git gate refuses where it is not.
 * @property {string | null} workflow
 * @property {Map<string, string | Uint8Array>} model Every page under the instance's `model/` as text, and every other file under `model/roles/` as its bytes, keyed by its path from the instance root; a core with `seat-schema.md` refuses an ask that omits it, because a caller that has not read the model cannot say what to carry across.
 * @property {boolean | undefined} [fetched]
 * @property {boolean | undefined} [force]
 * @property {string | undefined} [name]
 * @property {string | undefined} [gate] The gate to move to; absent keeps the one the manifest names.
 * @property {Set<string> | undefined} [present] The paths the repository holds; a caller that omits it has not said, so `pins.json` is never written for it.
 */
/**
 * What an upgrade writes and removes, what it overwrote or rewrote under `--force`, the export
 * inputs it gave, and the core versions it moves between; or a refusal, which carries nothing else.
 * @typedef {object} UpgradeWrites
 * @property {undefined} [refused]
 * @property {Map<string, string | Uint8Array>} writes
 * @property {string[]} removes
 * @property {string[]} edited
 * @property {string[]} missing
 * @property {string[]} given
 * @property {string[]} rewritten
 * @property {[string, string][]} moved The files an upgrade moves, as `[from, to]`, each page keeping its id.
 * @property {string[]} forced
 * @property {string[]} refreshed Gate hooks in an earlier release's text, brought to this one.
 * @property {string[]} unreplaced Gate hooks edited since the tooling wrote them, left as they are.
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
export declare const AGENTS: string[];
export declare const SKILLS = ".claude/skills/";
/**
 * @param {InitAsk} ask
 * @returns {InitPlan}
 */
export declare function initPlan({ core, skills, packs, tooling, tag, name, agent, units, folders, present, fetched, hook, gate, repository }: InitAsk): InitPlan;
/**
 * @param {UpgradeAsk} ask
 * @returns {UpgradePlan}
 */
export declare function upgradePlan({ core, skills, packs, tooling, tag, manifest, held, workflow, fetched, force, name, present: said, gate, repository, model }: UpgradeAsk): UpgradePlan;
/**
 * @param {{ from: string; to: string; workflow: string; hasWorkflow: boolean; held: Map<string, string | undefined>; force?: boolean }} ask
 * @returns {{ refused: string; writes?: undefined } | { refused?: undefined; writes: Map<string, string>; removes: string[]; forced: string[]; refreshed: string[]; unreplaced: string[] }}
 */
export declare function gatePlan({ from, to, workflow, hasWorkflow, held, force }: {
    from: string;
    to: string;
    workflow: string;
    hasWorkflow: boolean;
    held: Map<string, string | undefined>;
    force?: boolean;
}): {
    refused: string;
    writes?: undefined;
} | {
    refused?: undefined;
    writes: Map<string, string>;
    removes: string[];
    forced: string[];
    refreshed: string[];
    unreplaced: string[];
};
/**
 * @param {{ tooling: string; present: Set<string>; gate?: string; repository?: boolean }} ask
 * @returns {InitPlan}
 */
export declare function adoptPlan({ tooling, present, gate, repository }: {
    tooling: string;
    present: Set<string>;
    gate?: string;
    repository?: boolean;
}): InitPlan;
/**
 * @param {{ tooling: string; manifest: { tooling?: string; exclude?: string[]; gate?: string }; workflow: string | null; present: Set<string>; gate?: string; held?: Map<string, string | undefined>; force?: boolean; repository?: boolean }} ask
 * `held` must hold `.companygraph/hooks/commit-msg`, `.companygraph/hooks/pre-commit` and `.companygraph/hooks/pre-merge-commit` where they exist.
 * @returns {{ writes: Map<string, string>; removes: string[]; forced: string[]; refreshed: string[]; unreplaced: string[]; given: string[]; from: string; to: string } | { refused: string; writes?: undefined }}
 */
export declare function adoptedUpgradePlan({ tooling, manifest, workflow, present, gate, held, force, repository }: {
    tooling: string;
    manifest: {
        tooling?: string;
        exclude?: string[];
        gate?: string;
    };
    workflow: string | null;
    present: Set<string>;
    gate?: string;
    held?: Map<string, string | undefined>;
    force?: boolean;
    repository?: boolean;
}): {
    writes: Map<string, string>;
    removes: string[];
    forced: string[];
    refreshed: string[];
    unreplaced: string[];
    given: string[];
    from: string;
    to: string;
} | {
    refused: string;
    writes?: undefined;
};
/**
 * @param {Map<string, string | Uint8Array>} files
 * @param {BackfillAsk & { model?: string; types?: import("./checks.mjs").TypeEntry[] }} ask
 * @returns {Map<string, string> | { refused: string }}
 */
export declare function backfillPlan(files: Map<string, string | Uint8Array>, { model, firstCommitMs, now, random, types }: BackfillAsk & {
    model?: string;
    types?: import("./checks.mjs").TypeEntry[];
}): Map<string, string> | {
    refused: string;
};
/**
 * @param {Map<string, string | Uint8Array>} files
 * @param {BackfillAsk & { core?: string }} ask
 * @returns {Map<string, string>}
 */
export declare function schemaBackfillPlan(files: Map<string, string | Uint8Array>, { core, firstCommitMs, now, random }: BackfillAsk & {
    core?: string;
}): Map<string, string>;
