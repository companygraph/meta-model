import type { InstanceGraph, InstanceFiles, Files } from "./instance.mjs";
/** @import { InstanceGraph, InstanceFiles, Files, Entity } from "./instance.mjs" */
export declare const KNOWN = "judge/known.md";
export declare const KNOWN_COLUMNS: string[];
/**
 * @param {string} page
 * @param {string} rule
 * @returns {string}
 */
export declare const knownHashOf: (page: string, rule: string) => string;
/**
 * @param {string} text
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {{ failures: string[]; notes: string[] }}
 */
export declare function checkKnown(text: string, { graph, files, schemas }: {
    graph: InstanceGraph;
    files: InstanceFiles;
    schemas: Files;
}): {
    failures: string[];
    notes: string[];
};
