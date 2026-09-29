import type { Entity } from "./instance.mts";
export declare const SEATS_SINCE = "2026-09-28";
export interface Trailers {
    process: string[];
    phase: string[];
    track: string[];
}
export interface Governing {
    name: string;
    domain: string | null;
    people: Set<string>;
    roles: Map<string, string>;
    processes: Map<string, {
        phases: Map<string, string[]>;
        tracks: Set<string>;
    }>;
}
export type SeatJudgment = {
    kind: "seat";
    seat: string | null;
    process?: string | null;
    phase?: string | null;
    track?: string | null;
    failures: string[];
};
export type Judgment = {
    kind: "owner" | "outside";
    failures: string[];
} | SeatJudgment;
export interface Judged {
    email: string;
    name?: string;
    ownerName?: string;
    judgement: Judgment;
}
export interface SeatRow {
    seat: string | null;
    email: string;
    commits: number;
    by: {
        where: string;
        commits: number;
    }[];
}
export interface Tally {
    seats: SeatRow[];
    owner: number;
    outside: number;
    refused: number;
}
export declare const seatAddress: (role: string, domain: string) => string;
export declare function domainOf(url: string): string | null;
export declare function governingOf({ entities }: {
    entities: Entity[];
}): Governing;
export declare function judgeCommit(governing: Governing, { email, trailers }: {
    email?: string | null;
    trailers: Partial<Trailers>;
}): Judgment;
export declare function tally(judged: Judged[], reporting?: Governing | null): Tally;
export declare function renderReport({ scope, since, read, unread, seats, owner, outside, refused }: Tally & {
    scope: "family" | "repository";
    since: string | null | undefined;
    read: string[];
    unread: {
        repo: string;
        path?: string;
        reason?: string;
    }[];
}): string;
