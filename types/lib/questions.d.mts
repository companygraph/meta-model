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
export type Skipped = {
    path: string;
    type: string;
    id: string;
    rule: string;
    without: string;
};
export type Questions = {
    asked: Request[];
    notAsked: NotAsked[];
    skipped: Skipped[];
};
export type Subjects = {
    sections: Set<string>;
    columns: Map<string, string[]>;
    fields: Set<string>;
    label: string | null;
};
export type Opening = {
    kind: "section" | "field" | "column" | "fixed";
    name: string;
};
export type Subject = {
    sections: string[];
    column: string | null;
    field: string | null;
};
export type Seen = {
    type: string;
    id: string;
    rule: string;
    ps: number[];
    lacked: Map<string, number>;
};
export type RuleAnswer = {
    p: number;
};
export type GroupAnswer = {
    pick: string;
    probabilities: Record<string, number>;
};
export type Answers = Record<string, RuleAnswer | GroupAnswer>;
export type Failed = {
    error: string;
};
export type Band = {
    low: number;
    high: number;
    pick: number;
};
/** @import { Files, InstanceFiles, InstanceGraph, Entity } from "./instance.mjs" */
/**
 * @typedef {{ id: string; kind: "rule"; rule: string }} RuleQuestion
 * @typedef {{ id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }} GroupQuestion
 * @typedef {RuleQuestion | GroupQuestion} Question
 * @typedef {{ path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }} Request
 * @typedef {{ path: string; why: string }} NotAsked
 * @typedef {{ path: string; type: string; id: string; rule: string; without: string }} Skipped
 * @typedef {{ asked: Request[]; notAsked: NotAsked[]; skipped: Skipped[] }} Questions
 * @typedef {{ sections: Set<string>; columns: Map<string, string[]>; fields: Set<string>; label: string | null }} Subjects
 * @typedef {{ kind: "section" | "field" | "column" | "fixed"; name: string }} Opening
 * @typedef {{ sections: string[]; column: string | null; field: string | null }} Subject
 * @typedef {{ type: string; id: string; rule: string; ps: number[]; lacked: Map<string, number> }} Seen
 */
/**
 * @typedef {{ p: number }} RuleAnswer
 * @typedef {{ pick: string; probabilities: Record<string, number> }} GroupAnswer
 * @typedef {Record<string, RuleAnswer | GroupAnswer>} Answers
 * @typedef {{ error: string }} Failed
 * @typedef {{ low: number; high: number; pick: number }} Band
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
 * @param {string} schemaText
 * @returns {Subjects}
 */
export declare function subjectsOf(schemaText: string): Subjects;
/**
 * @param {string} rule
 * @param {Subjects} subjects
 * @returns {Subject | null}
 */
export declare function subjectOf(rule: string, subjects: Subjects): Subject | null;
/**
 * @param {string} sectionText
 * @returns {{ heading: string | null; bullet: string }[]}
 */
export declare function bulletsOf(sectionText: string): {
    heading: string | null;
    bullet: string;
}[];
export declare const STATE_BUDGET = 90000;
/**
 * @param {string} rule
 * @param {Subjects} subjects
 * @returns {Opening | null}
 */
export declare function openingOf(rule: string, subjects: Subjects): Opening | null;
/**
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {Questions}
 */
export declare function questionsOf({ graph, files, schemas }: {
    graph: InstanceGraph;
    files: InstanceFiles;
    schemas: Files;
}): Questions;
/**
 * @param {Skipped[]} skipped
 * @returns {string[]}
 */
export declare function leftOutOf(skipped: Skipped[]): string[];
export declare const BAND: Band | null;
export declare const LOWEST = 3;
/**
 * @param {Questions} questions
 * @param {Map<string, Answers | Failed>} answers
 * @param {{ band?: Band | null; hashOf?: (request: Request, question: RuleQuestion) => string }} [options]
 * @returns {string[]}
 */
export declare function reportOf({ asked, notAsked, skipped }: Questions, answers: Map<string, Answers | Failed>, { band, hashOf }?: {
    band?: Band | null;
    hashOf?: (request: Request, question: RuleQuestion) => string;
}): string[];
