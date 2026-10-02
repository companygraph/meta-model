export declare const UUIDV7: RegExp;
/**
 * @param {number} [ms]
 * @param {ArrayLike<number>} [random]
 * @returns {string}
 */
export declare function uuidv7(ms?: number, random?: ArrayLike<number>): string;
/** @param {string} id */
export declare const msOf: (id: string) => number;
export type IdFormat = {
    format: "uuidv7" | "pattern";
    test: (id: string) => boolean;
    error?: undefined;
} | {
    error: string;
    format?: undefined;
    test?: undefined;
};
export type Element = {
    kind: "type";
} | {
    kind: "name";
} | {
    kind: "statement";
} | {
    kind: "field";
    key: string;
} | {
    kind: "section";
    heading: string;
} | {
    kind: "column";
    section: string;
    column: string;
} | {
    kind: "enum";
    via: string;
    value: string;
};
/** @param {string} text */
export declare const idOf: (text: string) => string | null;
/**
 * @param {string} text
 * @param {string} id
 * @returns {string}
 */
export declare function withId(text: string, id: string): string;
/**
 * @param {string} text
 * @returns {IdFormat}
 */
export declare function idFormatOf(text: string): IdFormat;
/**
 * @param {string} schemaId
 * @param {Element} element
 * @returns {string}
 */
export declare function addressOf(schemaId: string, element: Element): string;
/**
 * @param {string} address
 * @returns {{ schemaId: string; element: Element }}
 */
export declare function elementOf(address: string): {
    schemaId: string;
    element: Element;
};
