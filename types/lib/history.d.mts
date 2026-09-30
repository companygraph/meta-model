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
/**
 * @param {string} top
 * @returns {Member[] | null}
 */
export declare function familyOf(top: string): Member[] | null;
