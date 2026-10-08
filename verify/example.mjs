// How the example instance is read. The example has no manifest, so this is the one place it
// declares which packs it takes; every check and test that reads the example goes through here,
// so a pack added to the example is added once and no reader is left on core alone (R13).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const EXAMPLE_PACKS = ["organization"];

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The packs as the instance checks take them: `{ name, dir }`, the dir relative to the repository. */
export const examplePacks = EXAMPLE_PACKS.map((name) => ({ name, dir: `packs/${name}` }));

const schemaFiles = (rel) =>
  fs.readdirSync(`${ROOT}${rel}`).filter((f) => f.endsWith("-schema.md")).map((f) => [f, fs.readFileSync(`${ROOT}${rel}/${f}`, "utf8")]);

/**
 * What the parser reads the example against: core's schemas keyed `<type>-schema.md`, and each
 * pack's keyed `<pack>/<type>-schema.md`. Core's manifest rides along as the callers expect it.
 */
export const exampleSchemas = () => {
  const schemas = new Map(schemaFiles("core"));
  schemas.set("manifest.json", fs.readFileSync(`${ROOT}core/manifest.json`, "utf8"));
  for (const { name, dir } of examplePacks) for (const [f, text] of schemaFiles(dir)) schemas.set(`${name}/${f}`, text);
  return schemas;
};
