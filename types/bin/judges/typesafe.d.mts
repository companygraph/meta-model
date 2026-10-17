import type { Request, Answers } from "../../lib/questions.mjs";
export declare const SERVICE: {
    name: string;
    model: string;
    usdPerMtok: number;
};
export declare const CHARS_PER_TOKEN = 3.656;
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
 * @param {{ url?: string; model?: string }} [at]
 * @returns {string}
 */
export declare function digestOf(requests: Request[], { url, model }?: {
    url?: string;
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
 * @param {number} tokens
 * @returns {number}
 */
export declare const costOf: (tokens: number) => number;
/**
 * @param {Request[]} requests
 * @returns {{ requests: number; tokens: number; usd: number }}
 */
export declare function forecastOf(requests: Request[]): {
    requests: number;
    tokens: number;
    usd: number;
};
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number; onUsage?: (usage: { input_tokens?: number; output_tokens?: number }) => void }} options
 * @returns {Promise<Answers>}
 */
export declare function ask(request: Request, options: {
    key: string;
    fetch?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    attempts?: number;
    onUsage?: (usage: {
        input_tokens?: number;
        output_tokens?: number;
    }) => void;
}): Promise<Answers>;
