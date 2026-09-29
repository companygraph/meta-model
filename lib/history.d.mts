import type { InstanceGraph } from "./instance.mts";
import type { Trailers } from "./seats.mts";
export interface Commit {
    sha: string;
    name: string;
    email: string;
    subject: string;
    trailers: Trailers;
}
export interface Member {
    repo: string;
    path: string;
}
export declare function gitTop(dir: string): string | null;
export declare const isInstance: (dir: string) => boolean;
export declare function readInstance(dir: string): InstanceGraph;
export declare function logOf(cwd: string, { range, since }?: {
    range?: string | undefined;
    since?: string | undefined;
}): Commit[];
export declare function pendingOf(cwd: string, messageFile: string): {
    name: string;
    email: string;
    trailers: Trailers;
};
export declare function familyOf(top: string): Member[] | null;
