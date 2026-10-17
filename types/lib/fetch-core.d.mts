/**
 * @param {string} tag
 * @param {Get} [get]
 * @returns {Promise<Map<string, string>>}
 */
export declare function fetchCore(tag: string, get?: Get): Promise<Map<string, string>>;
export type Get = (url: string) => Promise<{
    ok: boolean;
    status?: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;
/**
 * What the fetch is asked for and answers with: the part of `fetch` this reads.
 * @typedef {(url: string) => Promise<{ ok: boolean; status?: number; arrayBuffer(): Promise<ArrayBuffer> }>} Get
 */
