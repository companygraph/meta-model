import { spawnSync } from "node:child_process";
export type CommunityPlugin = {
    id: string;
    name: string;
    repo: string;
    what?: string;
    needs?: string;
};
export type PluginFiles = Map<string, Buffer>;
export type Fetch = (url: string, init: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
}) => Promise<{
    ok: boolean;
    status?: number;
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;
export type Machine = {
    platform?: string;
    env?: Record<string, string | undefined>;
    exists?: (path: string) => boolean;
};
/**
 * A plugin the command installs: its id, the name it goes by, its repository, and for a
 * recommended one what it is and what it needs.
 * @typedef {object} CommunityPlugin
 * @property {string} id
 * @property {string} name
 * @property {string} repo
 * @property {string} [what]
 * @property {string} [needs]
 */
/**
 * A release's three files by name, as bytes.
 * @typedef {Map<string, Buffer>} PluginFiles
 */
/**
 * The part of `fetch` this reads, so a test answers from a fixture.
 * @typedef {(url: string, init: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
 *   ok: boolean; status?: number; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer>;
 * }>} Fetch
 */
/**
 * The platform, environment and filesystem a question about Obsidian is asked of, handed in for the tests.
 * @typedef {object} Machine
 * @property {string} [platform]
 * @property {Record<string, string | undefined>} [env]
 * @property {(path: string) => boolean} [exists]
 */
export declare const ID = "companygraph";
export declare const FILES: string[];
/** @type {CommunityPlugin[]} */
export declare const PLUGINS: CommunityPlugin[];
/**
 * @param {Fetch} [fetchImpl]
 * @param {CommunityPlugin} [plugin]
 * @returns {Promise<string>}
 */
export declare function newestRelease(fetchImpl?: Fetch, plugin?: CommunityPlugin): Promise<string>;
/**
 * @param {string} release
 * @param {Fetch} [fetchImpl]
 * @param {CommunityPlugin} [plugin]
 * @returns {Promise<PluginFiles>}
 */
export declare function download(release: string, fetchImpl?: Fetch, plugin?: CommunityPlugin): Promise<PluginFiles>;
/**
 * @param {string} dir
 * @returns {PluginFiles}
 */
export declare function readLocal(dir: string): PluginFiles;
/**
 * @param {string} vault
 * @param {CommunityPlugin} [plugin]
 * @returns {{ release: string | null; enabled: boolean; list: string[] }}
 */
export declare function installed(vault: string, plugin?: CommunityPlugin): {
    release: string | null;
    enabled: boolean;
    list: string[];
};
/**
 * @param {string} vault
 * @param {PluginFiles} files
 * @param {CommunityPlugin} [plugin]
 * @returns {{ folder: string; from: string | null; to: string; enabled: boolean }}
 */
export declare function place(vault: string, files: PluginFiles, plugin?: CommunityPlugin): {
    folder: string;
    from: string | null;
    to: string;
    enabled: boolean;
};
/**
 * @param {string[]} folders
 * @returns {string}
 */
export declare function graphOf(folders: string[]): string;
/**
 * @param {{ file: string; plugins: string[] }} ask
 * @returns {string}
 */
export declare function workspaceOf({ file, plugins }: {
    file: string;
    plugins: string[];
}): string;
/**
 * @param {string} vault
 * @param {string} name
 * @param {string} text
 * @param {{ force?: boolean | undefined }} [options]
 * @returns {"kept" | "written"}
 */
export declare function settle(vault: string, name: string, text: string, { force }?: {
    force?: boolean | undefined;
}): "kept" | "written";
export declare const DOWNLOAD = "https://obsidian.md/download";
/**
 * @param {Machine} [machine]
 * @returns {{ app: string | null; installer: { name: string; command: string[] } | null; download: string }}
 */
export declare function whereObsidian({ platform, env, exists }?: Machine): {
    app: string | null;
    installer: {
        name: string;
        command: string[];
    } | null;
    download: string;
};
/**
 * @param {string} vault
 * @param {Machine & { read?: (path: string) => string }} [machine]
 * @returns {boolean}
 */
export declare function knownVault(vault: string, { platform, env, exists, read }?: Machine & {
    read?: (path: string) => string;
}): boolean;
/**
 * @param {string} vault
 * @param {Machine & {
 *   read?: (path: string) => string; write?: (path: string, text: string) => void; mkdir?: (path: string) => unknown;
 * }} [machine]
 * @returns {string}
 */
export declare function registerVault(vault: string, { platform, env, exists, read, write, mkdir }?: Machine & {
    read?: (path: string) => string;
    write?: (path: string, text: string) => void;
    mkdir?: (path: string) => unknown;
}): string;
/**
 * @param {{
 *   platform?: string; run?: typeof spawnSync; running?: () => boolean; sleep?: (ms: number) => Promise<unknown>; tries?: number;
 * }} [options]
 * @returns {Promise<{ quit: boolean; reason?: string }>}
 */
export declare function quitObsidian({ platform, run, running, sleep, tries }?: {
    platform?: string;
    run?: typeof spawnSync;
    running?: () => boolean;
    sleep?: (ms: number) => Promise<unknown>;
    tries?: number;
}): Promise<{
    quit: boolean;
    reason?: string;
}>;
/**
 * @param {{ platform?: string; run?: typeof spawnSync }} [options]
 * @returns {boolean}
 */
export declare function obsidianRunning({ platform, run }?: {
    platform?: string;
    run?: typeof spawnSync;
}): boolean;
/** @type {(vault: string) => string} */
export declare const vaultUrl: (vault: string) => string;
/**
 * @param {string} vault
 * @param {{ platform?: string; run?: typeof spawnSync }} [options]
 * @returns {string}
 */
export declare function openVault(vault: string, { platform, run }?: {
    platform?: string;
    run?: typeof spawnSync;
}): string;
