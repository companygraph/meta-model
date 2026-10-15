# A finding names its page, its check and its reach — design

> `checkInstance` reports a failure as one line of text, and a program that reads the report has to take the text apart again to learn which page it is about, which check raised it and whether it can be judged from that page alone. This design returns the same failures a second time as records, `findings`, beside the strings, which stay byte for byte as they are. Each check declares once how far its verdict reaches, the page, a reference or several pages, and the run writes that onto every finding it raises.

Status: proposed, for the owner's decision. Drafted on Oct 15, 2026 against this repository at `0a81a74` (v0.94.0, core 0.69.0), at the request of beacon.build, whose platform imports an instance into a knowledge graph page by page and reads the checker's report to attach each failure to the page it is about. Every number below was counted at that commit. Nothing here is implemented; the implementation waits for the owner's word on this design.

---

## 1. What the checker returns today, measured

`checkInstance` in `lib/checks.mjs` returns `{ failures, skipped, notes }`, three arrays of strings. It hands `instanceChecks` a `fail` that pushes a string, and every check writes its whole message itself at the call site; there is no helper that adds the path or the rule.

Most messages open with the page, `${child}: `, and close with the rule, ` (R4)`. That is a habit of the call sites, not a form anything holds them to, and it has exceptions. The container checks report `model/ is missing` and its siblings with no page and no rule, since there is no page yet. Three messages that are about several pages open with none of them: R2's name shared across a type, `two use-case files share the canonical name …`, R16's `once`, `"…" is in … of … and …`, and R16's `replaced`, `the … entities another names …`. A circle opens with the lowest path and names the rest by their H1 inside the text. R18's missing `id` names no rule in its text.

`instanceChecks` returns 55 checks of the shape `{ name, rule, notes?, run }`, and the rule does not tell them apart: 33 of the 55 cite R16, seven cite R9, and every other rule is cited by one or two. The name does, since each check's `name` is a sentence of its own.

Four consumers read the report. `bin/check-instance.mjs` prints each string of `failures` under a count and prints neither `skipped` nor `notes`. The Obsidian plugin's tests match failures by their path prefix and, in places, by their whole text, `… the schema declares that it does (R16)`. The MCP server's snapshot reads `name`, `rule` and `notes` from the checks and calls none of them. beacon.build's platform attributes each failure to a page by its prefix and tells a reference failure from the rest with a pattern over the wording, `/names no (?:entity|[\w-]+ in )|must resolve|is ambiguous/i`.

## 2. Why a reader needs more than the line

**A failure's text is written for a person, and a program that reads it is reading a second copy of the checker's wording.** The platform's pattern is that copy: it has to change whenever a reference failure is reworded, nothing here can know that it exists, and the platform reports that it broke once already, with the wording of v0.94.0. The rule cannot replace the wording, because one rule covers 33 checks.

The question the platform asks of each failure is how far its verdict reaches. A failure about the page alone, a missing section or a blank field, stays true until the page changes. A failure about a reference, a name no page resolves, can turn green when another page arrives, so an import that lands pages in batches must hold it until the batch is complete. A failure about several pages together, two pages sharing a name or a chain returning to its start, belongs to all of them and to none alone. The checker knows which of the three each check is, because each check's `run` reads one page, resolves names or compares pages; it is the only place that knows it, and it says it nowhere.

## 3. The shape

`checkInstance` returns a fourth array, `findings`, one record per failure in the order the failures are raised:

```ts
type Finding = {
  path: string                                 // the page the finding is attached to
  related?: string[]                           // the other pages it names, for a finding about several
  check: string                                // the raising check's name, unique where its rule is not
  rule: string                                 // the raising check's rule, "R4", "R16", …
  scope: 'page' | 'reference' | 'cross-page'   // how far the verdict reaches, from the check
  message: string                              // the text without the path it opens with
}
```

**`failures` stays byte for byte what it is today, and is rendered from `findings`.** That keeps every consumer of section 1 as it is: the CLI prints the same lines, the plugin's prefix and whole-text matches hold, and a consumer that never reads `findings` sees no change.

`fail` takes the page as an argument instead of in its text: `fail(path, message, { related })`. The run fills `check`, `rule` and `scope` from the check it is running, so a call site cannot get them wrong and none of the 55 writes them. A finding renders as `${path}: ${message}`, which is what the call sites write today. The messages that open with no page today, the container's and the three about several pages, still carry a `path` for the reader that attaches them, the content tree for the container and the first page in path order for the others, with the rest in `related`; they pass `{ bare: true }`, and render as their message alone, so that their line does not change. Whether they should open with a page like every other message is a question for a later release, since it changes `failures`, and is left open in section 8.

`rule` is a string and never empty. The draft this design started from allowed `null`, for the messages that name no rule in their text; but the rule a finding carries comes from its check, and every check declares one. A message that names no rule in its text still names its check's rule as a finding.

## 4. Each check declares its reach

`scope` is a field of the check, `{ name, rule, scope, notes?, run }`, declared once beside `rule`, not chosen per message: the reach is a property of what the check reads, and a check whose messages disagreed about it would be two checks.

The three values follow what the verdict depends on. `page` is a verdict this page decides alone. `reference` is a verdict that depends on whether a name the page writes resolves in the instance, and to what kind: R4's *references resolve*, R5's *a name of an owned type is one of its owner's own* and R16's *a reference names an entity of the kind its schema says*. `cross-page` is a verdict that depends on what other pages say: R2's *a name is unique within its type, or within its owner*, R18's *every entity carries an id in the declared format, and no two share one*, and the R16 checks the types table drives through `once`, `gathers`, `acyclic`, `flat`, `replaced`, `binds` and `atMostOne`. Every other check is `page` until its `run` shows otherwise.

Two groups are not settled by this list, and the implementation settles them check by check against what each `run` reads, with a fixture to pin each answer. The table checks that name entities in their cells, *a table row names an entity that carries what the row needs*, *a table that names one kind of entity names the other beside it* and *a table names only what the page's other table names*, resolve a name and then read the page it names, so each is `reference` or `cross-page` by what it reads after resolving. The checks the types table drives through `within`, `inherits` and `descends` were not read for this design.

The check objects stay compatible. `scope` is a new field and nothing that reads a check today reads all its fields: the snapshot takes `name`, `rule` and `notes` and would take `scope` beside them when the server wants to show it, which is a change of its own.

## 5. On the way, if the owner wants it

`fieldsOf` and `joinsOf` read and parse a type's schema on every call, and a run calls them for every page of the type. `columnTablesCache` already holds the column tables for the length of one `instanceChecks` call, and the same cache, keyed by type, would hold the fields and the joins. `vocabularyOf` runs twice per `checkInstance`, once in `checkInstance` and once in `instanceChecks`. Neither changes a verdict, both are a commit of their own, and they are named here only because the change of section 3 touches the same function.

## 6. What this is not

**Not an incremental check.** A call that checks only the pages that changed, `checkPages(candidates, context)`, would be correct for `page` checks and wrong for the rest: a `cross-page` verdict depends on pages the call did not read, and knowing which ones means tracking, per check, what each run read. The platform answers its own cost question without it, with one run per batch instead of one per page. `scope` is what lets it attach the results of that run; it is not a promise that a check can be run on part of an instance.

Not a change to `notes` or `skipped`. `notes` are written through their own `note` and read by nobody this design knows of as records; they could take the same shape when a reader asks for it. Not a change to the failures `bin/check-instance.mjs` adds of its own, the gate's and the manifest hashes', which are raised outside `checkInstance` and stay strings.

## 7. Tests

The instance-check tests build their instances inline, a `Map` of path and text, and assert over `failures`. They gain one case per check, in the same form, that raises exactly one finding and asserts its `check`, `scope` and `path`, and `related` where the check names several pages. A parity test asserts that `failures` is `findings` rendered, string for string, for every fixture and for the whole of `example/`. `rule-citations.test.mjs` reads the rules the source cites and is untouched by a change that cites no new one.

## 8. Open questions

- The messages that open with no page. Section 3 keeps them as they are with `{ bare: true }`. Opening them with their first page like every other message would drop the option and change their line in `failures`, which a minor cannot do.
- The two groups of section 4. The implementation's answer for each check, with its fixture, is for the owner's review on the branch.
- `scope` in the snapshot. Whether the server's list of checks shows it is the server's decision.

## 9. Release

A minor of the meta-model: `findings` is added, `failures` keeps its bytes and the checks gain a field. No schema changes, so `core/manifest.json` keeps its version and no vendored core reads as behind. beacon.build takes the release at its next regular re-pin, and its platform then attaches failures by `path` and `scope` and drops its pattern over the wording.

## Decisions

None yet. The shape, the three values of `scope` and the list of section 4 are proposed for the owner's decision.
