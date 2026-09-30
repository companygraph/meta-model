import { enumTokensOf, IMAGE_FILE } from "./instance.mjs";
export { enumTokensOf, IMAGE_FILE };
export type InstanceFiles = import("./instance.mjs").InstanceFiles;
export type PageChange = import("./history.mjs").PageChange;
export type TypeEntry = {
    type: string;
    folder?: string;
    file?: string;
    owner?: string;
    owns?: string[];
    noun?: string;
    filename?: {
        year: string;
        rest: string;
    };
};
export type PipeTable = {
    columns: string[];
    rows: string[][];
};
export type Block = {
    section: string | null;
    grouped: string | null;
    table: PipeTable | null;
};
export type ImageInfo = {
    format: "png" | "jpeg";
    width: number;
    height: number;
};
export type Check = {
    name: string;
    rule: string;
    run: () => void;
};
/** @typedef {import("./instance.mjs").InstanceFiles} InstanceFiles */
/** @typedef {import("./history.mjs").PageChange} PageChange */
/**
 * A type as this release ships it: its folder, with `<placeholder>` segments for its owners, or
 * its one file; what owns it and what it owns; how prose writes it where its id will not do; and
 * the form its filename takes where R12's default does not hold.
 * @typedef {object} TypeEntry
 * @property {string} type
 * @property {string} [folder]
 * @property {string} [file]
 * @property {string} [owner]
 * @property {string[]} [owns]
 * @property {string} [noun]
 * @property {{ year: string, rest: string }} [filename]
 */
/**
 * A pipe table as the checks read it: its header row's cells and every row after the separator.
 * @typedef {object} PipeTable
 * @property {string[]} columns
 * @property {string[][]} rows
 */
/**
 * One contiguous pipe block, with the section a column table's caption or a heading table's
 * caption addresses; `table` is null where the block is no valid table.
 * @typedef {object} Block
 * @property {string | null} section
 * @property {string | null} grouped
 * @property {PipeTable | null} table
 */
/**
 * What an image's own bytes say it is.
 * @typedef {object} ImageInfo
 * @property {"png" | "jpeg"} format
 * @property {number} width
 * @property {number} height
 */
/**
 * One check: what it holds, the rule it enforces, and the run that reports through `fail`.
 * @typedef {object} Check
 * @property {string} name
 * @property {string} rule
 * @property {() => void} run
 */
/** @type {TypeEntry[]} */
export declare const TYPES: TypeEntry[];
export declare const SINGULAR: (TypeEntry & {
    file: string;
})[];
export declare const PLURAL: (TypeEntry & {
    folder: string;
})[];
export declare const MODEL = "model";
/** @param {string} s @returns {string} */
export declare const slug: (s: string) => string;
/** @param {string} a @param {string} b @returns {boolean} */
export declare const isNewer: (a: string, b: string) => boolean;
export declare const TYPE_VOCABULARY: Set<string>;
export declare const DATE: RegExp;
export declare const IMAGE_BOUNDS: {
    min: number;
    max: number;
    bytes: number;
};
/**
 * @param {unknown} bytes
 * @returns {ImageInfo | null}
 */
export declare function imageInfoOf(bytes: unknown): ImageInfo | null;
/**
 * @param {string} text
 * @returns {Map<string, string>}
 */
export declare function sectionsOf(text: string): Map<string, string>;
/**
 * @param {string} body
 * @returns {PipeTable | null}
 */
export declare function tableOf(body: string): PipeTable | null;
export declare const COLUMN_CAPTION: RegExp;
export declare const HEADING_CAPTION: RegExp;
/**
 * @param {string} body
 * @returns {Block[]}
 */
export declare function blocksOf(body: string): Block[];
/** @param {string} body @returns {(PipeTable | null)[]} */
export declare const tablesOf: (body: string) => (PipeTable | null)[];
/**
 * @param {string} rel
 * @param {string} model
 * @returns {string | null}
 */
export declare function typeOfPath(rel: string, model: string): string | null;
/**
 * @param {{ files: InstanceFiles, core?: string, model?: string, fail: (message: string) => void, requireSchemaIds?: boolean }} options
 * @returns {Check[]}
 */
export declare function instanceChecks({ files, core, model, fail, requireSchemaIds }: {
    files: InstanceFiles;
    core?: string;
    model?: string;
    fail: (message: string) => void;
    requireSchemaIds?: boolean;
}): Check[];
/**
 * @param {InstanceFiles} files
 * @param {{ core?: string, model?: string }} [options]
 * @returns {{ failures: string[], skipped: string[] }}
 */
export declare function checkInstance(files: InstanceFiles, { core, model }?: {
    core?: string;
    model?: string;
}): {
    failures: string[];
    skipped: string[];
};
/**
 * @param {PageChange[]} changes
 * @param {string} base
 * @returns {string[]}
 */
export declare function idChangesOf(changes: PageChange[], base: string): string[];
