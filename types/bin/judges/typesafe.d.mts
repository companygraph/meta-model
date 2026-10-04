import type { Request, Answers } from "../../lib/questions.mjs";
export declare const SERVICE: {
    name: string;
    model: string;
};
export declare const endpoint: () => import("url").URL;
export declare const isTypeSafe: () => boolean;
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
 * @param {Request[]} requests
 * @param {{ host?: string; model?: string }} [at]
 * @returns {string}
 */
export declare function digestOf(requests: Request[], { host, model }?: {
    host?: string;
    model?: string;
}): string;
/**
 * @param {Request} request
 * @param {unknown} body
 * @returns {Answers}
 */
export declare function fromWire(request: Request, body: unknown): Answers;
export declare class KeyRefused extends Error {
    constructor();
}
export declare const REQUEST_BUDGET = 150000;
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
export declare function ask(request: Request, options: {
    key: string;
    fetch?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    attempts?: number;
}): Promise<Answers>;
