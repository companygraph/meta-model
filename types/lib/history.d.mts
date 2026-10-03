import type { InstanceFiles, InstanceGraph } from "./instance.mjs";
import type { Trailers } from "./seats.mjs";
export type Commit = {
    sha: string;
    name: string;
    email: string;
    subject: string;
    trailers: Trailers;
};
export type Member = {
    repo: string;
    path: string;
};
/**
 * @param {string} dir
 * @returns {string | null}
 */
export declare function gitTop(dir: string): string | null;
/** @type {(dir: string) => boolean} */
export declare const isInstance: (dir: string) => boolean;
/**
 * @param {string} dir
 * @returns {{ graph: InstanceGraph; files: InstanceFiles; schemas: Map<string, string>; core: string | null }}
 */
export declare function instanceAt(dir: string): {
    graph: InstanceGraph;
    files: InstanceFiles;
    schemas: Map<string, string>;
    core: string | null;
};
/**
 * @param {string} dir
 * @returns {InstanceGraph}
 */
export declare const readInstance: (dir: string) => InstanceGraph;
/**
 * @param {string} cwd
 * @param {{ range?: string | undefined; since?: string | undefined }} [options]
 * @returns {Commit[]}
 */
export declare function logOf(cwd: string, { range, since }?: {
    range?: string | undefined;
    since?: string | undefined;
}): Commit[];
/**
 * @param {string} cwd
 * @param {string} messageFile
 * @returns {{ name: string; email: string; trailers: Trailers }}
 */
export declare function pendingOf(cwd: string, messageFile: string): {
    name: string;
    email: string;
    trailers: Trailers;
};
export type PageChange = {
    before: string;
    after: string;
    beforeText: string;
    afterText: string;
};
/**
 * A page a range modified or renamed: its path and text at the range's base and at its head.
 * @typedef {{ before: string; after: string; beforeText: string; afterText: string }} PageChange
 */
/**
 * @param {string} cwd
 * @param {string} rel
 * @returns {number | null}
 */
export declare function firstCommitMsOf(cwd: string, rel: string): number | null;
export type DeletedPage = {
    before: string;
    beforeText: string;
};
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {PageChange[]}
 */
export declare function changedPagesOf(cwd: string, range: string, model?: string): PageChange[];
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {DeletedPage[]}
 */
export declare function deletedPagesOf(cwd: string, range: string, model?: string): DeletedPage[];
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export declare function mergeBaseOf(cwd: string, a: string, b: string): string;
/**
 * @param {string} cwd
 * @param {string} rev
 * @param {string} rel
 * @returns {string[]}
 */
export declare function pageHistoryOf(cwd: string, rev: string, rel: string): string[];
/**
 * @param {string} top
 * @returns {Member[] | null}
 */
export declare function familyOf(top: string): Member[] | null;
