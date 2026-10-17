/** @import { Entity } from "./instance.mjs" */
import type { Entity } from "./instance.mjs";
export declare const SEATS_SINCE = "2026-09-28";
export type Trailers = {
    process: string[];
    phase: string[];
    track: string[];
};
export type Governing = {
    name: string;
    domain: string | null;
    people: Set<string>;
    seats: Map<string, string>;
    processes: Map<string, {
        phases: Map<string, string[]>;
        tracks: Set<string>;
    }>;
};
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
export type Judged = {
    email: string;
    name?: string;
    ownerName?: string;
    judgement: Judgment;
};
export type SeatRow = {
    seat: string | null;
    email: string;
    commits: number;
    by: {
        where: string;
        commits: number;
    }[];
};
export type Tally = {
    seats: SeatRow[];
    owner: number;
    outside: number;
    refused: number;
};
/**
 * A commit's Process, Phase and Track trailers, each as every value git read for it.
 * @typedef {object} Trailers
 * @property {string[]} process
 * @property {string[]} phase
 * @property {string[]} track
 */
/**
 * The governing instance as the judge reads it: whose seats these are, the domain their addresses
 * sit at, the people who commit as themselves, every seat by its address, and every process with
 * its phases' `executed-by` and its tracks.
 * @typedef {object} Governing
 * @property {string} name
 * @property {string | null} domain
 * @property {Set<string>} people
 * @property {Map<string, string>} seats
 * @property {Map<string, { phases: Map<string, string[]>; tracks: Set<string> }>} processes
 */
/**
 * What judgeCommit says of one commit: the owner's, outside the model, or a seat's, with what
 * the check refuses about it.
 * @typedef {{ kind: "seat"; seat: string | null; process?: string | null; phase?: string | null; track?: string | null; failures: string[] }} SeatJudgment
 */
/** @typedef {{ kind: "owner" | "outside"; failures: string[] } | SeatJudgment} Judgment */
/**
 * A judged commit as tally counts it: its author, the governing identity's name, the judgement.
 * @typedef {object} Judged
 * @property {string} email
 * @property {string} [name]
 * @property {string} [ownerName]
 * @property {Judgment} judgement
 */
/**
 * One seat's line of the report.
 * @typedef {object} SeatRow
 * @property {string | null} seat
 * @property {string} email
 * @property {number} commits
 * @property {{ where: string; commits: number }[]} by
 */
/**
 * @typedef {object} Tally
 * @property {SeatRow[]} seats
 * @property {number} owner
 * @property {number} outside
 * @property {number} refused
 */
/** @type {(seat: string, domain: string) => string} */
export declare const seatAddress: (seat: string, domain: string) => string;
/**
 * @param {string} url
 * @returns {string | null}
 */
export declare function domainOf(url: string): string | null;
/**
 * @param {{ entities: Entity[] }} instance
 * @returns {Governing}
 */
export declare function governingOf({ entities }: {
    entities: Entity[];
}): Governing;
/**
 * @param {Governing} governing
 * @param {{ email?: string | null; trailers: Partial<Trailers> }} commit
 * @returns {Judgment}
 */
export declare function judgeCommit(governing: Governing, { email, trailers }: {
    email?: string | null;
    trailers: Partial<Trailers>;
}): Judgment;
/**
 * @param {Judged[]} judged
 * @param {Governing | null} [reporting]
 * @returns {Tally}
 */
export declare function tally(judged: Judged[], reporting?: Governing | null): Tally;
/**
 * @param {Tally & {
 *   scope: "family" | "repository"; since: string | null | undefined; read: string[];
 *   unread: { repo: string; path?: string; reason?: string }[];
 * }} report
 * @returns {string}
 */
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
