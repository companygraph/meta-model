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
