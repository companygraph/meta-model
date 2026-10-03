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
    /**
     * Where a page carries labels cited from outside the model: the section, and the table column or the `###` heading that holds them.
     */
    labels?: {
        section: string;
        column?: string;
        heading?: boolean;
    };
    /**
     * A reference column written on one side only: no two entities of the type each name the other in it.
     */
    oneSided?: {
        section: string;
        column: string;
    };
    /**
     * A string column whose cell may name an entity of the type `names`, owned by the page's own owner: a cell that names one names it exactly, of the `kind` given where one is, and never one of another owner's alone.
     */
    typeCells?: {
        section: string;
        column: string;
        names: string;
        kind?: string;
    };
    /**
     * A reference field whose target carries this value in its own `kind`.
     */
    refKind?: {
        field: string;
        kind: string;
    };
    /**
     * A date field whose passing is noted: once the period it names has ended, the page is reported without failing.
     */
    expires?: string;
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
 * @property {{ section: string, column?: string, heading?: boolean }} [labels] Where a page carries labels cited from outside the model: the section, and the table column or the `###` heading that holds them.
 * @property {{ section: string, column: string }} [oneSided] A reference column written on one side only: no two entities of the type each name the other in it.
 * @property {{ section: string, column: string, names: string, kind?: string }} [typeCells] A string column whose cell may name an entity of the type `names`, owned by the page's own owner: a cell that names one names it exactly, of the `kind` given where one is, and never one of another owner's alone.
 * @property {{ field: string, kind: string }} [refKind] A reference field whose target carries this value in its own `kind`.
 * @property {string} [expires] A date field whose passing is noted: once the period it names has ended, the page is reported without failing.
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
/** @type {{ [name: string]: TypeEntry[] }} */
export declare const PACKS: {
    [name: string]: TypeEntry[];
};
export type VocabularyEntry = TypeEntry & {
    unit: string;
    dir: string;
};
export type PackRef = {
    name: string;
    dir: string;
    types?: TypeEntry[];
};
/**
 * A type of the vocabulary an instance takes, with the unit it belongs to and the folder its
 * schema is read from.
 * @typedef {TypeEntry & { unit: string, dir: string }} VocabularyEntry
 */
/**
 * A pack an instance takes: its name, the folder its schemas are vendored in, and optionally the
 * types it declares, which override `PACKS` for a test that brings a pack this release does not
 * ship.
 * @typedef {object} PackRef
 * @property {string} name
 * @property {string} dir
 * @property {TypeEntry[]} [types]
 */
/**
 * @param {{ core?: string, packs?: PackRef[] }} [options]
 * @returns {{ types: VocabularyEntry[], schemaOf: (type: string) => string }}
 */
export declare function vocabularyOf({ core, packs }?: {
    core?: string;
    packs?: PackRef[];
}): {
    types: VocabularyEntry[];
    schemaOf: (type: string) => string;
};
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
 * @param {TypeEntry[]} [types] the vocabulary to match against; core's by default
 * @returns {string | null}
 */
export declare function typeOfPath(rel: string, model: string, types?: TypeEntry[]): string | null;
/** @param {string} date @returns {string} */
export declare const lastDayOf: (date: string) => string;
/**
 * @param {{ files: InstanceFiles, core?: string, model?: string, fail: (message: string) => void, note?: (message: string) => void, today?: string, requireSchemaIds?: boolean, packs?: PackRef[] }} options
 * @returns {Check[]}
 */
export declare function instanceChecks({ files, core, model, fail, note, today, requireSchemaIds, packs }: {
    files: InstanceFiles;
    core?: string;
    model?: string;
    fail: (message: string) => void;
    note?: (message: string) => void;
    today?: string;
    requireSchemaIds?: boolean;
    packs?: PackRef[];
}): Check[];
/**
 * @param {InstanceFiles} files
 * @param {{ core?: string, model?: string, packs?: PackRef[], today?: string }} [options]
 * @returns {{ failures: string[], skipped: string[], notes: string[] }}
 */
export declare function checkInstance(files: InstanceFiles, { core, model, packs, today }?: {
    core?: string;
    model?: string;
    packs?: PackRef[];
    today?: string;
}): {
    failures: string[];
    skipped: string[];
    notes: string[];
};
/**
 * @param {PageChange[]} changes
 * @param {string} base
 * @returns {string[]}
 */
export declare function idChangesOf(changes: PageChange[], base: string): string[];
