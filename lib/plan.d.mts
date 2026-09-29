import type { Files } from "./instance.mts";
export interface InitAsk {
    core: Files;
    skills?: Files | undefined;
    tooling: string;
    tag: string;
    name?: string | undefined;
    agent: string;
    units?: string | undefined;
    folders?: string[] | undefined;
    present?: Set<string> | undefined;
    fetched?: boolean | undefined;
    hook?: boolean | undefined;
}
export type InitPlan = {
    refused: string;
    writes?: undefined;
} | {
    refused?: undefined;
    writes: Map<string, string>;
};
export interface UpgradeAsk {
    core: Files;
    skills?: Files | undefined;
    tooling: string;
    tag: string;
    manifest: {
        files?: Record<string, string>;
        units?: string;
        core?: {
            version?: string;
        };
        tooling?: string;
    };
    held: Map<string, string | undefined>;
    workflow: string | null;
    fetched?: boolean | undefined;
    force?: boolean | undefined;
    name?: string | undefined;
    present?: Set<string> | undefined;
}
export interface UpgradeWrites {
    refused?: undefined;
    writes: Map<string, string>;
    removes: string[];
    edited: string[];
    missing: string[];
    given: string[];
    from: string;
    to: string;
}
export type UpgradePlan = {
    refused: string;
} | UpgradeWrites;
export declare const AGENTS: string[];
export declare const SKILLS = ".claude/skills/";
export declare function initPlan({ core, skills, tooling, tag, name, agent, units, folders, present, fetched, hook }: InitAsk): InitPlan;
export declare function upgradePlan({ core, skills, tooling, tag, manifest, held, workflow, fetched, force, name, present }: UpgradeAsk): UpgradePlan;
