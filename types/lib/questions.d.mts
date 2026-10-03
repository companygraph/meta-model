/**
 * @param {string} schemaText
 * @returns {string[]}
 */
export declare function writingRulesOf(schemaText: string): string[];
/**
 * @param {string} schemaText
 * @returns {string}
 */
export declare const purposeOf: (schemaText: string) => string;
/**
 * @param {string} sectionText
 * @returns {{ heading: string | null; bullet: string }[]}
 */
export declare function bulletsOf(sectionText: string): {
    heading: string | null;
    bullet: string;
}[];
