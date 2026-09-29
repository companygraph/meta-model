import { spawnSync } from "node:child_process";
export interface CommunityPlugin {
    id: string;
    name: string;
    repo: string;
    what?: string;
    needs?: string;
}
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
export interface Machine {
    platform?: string;
    env?: Record<string, string | undefined>;
    exists?: (path: string) => boolean;
}
export declare const ID = "companygraph";
export declare const FILES: string[];
export declare const PLUGINS: CommunityPlugin[];
export declare function newestRelease(fetchImpl?: Fetch, plugin?: CommunityPlugin): Promise<string>;
export declare function download(release: string, fetchImpl?: Fetch, plugin?: CommunityPlugin): Promise<PluginFiles>;
export declare function readLocal(dir: string): PluginFiles;
export declare function installed(vault: string, plugin?: CommunityPlugin): {
    release: string | null;
    enabled: boolean;
    list: string[];
};
export declare function place(vault: string, files: PluginFiles, plugin?: CommunityPlugin): {
    folder: string;
    from: string | null;
    to: string;
    enabled: boolean;
};
export declare function graphOf(folders: string[]): string;
export declare function workspaceOf({ file, plugins }: {
    file: string;
    plugins: string[];
}): string;
export declare function settle(vault: string, name: string, text: string, { force }?: {
    force?: boolean | undefined;
}): "kept" | "written";
export declare const DOWNLOAD = "https://obsidian.md/download";
export declare function whereObsidian({ platform, env, exists }?: Machine): {
    app: string | null;
    installer: {
        name: string;
        command: string[];
    } | null;
    download: string;
};
export declare function knownVault(vault: string, { platform, env, exists, read }?: Machine & {
    read?: (path: string) => string;
}): boolean;
export declare function registerVault(vault: string, { platform, env, exists, read, write, mkdir }?: Machine & {
    read?: (path: string) => string;
    write?: (path: string, text: string) => void;
    mkdir?: (path: string) => unknown;
}): string;
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
export declare function obsidianRunning({ platform, run }?: {
    platform?: string;
    run?: typeof spawnSync;
}): boolean;
export declare const vaultUrl: (vault: string) => string;
export declare function openVault(vault: string, { platform, run }?: {
    platform?: string;
    run?: typeof spawnSync;
}): string;
