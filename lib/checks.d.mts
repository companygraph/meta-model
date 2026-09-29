import { enumTokensOf, IMAGE_FILE } from "./instance.mts";
import type { InstanceFiles } from "./instance.mts";
export { enumTokensOf, IMAGE_FILE };
export type { InstanceFiles };
export interface TypeEntry {
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
}
export interface PipeTable {
    columns: string[];
    rows: string[][];
}
export interface Block {
    section: string | null;
    grouped: string | null;
    table: PipeTable | null;
}
export interface ImageInfo {
    format: "png" | "jpeg";
    width: number;
    height: number;
}
export interface Check {
    name: string;
    rule: string;
    run(): void;
}
export declare const TYPES: TypeEntry[];
export declare const SINGULAR: (TypeEntry & {
    file: string;
})[];
export declare const PLURAL: (TypeEntry & {
    folder: string;
})[];
export declare const MODEL = "model";
export declare const slug: (s: string) => string;
export declare const isNewer: (a: string, b: string) => boolean;
export declare const TYPE_VOCABULARY: Set<string>;
export declare const DATE: RegExp;
export declare const IMAGE_BOUNDS: {
    min: number;
    max: number;
    bytes: number;
};
export declare function imageInfoOf(bytes: unknown): ImageInfo | null;
export declare function sectionsOf(text: string): Map<string, string>;
export declare function tableOf(body: string): PipeTable | null;
export declare const COLUMN_CAPTION: RegExp;
export declare const HEADING_CAPTION: RegExp;
export declare function blocksOf(body: string): Block[];
export declare const tablesOf: (body: string) => (PipeTable | null)[];
export declare function typeOfPath(rel: string, model: string): string | null;
export declare function instanceChecks({ files, core, model, fail }: {
    files: InstanceFiles;
    core?: string;
    model?: string;
    fail: (message: string) => void;
}): Check[];
export declare function checkInstance(files: InstanceFiles, { core, model }?: {
    core?: string;
    model?: string;
}): {
    failures: string[];
    skipped: string[];
};
