/**
 * @param {Map<string, string | Uint8Array>} model every file under the instance's model/, keyed by its path from the instance root; a page as text, any other file as the bytes it is
 * @returns {null | { error: string } | { writes: Map<string, string | Uint8Array>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export declare function migratedSeats(model: Map<string, string | Uint8Array>): null | {
    error: string;
} | {
    writes: Map<string, string | Uint8Array>;
    removes: string[];
    moved: [string, string][];
    rewritten: string[];
};
/**
 * Whether a path from the instance root is the owner's own to edit: not under the vendored units
 * folder, wherever its value nests it, and not under the installed packages or a build.
 * @param {string} path
 * @param {string} units
 * @returns {boolean}
 */
export declare const isInstancesOwn: (path: string, units: string) => boolean;
/**
 * After the roles moved to seats, the instance's own files that still say roles: the paths a text
 * names (`roles/`, `roles.md`) and the count a page draws (`{{count:Roles}}`), and the seats
 * README, which the owner wrote about roles, where it still uses the word. Pure: the caller
 * reads the texts and says which files to read (the command line reads the ones git lists, an
 * editor its vault's), and anything the units folder, installed packages or a build holds is
 * left out whatever it is given. Named and never rewritten, since each is the owner's own text.
 * @param {Map<string, string>} files the instance's files as text, keyed by their path from the instance root
 * @param {string} units the units folder the manifest names
 * @returns {string[]} the paths that still name roles, sorted
 */
export declare function stillNamingRoles(files: Map<string, string>, units: string): string[];
