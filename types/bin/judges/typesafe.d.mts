/** @import { Request, Answers } from "../../lib/questions.mjs" */
import type { Request, Answers } from "../../lib/questions.mjs";
export declare const SERVICE: {
    name: string;
    host: string;
    model: string;
};
/**
 * @param {Request} request
 */
export declare function toWire(request: Request): {
    model: string;
    state: {
        purpose: string;
        entity: string;
    };
    questions: Record<string, object>;
};
/**
 * @param {Request} request
 * @param {unknown} body
 * @returns {Answers}
 */
export declare function fromWire(request: Request, body: unknown): Answers;
export declare class KeyRefused extends Error {
    constructor();
}
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
export declare function ask(request: Request, { key, fetch, sleep, attempts }: {
    key: string;
    fetch?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    attempts?: number;
}): Promise<Answers>;
