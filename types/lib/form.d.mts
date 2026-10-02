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
