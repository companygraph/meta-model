import type { Files } from "./instance.mjs";
export type InitAsk = {
    core: Files;
    skills?: Files | undefined;
    tooling: string;
    tag: string;
    name?: string | undefined;
    agent: string;
    units?: string | undefined;
    folders?: string[] | undefined;
    present?: Set<string> | undefined;
    fetched?: boolean | undefined;
    hook?: boolean | undefined;
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
    tooling: string;
    tag: string;
    manifest: {
        files?: Record<string, string>;
        units?: string;
        core?: {
            version?: string;
        };
        tooling?: string;
    };
    held: Map<string, string | undefined>;
    workflow: string | null;
    fetched?: boolean | undefined;
    force?: boolean | undefined;
    name?: string | undefined;
    present?: Set<string> | undefined;
};
export type UpgradeWrites = {
    refused?: undefined;
    writes: Map<string, string>;
    removes: string[];
    edited: string[];
    missing: string[];
    given: string[];
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
 * @property {string} tooling
 * @property {string} tag
 * @property {{ files?: Record<string, string>; units?: string; core?: { version?: string }; tooling?: string }} manifest
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
export declare function initPlan({ core, skills, tooling, tag, name, agent, units, folders, present, fetched, hook }: InitAsk): InitPlan;
/**
 * @param {UpgradeAsk} ask
 * @returns {UpgradePlan}
 */
export declare function upgradePlan({ core, skills, tooling, tag, manifest, held, workflow, fetched, force, name, present }: UpgradeAsk): UpgradePlan;
/**
 * @param {Map<string, string | Uint8Array>} files
 * @param {BackfillAsk & { model?: string }} ask
 * @returns {Map<string, string> | { refused: string }}
 */
export declare function backfillPlan(files: Map<string, string | Uint8Array>, { model, firstCommitMs, now, random }: BackfillAsk & {
    model?: string;
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
