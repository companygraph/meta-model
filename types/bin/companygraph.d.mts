#!/usr/bin/env node
import type { UpgradeWrites } from "../lib/plan.mjs";
export type UpgradeRead = UpgradeWrites | {
    refused: string;
    writes?: undefined;
    removes?: undefined;
    edited?: undefined;
    missing?: undefined;
    given?: undefined;
    from?: undefined;
    to?: undefined;
};
export type Flags = {
    _: string[];
    here?: boolean;
    force?: boolean;
    "dry-run"?: boolean;
    plugins?: boolean;
    "no-plugins"?: boolean;
    open?: boolean;
    json?: boolean;
    "no-hook"?: boolean;
    agent?: string;
    name?: string;
    core?: string;
    schemas?: string;
    folders?: string;
    release?: string;
    from?: string;
    range?: string;
    message?: string;
    since?: string;
};
