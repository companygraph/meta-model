import type { PageChange } from "./history.mjs";
/** @import { PageChange } from "./history.mjs" */
export declare const LANGUAGE_TAG: RegExp;
/** @param {string} text */
export declare const withoutFrontmatter: (text: string) => string;
export type Localization = {
    error: string;
    primary?: undefined;
    translated?: undefined;
} | {
    error?: undefined;
    primary: string;
    translated: string[];
};
export type LanguageSections = {
    primary: string;
    sections: Map<string, string>;
    order: string[];
    after: string[];
};
/**
 * What model/localization.md declares, or why it cannot be read.
 * @typedef {{ error: string; primary?: undefined; translated?: undefined }
 *   | { error?: undefined; primary: string; translated: string[] }} Localization
 */
/**
 * A page's body cut at its language sections: see languageSectionsOf.
 * @typedef {object} LanguageSections
 * @property {string} primary
 * @property {Map<string, string>} sections
 * @property {string[]} order
 * @property {string[]} after
 */
/**
 * @param {string} text
 * @returns {Localization}
 */
export declare function localizationOf(text: string): Localization;
/**
 * @param {string} body
 * @param {{ tags?: string[] }} [options]
 * @returns {LanguageSections}
 */
export declare function languageSectionsOf(body: string, { tags }?: {
    tags?: string[];
}): LanguageSections;
/**
 * @param {PageChange[]} changes
 * @param {string[]} translated
 * @param {Set<string>} released
 * @returns {string[]}
 */
export declare function staleTranslationsOf(changes: PageChange[], translated: string[], released: Set<string>): string[];
/**
 * @param {string} section
 * @returns {string}
 */
export declare function asPage(section: string): string;
/**
 * @param {string} primary
 * @returns {Map<string, string>}
 */
export declare function primaryElementsOf(primary: string): Map<string, string>;
/**
 * @param {string} section
 * @returns {Map<string, string>}
 */
export declare function translationElementsOf(section: string): Map<string, string>;
