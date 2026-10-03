// The writing rules, asked: what lib/questions.mjs reads out of a schema and a page, the
// questions it derives from an instance, and the report it makes of the answers. Nothing here
// reaches a judge; the module opens no socket, so its whole behavior is tested on files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { writingRulesOf, purposeOf, bulletsOf } from "../lib/questions.mjs";

const schema = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");

test("a writing rule is one bullet, its wrapped lines joined with one space", () => {
  const rules = writingRulesOf(schema("experience"));
  const bullets = schema("experience").split("## Writing rules")[1].split("\n").filter((l) => /^- \S/.test(l)).length;
  assert.equal(rules.length, bullets);
  assert.ok(rules.includes("Every entry in `skills:` is one the body shows. A skill listed and not evidenced belongs in the profile's table or nowhere; here it is a claim with nothing under it."));
  assert.ok(rules.every((r) => !r.includes("\n") && !r.includes("  ")));
});

test("a schema without writing rules gives none, and one without a purpose gives an empty one", () => {
  const bare = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n";
  assert.deepEqual(writingRulesOf(bare), []);
  assert.equal(purposeOf(bare), "");
  assert.match(purposeOf(schema("experience")), /^An experience is one dated period/);
});

test("a bullet carries the heading it stands under, or none when it stands before every heading", () => {
  const text = "- Before any heading.\n\n### Delivery\n\n- Split one service into two, so the second\n  team stopped waiting.\n- Another.\n\n### Results\n\n- Measured.";
  assert.deepEqual(bulletsOf(text), [
    { heading: null, bullet: "Before any heading." },
    { heading: "Delivery", bullet: "Split one service into two, so the second team stopped waiting." },
    { heading: "Delivery", bullet: "Another." },
    { heading: "Results", bullet: "Measured." },
  ]);
});
