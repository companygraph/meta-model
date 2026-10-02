export declare const LANGUAGE_TAG: RegExp;
export type Localization = {
    error: string;
    locale?: undefined;
} | {
    error?: undefined;
    locale: string;
};
export type Migrated = {
    error: string;
    text?: undefined;
} | {
    error?: undefined;
    text: string;
};
/**
 * The language model/localization.md names, or why it cannot be read.
 * @typedef {{ error: string; locale?: undefined } | { error?: undefined; locale: string }} Localization
 */
/**
 * A localization page in the earlier form, rewritten, or why it cannot be.
 * @typedef {{ error: string; text?: undefined } | { error?: undefined; text: string }} Migrated
 */
/**
 * @param {string} text
 * @returns {Localization}
 */
export declare function localizationOf(text: string): Localization;
/**
 * @param {string} text
 * @returns {Migrated | null}
 */
export declare function migratedLocalization(text: string): Migrated | null;
