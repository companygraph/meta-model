// R0: every check names the rule it enforces, and a meta-check fails if CONVENTIONS.md does
// not define that rule — so a script and the prose cannot drift apart silently. The "rules are
// written down" check in verify/check.mjs implements that over its own checks. It cannot see
// the other surface in this repository that cites rules by number: the instance parser's
// comments and error messages. R2 and R3 keep a repository folder out of a path, R4 makes an
// unresolvable name an error, R5 and R6 make ownership nesting on disk, R7 singularises a
// folder into a type. This suite is R0 extended to that second surface, and nothing more.
// While the parser and the rules lived in different repositories no such check was possible,
// which is the reason the parser moved here rather than into the design package.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../lib/instance.mjs", import.meta.url), "utf8");
const conventions = fs.readFileSync(new URL("../core/CONVENTIONS.md", import.meta.url), "utf8");

// Every `R<n>` in the parser is a citation — in a comment or in the message of the error the
// rule names — and nothing else in that file has this shape, so the loose pattern is the
// right one on this side.
const CITATION = /\bR\d+\b/g;

// Deliberately identical to the regex in verify/check.mjs's "rules are written down" check, so
// that the two agree on what "defined" means. Two patterns in one repository that both decide
// that question and disagree is exactly the drift R0 exists to stop: a heading one accepts and
// the other rejects makes one script pass and the other fail, for no reason visible to whoever
// hits it. Change both together or neither.
//
// A rule is defined by its heading, not by being mentioned. Matching every `R<n>` in
// CONVENTIONS.md would count a mention as a definition, and there is a concrete case: R7 is
// defined under `### R7 — Folders are the plural of the type` and mentioned again in R0's
// prose. Deleting R7's section would leave that mention behind and this suite would stay green
// over a rule that no longer exists.
const DEFINITION = /^###\s+(R\d+)\s+—/gm;

const cited = [...new Set(src.match(CITATION) || [])];
const defined = new Set([...conventions.matchAll(DEFINITION)].map((m) => m[1]));

test("the parser cites at least one rule", () => {
  // Without this the test below passes vacuously if the citation pattern ever stops matching:
  // an empty `cited` makes `missing` empty too, and a green suite would mean nothing.
  assert.ok(cited.length > 0, "the parser cites no rules — has the citation pattern broken?");
});

test("every rule the parser cites is defined in core/CONVENTIONS.md", () => {
  // `defined` needs no guard of its own: if the heading pattern ever stops matching, every
  // citation lands in `missing` and this fails loudly rather than passing on an empty list.
  const missing = cited.filter((r) => !defined.has(r));
  assert.deepEqual(missing, [], `cited but not defined: ${missing.join(", ")}`);
});
