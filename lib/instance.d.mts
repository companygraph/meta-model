export type Fields = Record<string, string | string[]>;
export interface Table {
    caption: string | null;
    columns: string[];
    rows: string[][];
}
export interface Section {
    heading: string;
    text: string;
    tables: Table[];
    table?: Table;
}
export interface Stamp {
    kind: string | null;
    start: string | null;
    end: string | null;
}
export interface Entity {
    id: string;
    type: string;
    name: string;
    tagline: string;
    fields: Fields;
    sections: Section[];
    owner: string | null;
    path: string;
    stamp?: Stamp;
}
export interface Edge {
    from: string;
    to: string;
    via: string;
    attrs: Record<string, string>;
}
export interface GraphType {
    type: string;
    folder: string | null;
    owner: string | null;
    singular?: boolean;
}
export interface Graph {
    commit: string | null;
    root: string;
    rootId: string | null;
    types: GraphType[];
    entities: Entity[];
    edges: Edge[];
}
export interface InstanceGraph extends Graph {
    core: string | null;
    rootId: string;
}
export type Files = Map<string, string>;
export type InstanceFiles = Map<string, string | Uint8Array>;
export type Declaration = {
    form: "ref" | "ref?" | "qualifier";
    target: string;
    by?: undefined;
    in?: undefined;
} | {
    form: "ref";
    target: null;
    by: string;
    in: string | null;
};
export interface Declarations {
    fields: Map<string, Declaration>;
    tables: Map<string, Map<string, Declaration>>;
    headings: Map<string, {
        name: string;
        decl: Declaration;
    }>;
}
export interface RowEntity {
    type: string;
    name: string;
    path: string;
    id?: string;
}
export type RowError = {
    error: string;
    subject: "value" | "owner";
};
export interface Image {
    id: string;
    field: string;
    from: string;
    to: string;
    bytes: Uint8Array;
}
export interface Constraints {
    references: {
        via: string;
        form: Declaration["form"];
        target: string | null;
        by: string | null;
        in: string | null;
        array: boolean;
        required: boolean;
        min: number;
        max: number | null;
    }[];
    enums: {
        via: string;
        tokens: string[];
        required: boolean;
    }[];
    joins: ({
        kind: "under";
        section: string;
        under: string;
    } | {
        kind: "lists";
        section: string;
        column: string;
        field: string;
        by: string;
    } | {
        kind: "roles";
        section: string;
        column: string;
        by: string;
    })[];
    lists: {
        section: string;
        kind: "Bulleted" | "Numbered";
        required: boolean;
        min: number;
    }[];
}
export declare const CORE_LABEL = "Core";
export declare function parseInstance(files: InstanceFiles, { sub, schemas }?: {
    sub?: string;
    schemas?: Files;
}): InstanceGraph;
export declare function declarationOf(cell: string | undefined): Declaration | null;
export declare function parseSchemas(files: Files, { sub }?: {
    sub?: string;
}): Graph;
export declare function ownerTypesOf(schemas: Files): Map<string, string>;
export declare function rowScope<E extends RowEntity>(entities: E[], schemas: Files, { type, owner }?: {
    type?: string;
    owner?: string;
}): {
    within: E[];
    error?: undefined;
    subject?: undefined;
} | (RowError & {
    within?: undefined;
});
export declare function resolveRow<E extends RowEntity>(entities: E[], schemas: Files, { type, name, owner }?: {
    type?: string;
    name?: string;
    owner?: string;
}): {
    entity: E;
    error?: undefined;
    subject?: undefined;
} | (RowError & {
    entity?: undefined;
});
export declare function listsDeclarationOf(description: string | undefined): {
    field: string;
    by: string;
} | null;
export declare function underDeclarationOf(description: string | undefined): {
    under: string;
} | null;
export declare function listKindOf(description: string | undefined): {
    kind: "Bulleted" | "Numbered";
    after: "Table" | "Grouped" | null;
} | null;
export declare function enumTokensOf(description: string): string[];
export declare const IMAGE_FILE: RegExp;
export declare const bytesOf: (value: unknown) => Uint8Array | null;
export declare function imagesOf(files: InstanceFiles, data: {
    entities: Entity[];
}, { sub, schemas }?: {
    sub?: string;
    schemas?: Files;
}): Image[];
export declare function constraintsOf(files: Files, { sub }?: {
    sub?: string;
}): Record<string, Constraints>;
