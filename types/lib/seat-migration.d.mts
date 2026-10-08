/**
 * @param {Map<string, string | Buffer>} model every file under the instance's model/, keyed by its path from the instance root; a page as text, any other file as the bytes it is
 * @returns {null | { error: string } | { writes: Map<string, string | Buffer>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export declare function migratedSeats(model: Map<string, string | Buffer>): null | {
    error: string;
} | {
    writes: Map<string, string | Buffer>;
    removes: string[];
    moved: [string, string][];
    rewritten: string[];
};
