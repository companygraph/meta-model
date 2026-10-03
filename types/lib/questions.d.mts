import type { Files, InstanceFiles, InstanceGraph } from "./instance.mjs";
export type RuleQuestion = {
    id: string;
    kind: "rule";
    rule: string;
};
export type GroupQuestion = {
    id: string;
    kind: "group";
    section: string;
    heading: string | null;
    bullet: string;
    options: Record<string, Record<string, string>>;
};
export type Question = RuleQuestion | GroupQuestion;
export type Request = {
    path: string;
    type: string;
    name: string;
    state: {
        purpose: string;
        entity: string;
    };
    questions: Question[];
};
export type NotAsked = {
    path: string;
    why: string;
};
export type Questions = {
    asked: Request[];
    notAsked: NotAsked[];
};
/** @import { Files, InstanceFiles, InstanceGraph, Entity } from "./instance.mjs" */
/**
 * @typedef {{ id: string; kind: "rule"; rule: string }} RuleQuestion
 * @typedef {{ id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }} GroupQuestion
 * @typedef {RuleQuestion | GroupQuestion} Question
 * @typedef {{ path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }} Request
 * @typedef {{ path: string; why: string }} NotAsked
 * @typedef {{ asked: Request[]; notAsked: NotAsked[] }} Questions
 */
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
export declare const STATE_BUDGET = 100000;
/**
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {Questions}
 */
export declare function questionsOf({ graph, files, schemas }: {
    graph: InstanceGraph;
    files: InstanceFiles;
    schemas: Files;
}): Questions;
