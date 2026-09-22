// R15's second half: a key appears once in a page's frontmatter. Written twice, the checker read
// the first value and the parser the last, and nothing said so — a merge that keeps both lines
// or a pasted block of fields is how the second arrives.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const PROFILE_SCHEMA = [
  "# Profile Schema", "", "> A profile.", "",
  "## File Location", "", "`profiles/`", "",
  "## Frontmatter", "",
  "| Field | Required | Type | Description |",
  "| --- | --- | --- | --- |",
  "| `nature` | Yes | enum | `human` or `agent`. What holds this profile. |",
  "| `location` | No | string | Where the person works from |",
  "| `roles` | No | array | The seats. |", "",
  "## Sections", "",
  "| Section | Required | Description |",
  "| --- | --- | --- |", "",
].join("\n");

const run = (frontmatter) =>
  checkInstance(
    new Map([
      ["meta/core/profile-schema.md", PROFILE_SCHEMA],
      ["model/profiles/mira/mira.md", `---\n${frontmatter}\n---\n\n# Mira\n\n> A person.\n`],
      ["model/profiles/mira/experiences/README.md", "# Experiences\n"],
    ]),
    { core: "meta/core", model: "model" },
  ).failures.filter((f) => /twice|once/.test(f));

test("a key written twice fails by name, whatever its values", () => {
  const got = run("nature: human\nlocation: Bern\nlocation: Zürich");
  assert.deepEqual(got, ["model/profiles/mira/mira.md: frontmatter field `location` is written twice; a key appears once (R15)"]);
});

test("a key written once, and a nested key that shares its name, pass", () => {
  assert.deepEqual(run("nature: human\nlocation: Bern\nroles:\n  - Owner\n  - location"), []);
});

test("a list key written twice fails once, not once per entry", () => {
  assert.deepEqual(run("nature: human\nroles:\n  - Owner\nroles:\n  - Reviewer").length, 1);
});
