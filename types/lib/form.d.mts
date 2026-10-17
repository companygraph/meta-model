export declare const FORM_VERSION = "0.23.2";
export declare const FORM_CONFIG: string;
/**
 * Every Markdown file under `root` the form holds, relative to it with `/`, sorted: all but the
 * folders above, the paths in `exclude`, and what git ignores, which is scratch and not the
 * repository's Markdown. A file that is new and not ignored is read, since it is on its way in.
 * @param {string} root
 * @param {string[]} [exclude]
 * @returns {string[]}
 */
export declare function markdownFilesOf(root: string, exclude?: string[]): string[];
/** @returns {{ command: string; args: string[] }} */
export declare function linterOf(): {
    command: string;
    args: string[];
};
/**
 * The environment the linter is started with: `env` without the variables an outer `npm exec`
 * set for its own command, so a nested npx resolves the package it is given, whatever started
 * the tooling. Names are matched without case, as Windows reads its environment.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export declare function linterEnvOf(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
/**
 * The form over a repository: the files it held, one hit per rule and line as `path:line: RULE`,
 * and `error` when the tool could not be run or failed without naming a file. With `fix`, every
 * hit markdownlint can write is written first, in three passes at most, since two fixes on one
 * line are applied one per pass.
 * @param {string} root
 * @param {{ exclude?: string[]; fix?: boolean }} [options]
 * @returns {{ files: number; hits: string[]; error?: string }}
 */
export declare function formCheck(root: string, { exclude, fix }?: {
    exclude?: string[];
    fix?: boolean;
}): {
    files: number;
    hits: string[];
    error?: string;
};
/**
 * Texts put into the form, each as `formCheck` with `fix` would write it, for a comparison that
 * should not read a change the form makes anyway as a change: the decision and label checks of a
 * range compare a page's two sides this way. Every text is written into one fresh folder and
 * fixed in one run of the tool, so a range costs one start of it however many pages it compares,
 * and no repository's configuration is read. The keys are the caller's and come back unchanged;
 * the files are named by their place in the map, so a key need be no path. Where the tool cannot
 * run, or fails without fixing, the texts come back as they were with `error` saying why, and
 * the caller compares them as written. `linter` is how the tool is run, `linterOf()` unless given.
 * @param {Map<string, string>} texts
 * @param {{ linter?: { command: string; args: string[] } }} [options]
 * @returns {{ formatted: Map<string, string>; error?: string }}
 */
export declare function formattedOf(texts: Map<string, string>, { linter }?: {
    linter?: {
        command: string;
        args: string[];
    };
}): {
    formatted: Map<string, string>;
    error?: string;
};
