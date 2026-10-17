// The measuring asks the judge about the example's entries with one fault planted against one
// writing rule, and about the same entries without it. These tests hold the faults to that: each
// names exactly one rule of the experience schema, plants on some entry, changes it, and leaves a
// page the parser still reads, so what is measured is the rule and not a broken page.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FAULTS } from "../tools/judge-faults.mjs";
import { writingRulesOf } from "../lib/questions.mjs";
import { parseInstance } from "../lib/instance.mjs";
import { exampleSchemas } from "./example.mjs";

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const files = new Map();
const walk = (rel) => {
  for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
    const child = `${rel}${entry.name}`;
    if (entry.isDirectory()) walk(`${child}/`);
    else if (child.endsWith(".md")) files.set(child, read(`example/model/${child}`));
  }
};
walk("");
const schemas = exampleSchemas();
const graph = parseInstance(files, { schemas });
const skills = graph.entities.filter((e) => e.type === "skill").map((e) => e.name);
const entries = graph.entities.filter((e) => e.type === "experience").map((e) => e.path);

test("each fault names exactly one writing rule of the experience schema", () => {
  const rules = writingRulesOf(schemas.get("experience-schema.md"));
  for (const f of FAULTS) assert.equal(rules.filter((r) => r.startsWith(f.rule)).length, 1, f.name);
});

for (const f of FAULTS) {
  test(`${f.name}: plants on some example entry, changes it, and the page still parses`, () => {
    let planted = 0;
    for (const path of entries) {
      const out = f.plant(files.get(path), { skills });
      if (!out) continue;
      planted++;
      assert.notEqual(out.text, files.get(path));
      assert.doesNotThrow(() => parseInstance(new Map([...files, [path, out.text]]), { schemas }), path);
    }
    assert.ok(planted > 0);
  });
}

test("a bullet moved to another kind says where it came from and where it went", () => {
  const move = FAULTS.find((f) => f.name.startsWith("a bullet under a kind"));
  const out = move.plant(files.get("profiles/mira-halvorsen/experiences/2022-beacon-systems.md"), { skills });
  assert.deepEqual(out.moved, { bullet: "Split one service that three teams edited into two that one team each owns, so the second team stopped waiting on the first to merge.", from: "Delivery", to: "Results" });
  assert.doesNotMatch(out.text, /### Delivery/, "a kind left with nothing has no heading");
});
