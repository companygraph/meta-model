/**
 * @param {Map<string, string>} model every file under the instance's model/, keyed by its path from the instance root
 * @returns {null | { error: string } | { writes: Map<string, string>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export declare function migratedSeats(model: Map<string, string>): null | {
    error: string;
} | {
    writes: Map<string, string>;
    removes: string[];
    moved: [string, string][];
    rewritten: string[];
};
