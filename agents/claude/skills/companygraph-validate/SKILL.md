---
name: companygraph-validate
description: Validate this CompanyGraph instance — run the mechanical checks, then judge every entity against its schema's writing rules, and report what was not checked. Run before every commit.
---

# companygraph-validate

The R0 agent pass. R0 has two halves and this skill runs both: the mechanical half is `companygraph check`, which this instance's CI also runs on every commit, and the other half is reading, which nothing mechanical reaches.

## Procedure

1. Read `.companygraph/manifest.json`. `tooling` names the release of the checker this instance
   asks for, `units` the folder the vendored core sits in, and `core.version` the release of the
   rules the rest of the pass is held to. Report the core version.
2. Run the mechanical checks from the instance root, at the release the manifest names:
   `npx github:companygraph/meta-model#v<tooling> check`. It covers every rule it names in its
   own output: the shape of every schema, the files under `model/`, frontmatter, references,
   tables, owned folders and the vendored files against the manifest's hashes. Do not repeat
   any of it by hand; copy its failures into the report as they are. When it cannot run — no
   network, no Node — say so under **Not checked** rather than walking those rules yourself,
   because a check done by hand is the one that gets a rule subtly wrong and still returns
   something shaped like an answer.
3. Read `<units>/core/CONVENTIONS.md` in full. What it states is what is being checked, and
   nothing it does not state; the rules are read from the file and not listed here, because a
   core upgrade adds rules.
4. Read each schema's `## Writing rules` and judge every entity of that type against them, one
   rule at a time. Nothing mechanical reaches these — they are written to be checkable by an
   agent reading an entity, and this pass is the only thing that checks them.

   One writing rule produces a report line rather than a failure, and the role schema says so:
   for every profile whose nature is `human` and that lists roles, every skill a listed role
   `requires` that has no row in the profile's Skills table is a gap —
   `gap <profile>: <role> requires <skill>` — reported once per role and skill and never
   counted as a failure. It says what the holder has to learn or the company has to hire. A
   profile whose nature is `agent` claims no skill and carries no Skills table, so a seat it
   holds reports no gap: what that seat requires is answered by its rulebook, not by a row the
   agent wrote about itself.
5. Read what only reading judges: whether each Evidence row's `What it shows` is a concrete
   fact rather than a restatement of the level, whether `## In practice` prose says what
   following and breaking the value looks like, and every other line a schema asks a reader to
   judge.

## Report

First the mechanical checks, as `companygraph check` printed them. Then the writing rules per type, cited as the rule's own words and the file that breaks it. Then the gaps, one line each, after the failures and outside their count. Then the lines this pass judged by reading. End with **Not checked:** naming anything above that was skipped, so a clean report is never read as more than it is.
