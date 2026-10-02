/**
 * How each kind reads the value its line pins, and whether that value is a tag or a commit.
 * @type {Record<string, { byTag: boolean; read: (text: string, repo: string) => string[] }>}
 */
export declare const KINDS: Record<string, {
    byTag: boolean;
    read: (text: string, repo: string) => string[];
}>;
export declare const FAMILY_KINDS: Set<string>;
export declare const SCANNED: string[];
/**
 * The pins a file holds, whether or not pins.json declares them.
 * @param {string} file
 * @param {string} text
 * @returns {{ kind: string; file: string; repo: string }[]}
 */
export declare function discover(file: string, text: string): {
    kind: string;
    file: string;
    repo: string;
}[];
/**
 * A parsed pins.json, held to the shape PINS.md gives it; throws, naming the entry, where it is not.
 * `move`, `after`, `watch`, `verify` and `release` are the resync's and are not read here.
 * @param {unknown} obj
 * @returns {{ pins: { kind: string; file: string; repo: string }[] }}
 */
export declare function validatePins(obj: unknown): {
    pins: {
        kind: string;
        file: string;
        repo: string;
    }[];
};
/**
 * The highest `vMAJOR.MINOR.PATCH` tag among `tags`, or null where there is none.
 * @param {string[]} tags
 * @returns {string | null}
 */
export declare function newestTag(tags: string[]): string | null;
export type Remote = {
    tags: string[];
    head: string | null;
} | null;
export type PinLine = {
    status: "current" | "behind" | "unknown" | "unmanaged" | "family" | "missing";
    kind: string;
    file: string;
    repo: string;
    pinned: string[];
    newest?: string;
};
/**
 * @typedef {{ tags: string[]; head: string | null } | null} Remote
 * @typedef {{ status: "current" | "behind" | "unknown" | "unmanaged" | "family" | "missing"; kind: string; file: string; repo: string; pinned: string[]; newest?: string }} PinLine
 */
/**
 * Every pin declared, in pins.json's order, then every pin found and not declared. `remote` is asked
 * once per upstream, and only for a declared pin of a kind this reads.
 * @param {{ declared: { pins: { kind: string; file: string; repo: string }[] }; texts: Record<string, string>; remote: (repo: string) => Remote }} ask
 * @returns {{ lines: PinLine[]; failed: boolean }}
 */
export declare function pinReport({ declared, texts, remote }: {
    declared: {
        pins: {
            kind: string;
            file: string;
            repo: string;
        }[];
    };
    texts: Record<string, string>;
    remote: (repo: string) => Remote;
}): {
    lines: PinLine[];
    failed: boolean;
};
/**
 * What an upstream on GitHub offers now: its tags and its HEAD, through `git ls-remote` without
 * cloning, or null where it cannot be reached. Git is told never to ask for credentials, since a
 * private or mistyped repository would otherwise wait at a prompt nobody sees.
 * @param {string} repo
 * @returns {Remote}
 */
export declare function lsRemote(repo: string): Remote;
