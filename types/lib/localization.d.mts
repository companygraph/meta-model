export declare const LANGUAGE_TAG: RegExp;
export type Localization = {
    error: string;
    primary?: undefined;
    translated?: undefined;
} | {
    error?: undefined;
    primary: string;
    translated: string[];
};
/**
 * What model/localization.md declares, or why it cannot be read.
 * @typedef {{ error: string; primary?: undefined; translated?: undefined }
 *   | { error?: undefined; primary: string; translated: string[] }} Localization
 */
/**
 * @param {string} text
 * @returns {Localization}
 */
export declare function localizationOf(text: string): Localization;
