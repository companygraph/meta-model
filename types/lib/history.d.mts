import type { InstanceGraph } from "./instance.mjs";
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
 * @returns {InstanceGraph}
 */
export declare function readInstance(dir: string): InstanceGraph;
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
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {PageChange[]}
 */
export declare function changedPagesOf(cwd: string, range: string, model?: string): PageChange[];
/**
 * @param {string} cwd
 * @param {string} rev
 * @returns {boolean}
 */
export declare function isCommit(cwd: string, rev: string): boolean;
/**
 * @param {string} cwd
 * @param {string} rev
 * @param {string} path
 * @returns {string | null}
 */
export declare function fileAt(cwd: string, rev: string, path: string): string | null;
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export declare function mergeBaseOf(cwd: string, a: string, b: string): string;
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} key
 * @returns {string[]}
 */
export declare function trailerValuesOf(cwd: string, range: string, key: string): string[];
/**
 * @param {string} top
 * @returns {Member[] | null}
 */
export declare function familyOf(top: string): Member[] | null;
