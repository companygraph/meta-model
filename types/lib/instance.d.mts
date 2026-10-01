export type Fields = Record<string, string | string[]>;
export type Table = {
    caption: string | null;
    columns: string[];
    rows: string[][];
};
export type Section = {
    heading: string;
    text: string;
    tables: Table[];
    table?: Table;
};
export type Stamp = {
    kind: string | null;
    start: string | null;
    end: string | null;
};
export type Entity = {
    id: string;
    address: string;
    type: string;
    name: string;
    tagline: string;
    fields: Fields;
    sections: Section[];
    owner: string | null;
    path: string;
    stamp?: Stamp;
    translations?: Record<string, Translation>;
};
export type Translation = {
    name: string;
    statement: string;
    sections: Section[];
};
export type Edge = {
    from: string;
    to: string;
    via: string;
    attrs: Record<string, string>;
};
export type GraphType = {
    type: string;
    folder: string | null;
    owner: string | null;
    singular?: boolean;
};
export type Graph = {
    commit: string | null;
    root: string;
    rootId: string | null;
    types: GraphType[];
    entities: Entity[];
    edges: Edge[];
};
export type InstanceGraph = {
    commit: string | null;
    root: string;
    rootId: string;
    types: GraphType[];
    entities: Entity[];
    edges: Edge[];
    core: string | null;
};
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
export type Declarations = {
    fields: Map<string, Declaration>;
    tables: Map<string, Map<string, Declaration>>;
    headings: Map<string, {
        name: string;
        decl: Declaration;
    }>;
};
export type RowEntity = {
    type: string;
    name: string;
    path: string;
    id?: string;
    address?: string;
};
export type RowError = {
    error: string;
    subject: "value" | "owner";
};
export type Image = {
    id: string;
    field: string;
    from: string;
    to: string;
    bytes: Uint8Array;
};
export type Constraints = {
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
};
/**
 * The shapes this file reads and returns. A frontmatter value is a scalar or, for a block
 * sequence (R11), a list of them.
 * @typedef {Record<string, string | string[]>} Fields
 */
/**
 * A table by its header row; `caption` is the line ending in `:` that stands right above it.
 * @typedef {object} Table
 * @property {string | null} caption
 * @property {string[]} columns
 * @property {string[][]} rows
 */
/**
 * A `##` section: its text with the captions pulled out, every table in it, and the first one
 * again as `table` where there is one.
 * @typedef {object} Section
 * @property {string} heading
 * @property {string} text
 * @property {Table[]} tables
 * @property {Table} [table]
 */
/**
 * A period's kind, start and end, as parseInstance attaches them.
 * @typedef {object} Stamp
 * @property {string | null} kind
 * @property {string | null} start
 * @property {string | null} end
 */
/**
 * @typedef {object} Entity
 * @property {string} id
 * @property {string} address
 * @property {string} type
 * @property {string} name
 * @property {string} tagline
 * @property {Fields} fields
 * @property {Section[]} sections
 * @property {string | null} owner
 * @property {string} path
 * @property {Stamp} [stamp]
 * @property {Record<string, Translation>} [translations]
 */
/**
 * A page in one translated language (R19): its name, its statement, and its sections.
 * @typedef {object} Translation
 * @property {string} name
 * @property {string} statement
 * @property {Section[]} sections
 */
/**
 * `via` is the field, `<Section>.<Column>` or `<Section>.<Heading>` that draws the edge; `attrs`
 * holds a row's other cells, or the Type cell in the vocabulary graph.
 * @typedef {object} Edge
 * @property {string} from
 * @property {string} to
 * @property {string} via
 * @property {Record<string, string>} attrs
 */
/**
 * A type as the graph lists it: its folder, null for a singular type, and its owner type.
 * @typedef {object} GraphType
 * @property {string} type
 * @property {string | null} folder
 * @property {string | null} owner
 * @property {boolean} [singular]
 */
/**
 * @typedef {object} Graph
 * @property {string | null} commit
 * @property {string} root
 * @property {string | null} rootId
 * @property {GraphType[]} types
 * @property {Entity[]} entities
 * @property {Edge[]} edges
 */
/**
 * An instance's graph adds the core version it vendors, and always has a root.
 * @typedef {object} InstanceGraph
 * @property {string | null} commit
 * @property {string} root
 * @property {string} rootId
 * @property {GraphType[]} types
 * @property {Entity[]} entities
 * @property {Edge[]} edges
 * @property {string | null} core
 */
/**
 * A map of path → text: the schemas, keyed `<type>-schema.md`, or the pages of an instance.
 * @typedef {Map<string, string>} Files
 */
/**
 * An instance as the checks and the image reader take it: every file, an image as bytes (R9).
 * @typedef {Map<string, string | Uint8Array>} InstanceFiles
 */
/**
 * A declaration names its type, or, in the form `ref → by <Column> in <Owner>` (R4, R9), reads
 * it from its row: `target` is then null, and `by` and `in` name the columns of the same table
 * that carry the type and the owner, `in` null where the form has none.
 * @typedef {{ form: "ref" | "ref?" | "qualifier"; target: string; by?: undefined; in?: undefined }
 *   | { form: "ref"; target: null; by: string; in: string | null }} Declaration
 */
/**
 * A type's declarations: `fields` for frontmatter, `tables` for a section's columns, `headings`
 * for a grouped section's `###` headings.
 * @typedef {object} Declarations
 * @property {Map<string, Declaration>} fields
 * @property {Map<string, Map<string, Declaration>>} tables
 * @property {Map<string, { name: string; decl: Declaration }>} headings
 */
/**
 * The least a row resolver needs of an entity, so a caller that has no parse can pass its own.
 * @typedef {object} RowEntity
 * @property {string} type
 * @property {string} name
 * @property {string} path
 * @property {string} [id]
 * @property {string} [address]
 */
/**
 * @typedef {{ error: string; subject: "value" | "owner" }} RowError
 */
/**
 * An image a page names, read and ready to publish beside the model: see imagesOf.
 * @typedef {object} Image
 * @property {string} id
 * @property {string} field
 * @property {string} from
 * @property {string} to
 * @property {Uint8Array} bytes
 */
/**
 * What the schemas constrain for one type: see constraintsOf.
 * @typedef {object} Constraints
 * @property {{
 *   via: string; form: Declaration["form"]; target: string | null; by: string | null; in: string | null;
 *   array: boolean; required: boolean; min: number; max: number | null;
 * }[]} references
 * @property {{ via: string; tokens: string[]; required: boolean }[]} enums
 * @property {(
 *   | { kind: "under"; section: string; under: string }
 *   | { kind: "lists"; section: string; column: string; field: string; by: string }
 *   | { kind: "roles"; section: string; column: string; by: string }
 * )[]} joins
 * @property {{ section: string; kind: "Bulleted" | "Numbered"; required: boolean; min: number }[]} lists
 */
export declare const CORE_LABEL = "Core";
export declare function parseInstance(files: InstanceFiles, options: {
    sub?: string;
    schemas: Files;
}): InstanceGraph;
/**
 * @param {string | undefined} cell
 * @returns {Declaration | null}
 */
export declare function declarationOf(cell: string | undefined): Declaration | null;
/**
 * @param {Files} files
 * @param {{ sub?: string }} [options]
 * @returns {Graph}
 */
export declare function parseSchemas(files: Files, { sub }?: {
    sub?: string;
}): Graph;
/**
 * @param {Files} schemas
 * @returns {Map<string, string>}
 */
export declare function ownerTypesOf(schemas: Files): Map<string, string>;
/**
 * @template {RowEntity} E
 * @param {E[]} entities
 * @param {Files} schemas
 * @param {{ type?: string; owner?: string }} [options]
 * @returns {{ within: E[]; error?: undefined; subject?: undefined } | (RowError & { within?: undefined })}
 */
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
/**
 * @template {RowEntity} E
 * @param {E[]} entities
 * @param {Files} schemas
 * @param {{ type?: string; name?: string; owner?: string }} [options]
 * @returns {{ entity: E; error?: undefined; subject?: undefined } | (RowError & { entity?: undefined })}
 */
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
/**
 * @param {string | undefined} description
 * @returns {{ field: string; by: string } | null}
 */
export declare function listsDeclarationOf(description: string | undefined): {
    field: string;
    by: string;
} | null;
/**
 * @param {string | undefined} description
 * @returns {{ under: string } | null}
 */
export declare function underDeclarationOf(description: string | undefined): {
    under: string;
} | null;
/**
 * @param {string | undefined} description
 * @returns {{ kind: "Bulleted" | "Numbered"; after: "Table" | "Grouped" | null } | null}
 */
export declare function listKindOf(description: string | undefined): {
    kind: "Bulleted" | "Numbered";
    after: "Table" | "Grouped" | null;
} | null;
/**
 * @param {string} description
 * @returns {string[]}
 */
export declare function enumTokensOf(description: string): string[];
export declare const IMAGE_FILE: RegExp;
/** @type {(value: unknown) => Uint8Array | null} */
export declare const bytesOf: (value: unknown) => Uint8Array | null;
export declare function imagesOf(files: InstanceFiles, data: {
    entities: Entity[];
}, options: {
    sub?: string;
    schemas: Files;
}): Image[];
/**
 * @param {Files} files
 * @param {{ sub?: string }} [options]
 * @returns {Record<string, Constraints>}
 */
export declare function constraintsOf(files: Files, { sub }?: {
    sub?: string;
}): Record<string, Constraints>;
