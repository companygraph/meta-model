# A finding names its page, its check and its reach — design

> `checkInstance` reports a failure as one line of text, and a program that reads the report has to take the text apart again to learn which page it is about, which check raised it and whether that page alone decides it. This design returns the same failures a second time as records, `findings`, beside the strings, which stay byte for byte as they are. Each check declares by default how far its verdict reaches, the page, a reference, several pages or a file that is no instance page, a finding may override that where one check mixes reaches, and the run writes the result onto every finding it raises.

Status: proposed, for the owner's decision. It is written against this repository at `0a81a74`, at the request of beacon.build, whose platform imports an instance into a knowledge graph page by page and reads the checker's report to attach each failure to the page it is about. Every line number below refers to that commit. Nothing here is implemented; the implementation waits for the owner's word on this design.

---

## 1. What the checker returns today

`checkInstance` in `lib/checks.mjs` returns `{ failures, skipped, notes }`, three arrays of strings. It hands `instanceChecks` a `fail` that pushes a string, and every check writes its whole message itself at the call site. The one helper that writes a message, `enumOpensWithNoList` (`lib/checks.mjs:900`), writes the whole line too, with its path, for the checks that call it; nothing adds the path or the rule on a check's behalf. `instanceChecks` returns the checks, each `{ name, rule, notes?, run }`. The rule does not tell them apart, since most cite R16, so the name does: each is a sentence of its own.

Most messages open with the page, `${child}: `, and close with the rule, ` (R4)`. That is a habit of the call sites, not a form anything holds them to, and the table in section 4 lists every exception. They fall into the forms below.

Some lines open with a path and no colon. The container check opens `model/ is missing` with the folder (`lib/checks.mjs:1146`), and its siblings with the singular file or folder they name (`1160` to `1196`). Two files that derive to one filename open with the later path, `${child} and ${other} both derive …` (`2802`); two entities that each name the other, `${a} and ${b} each name the other in …` (`2879`); and a chain that returns to a copy, `${path} names "…" in …` (`3099`).

Some lines open with no path at all. Messages about several pages open with a quoted name or a list of names: R2's name shared across a type (`1604`), R16's `once` (`3194`) and `replaced` (`3589`), and a rank collision, which names the entities that share it (`2046`).

Many lines close with no rule, and R18's missing `id` names its rule in the middle of the text (`2419`). A circle opens with the lowest path and names the rest by their H1 inside the text (`3063`).

The report is read by the CLI, the Obsidian plugin and the platform. `bin/check-instance.mjs` prints each string of `failures` under a count, prints the notes and the types it skipped (`165` to `174`), and adds failures of its own: the gate's and the manifest's (`114`, `127`, `132`, `134`) and the `judge/known.md` failures (`152`). The Obsidian plugin's tests match failures by their path prefix and in places by their whole text, and its runtime code, `obsidian-plugin/src/locate.ts:59-68`, attaches a line to the longest file path it opens with, followed by a colon or a space, so it uses the later path for the filename collision. beacon.build's platform attaches each failure to a page by its prefix and tells a reference failure from the rest with a pattern over the wording, `/names no (?:entity|[\w-]+ in )|must resolve|is ambiguous/i`. The MCP server's snapshot does not read the report: it reads `name`, `rule` and `notes` from the checks and calls none of them.

## 2. Why a reader needs more than the line

A failure's text is written for a person, and a program that reads it is reading a second copy of the checker's wording. The platform's pattern is that copy: it has to change whenever a reference failure is reworded, and nothing here can know that it exists. The rule cannot replace the wording, because one rule covers many checks.

The question the platform asks of each failure is how far its verdict reaches. A failure about the page alone, a missing section or a blank field, stays true until the page changes. A failure about a reference, a name no page resolves, can turn green when another page arrives, so an import that lands pages in batches must hold it until the batch is complete. A failure about several pages together, two pages sharing a name or a chain returning to its start, belongs to all of them and to none alone. A failure about a schema file or a picture has no page in the graph at all. The checker knows which of these each check is, because each check's `run` reads one page, resolves names or compares pages; it is the only place that knows it, and it says it nowhere.

## 3. The shape

`checkInstance` returns a fourth array, `findings`, one record per failure in the order the failures are raised:

```ts
type Finding = {
  path: string                                              // the path the legacy line opens with, the file or folder it names, or for a line that opens with a name the first page that takes part
  related?: string[]                                        // the other paths that take part, in code-unit order, never `path` itself
  check: string                                             // the raising check's name, for display
  rule: string                                              // the rule the message cites, or the check's own when it cites none
  scope: 'page' | 'reference' | 'cross-page' | 'schema'     // how far the verdict reaches, from the check unless the finding overrides it
  message: string                                           // the text without the path it opens with; the whole line when bare
  bare?: true                                               // the legacy line is `message` alone, with no `${path}: ` in front
}
```

`Finding` is a JSDoc typedef in `lib/checks.mjs`, and the declaration files under `types/` are rebuilt from it by `npm run build`.

`failures` stays byte for byte what it is today, and is rendered from `findings`. That keeps every consumer of section 1 as it is: the CLI prints the same lines, the plugin's prefix and whole-text matches hold, and a consumer that never reads `findings` sees no change.

The exported callback does not change. `instanceChecks` takes `fail: (message: string) => void` today (`lib/checks.mjs:732`), and `verify/check.mjs:529` passes it a collector that stores the first argument. A new signature would make those callers collect paths where they collect diagnostics, so the release stays additive in the callback too. The structured emitter is internal to `instanceChecks`: a check calls `emit(path, message, { related, bare, scope, rule })`, the run builds the finding from it, renders the legacy line, and calls the caller's `fail(line)` with that line, exactly as before. `instanceChecks` gains one optional callback, `finding: (record) => void`, which `checkInstance` supplies and any other caller may leave out. `failures` is what `fail` collected and `findings` is what `finding` collected, in the same order. A consumer does not pair the two arrays by index, since the CLI adds strings of its own to `failures` that have no finding (section 6). Inside `instanceChecks` the checks no longer see `fail`, so a call site that still calls it throws in the tests instead of dropping a finding.

The run fills `check`, `rule` and `scope` from the check it is running, so a call site cannot get them wrong and most never write them. A finding renders as `${path}: ${message}`, which is what the call sites write today.

Every line that is not of the form `${path}: ${message}` is bare. That covers the two forms of section 1 whose lines do not open with `${path}: `, a path and no colon, and no path at all. A line that opens with `${path}: ` but closes with no rule, or with its rule mid-text, is an ordinary finding whose `message` is the text after the path, unchanged. A bare finding keeps its legacy line whole in `message` and is rendered as `message` alone, so its line does not change, and it still carries `path` for the reader that attaches it. `path` is the path the legacy line opens with, which is what the plugin attaches the line to; for a line that opens with a name instead of a path, the first page that takes part in code-unit order, with the rest in `related`. The rank collision and `replaced` collect names and statuses in insertion order today, so those checks keep the page paths as they collect and sort them in code-unit order. For the container findings `path` is the file or folder the line names, not the content tree. Because `bare` is a field of the record, a renderer given only the records reproduces `failures` without a wording heuristic, and a consumer that shows `path` and `message` side by side shows `message` alone when `bare` is set. Whether bare lines should one day open with a page like every other message is a question for a later release, since it changes `failures`, and is left open in section 9.

`rule` is the rule the message cites, or the check's own when it cites none. Many messages cite another: an R9 failure inside an R4 check, an R8 failure inside an R16 check. The call overrides `rule` as it overrides `scope`, and the table in section 4 lists each case. A message that cites two rules takes the check's own when it is one of them, so the schema-id failures that close with `(R9, R18)` are R18, and the other rule stays in the text.

`check` is the check's name and is prose that may be reworded. It is for display and for people; a consumer keys on `path` and `scope`, never on `check` or `message`.

## 4. Each check declares its reach

`scope` is a field of the check, `{ name, rule, scope, notes?, run }`, declared once beside `rule` as the check's default. It is optional in the type, so a consumer that builds its own `Check` keeps working, and a missing `scope` reads as `page`. A test requires every check that can raise a failure to declare one, so a new check cannot fall silently into `page`. A check that mixes reaches is not split, since splitting changes the checks and the order of `failures`; its call overrides the default for the finding that differs, `emit(path, message, { scope: "page" })`.

The four values are defined by what a reader that loads pages in batches does with the finding.

- `page`: final until this page changes. The reader attaches it to the page and need not wait.
- `reference`: depends on whether a name the page writes resolves. The reader holds it until the batch is complete, since another page can resolve the name. When the name resolved to a page of the wrong kind, `related` holds that page; when it resolved to nothing, `related` is empty.
- `cross-page`: depends on what other pages say, their order, their count, their fields or their names. The reader holds it until the batch is complete and attaches it to `path` and to every page in `related`. A finding of this reach with an empty `related`, the count of pages that name an entity at zero or a rule no page binds, is held the same way, since a page that arrives can clear it.
- `schema`: about a file or folder that is no instance page: a core or pack schema, `model/identifier.md`, a picture, or the layout of the folders. The graph has no page for it, so the reader reports it against `path` as a file. Most of these are final until that file changes. A few clear when a file or page arrives, a singular file or an owner's file or folder that is missing and an image that no page names, and the reader holds those until the batch is complete, as it does a reference. The table marks them held.

The table lists every check in the order `instanceChecks` returns them, with its default and each finding whose reach or rule differs, by the line of the `fail(` call at `0a81a74`, which for a call that spans lines is the line of `fail(` and not of its message. Line 901 is the one `fail` of the helper `enumOpensWithNoList`, called at 1376 by the check that holds the instance to its schemas and at 2600 by the enum check. A dash is nothing to list. "Opens" lists the lines that are not of the form `${path}: ` by the form: PX is a path without a colon, N is no path, and "no rule" is a message that does not close with its rule.

| # | Check | Rule | Default | Other reach, by line | Other rule cited | Opens |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | the container holds what the types imply | R6 | schema | schema, held: 1166, 1182, 1186 | 1196: R5 | PX 1146, 1160, 1166, 1176, 1182, 1186, 1189, 1196; no rule 1146, 1160, 1166, 1176, 1182, 1186, 1189 |
| 2 | references resolve | R4 | reference | page 1282, 1285, 1287, 1291, 1312 | 1312: R9 | — |
| 3 | the instance is held to what the schemas declare | R16 | page | schema 901 (called at 1376), 1392, 1398 | 901: R8; 1453: R9; 1465: R8 | no rule 901, 1392, 1398, 1415, 1428, 1439, 1446, 1453 |
| 4 | a repeated reference in a table names the role each row plays | R16 | page | — | — | — |
| 5 | an entity names another by its canonical name, never by a link to its file | R3 | page | — | — | no rule 1581 |
| 6 | a name is unique within its type, or within its owner | R2 | cross-page | — | — | N 1604 |
| 7 | a name of an owned type is one of its owner's own | R5 | reference | page 1737 | 1737: R4 | — |
| 8 | a section holds the kind of list its schema declares | R16 | page | schema 1774 | 1774: R9 | — |
| 9 | a required table section carries at least one row | R16 | page | — | — | — |
| 10 | a cell agrees with its row where the schema says it does | R16 | cross-page | schema 1854, 1855, 1856, 1857 | 1854 to 1857: R9 | — |
| 11 | a table standing under another references what it references | R16 | page | schema 1896, 1897, 1898 | 1896 to 1898: R9 | — |
| 12 | an owner's table of what it owns lists all of it, each once | R5 | cross-page | page 1934 | — | no rule 1934 |
| 13 | an owner's table of what it owns is a table, in the order the owned give | R9 | cross-page | page 1960 | — | no rule 1970, 1972 |
| 14 | a row that names its own kind of entity names this one or one before it | R16 | cross-page | — | — | — |
| 15 | two entities of a ranked type do not share a rank | R9 | cross-page | — | — | N 2045; no rule 2045 |
| 16 | a label is a token, and no two on one page are the same | R16 | page | — | — | — |
| 17 | a branch's label begins with the label it branches from | R16 | page | — | — | — |
| 18 | grouped headings follow the rank of what they name | R16 | cross-page | reference 2185 | — | no rule 2185, 2189, 2193 |
| 19 | a grouped section's items stand under its headings | R16 | cross-page | — | — | no rule 2263 |
| 20 | frontmatter fields are declared | R15 | page | — | — | no rule 2298 |
| 21 | a frontmatter key appears once | R15 | page | — | — | — |
| 22 | list fields are block sequences | R11 | page | — | — | no rule 2346 |
| 23 | required frontmatter fields are present | R9 | page | — | — | no rule 2392 |
| 24 | every entity carries an id in the declared format, and no two share one | R18 | page | schema 2412; cross-page 2427, 2433 | — | no rule 2419 |
| 25 | every schema carries an id, and no two share one | R18 | schema | — | 2457, 2463: R9 as well as R18, the check's own; 2465: R9 | no rule 2457 |
| 26 | the model names its language as a language tag | R14 | page | — | — | — |
| 27 | required list fields carry at least one item | R9 | page | — | — | — |
| 28 | required sections are present | R9 | page | — | — | no rule 2567 |
| 29 | enum values are listed, and written values are among them | R8 | page | schema 901 (called at 2600) | — | no rule 901 |
| 30 | date fields carry a date in one of the three forms | R9 | page | — | — | no rule 2642, 2659 |
| 31 | an image field names a square picture beside its page, and every image is named | R9 | page | reference 2716; schema 2722, 2728, 2732, 2734, 2736, 2739; schema, held: 2744 | — | — |
| 32 | filenames derive, or take the form their schema states | R12 | page | cross-page 2802 | 2766: R2 | PX 2802; no rule 2781, 2787, 2789, 2792, 2793, 2802 |
| 33 | a unit names only what it may | R20 | schema | — | — | — |
| 34 | a relation is written on one side only | R16 | cross-page | — | — | PX 2879 |
| 35 | a row never names its own page | R16 | page | — | — | — |
| 36 | a field yields to the field whose page says the same | R16 | reference | — | — | — |
| 37 | a row fills exactly one of the columns its schema pairs | R16 | page | — | — | — |
| 38 | a reference names an entity of the kind its schema says | R16 | cross-page | — | — | — |
| 39 | a chain of one type never returns to where it starts | R16 | cross-page | — | — | — |
| 40 | a one-level field names a page that leaves it empty | R16 | cross-page | — | — | PX 3099 |
| 41 | what a page names in a field stands at its level or below | R16 | cross-page | — | — | — |
| 42 | an entity is named in a field or a column by one page at most | R16 | cross-page | — | — | N 3194 |
| 43 | a field that runs inside a set runs only from and to what is in it | R16 | cross-page | — | — | — |
| 44 | a page under one that carries a value carries it too | R16 | cross-page | — | — | — |
| 45 | a table row names an entity that carries what the row needs | R16 | cross-page | — | — | — |
| 46 | a table that names one kind of entity names the other beside it | R16 | cross-page | — | — | — |
| 47 | a table names only what the page's other table names, each as its column asks, once | R16 | cross-page | page 3423 | — | — |
| 48 | at most one entity holds a value in a table | R16 | page | — | — | — |
| 49 | the rows of one entity in a table carry one value | R16 | page | — | — | — |
| 50 | an entity that gathers others gathers enough of them | R16 | cross-page | — | — | — |
| 51 | a rule binds more than one, or a control enforces it | R16 | cross-page | — | — | — |
| 52 | a replaced entity carries one status, and not the one most others carry | R16 | cross-page | — | — | N 3589 |
| 53 | a seat's required skill its holder does not claim is noted | R16 | note only | — | — | — |
| 54 | a page repeating the company's address is noted | R16 | note only | — | — | — |
| 55 | a date that expires is noted once it has passed | R16 | note only | — | — | — |

The checks driven by the types table take their default from the key that drives them: `once`, `gathers`, `acyclic`, `flat`, `replaced`, `binds`, `within`, `inherits`, `descends`, `beside`, `among`, `carries`, `oneSided` and `refKind` are `cross-page`; `atMostOne`, `samePer`, `notSelf`, `oneOf`, `branches` and `labels` are `page`; `yields` is `reference`. A check that reads another page only for whether it exists, as the grouped-section check does for the heading's type, is `cross-page`, because a page that arrives changes the verdict.

R18's wrong-format finding (the row for ids, line 2427) is `cross-page` because it depends on `model/identifier.md`: it does not occur while that file is absent. The checks marked note only call only `note`. They raise no failure and so no finding, and need no scope.

`related` is filled by every finding whose message names other pages, or the entities they hold by name: a shared name or id, the page a cell or heading was read from, an owner's table set against the owned pages, two entities that name each other, a chain or a copy that returns to where it starts. Where the message names an H1 or a folder instead of a path, the check keeps the path of the page it read as it collects, and `related` holds that path. A `reference` finding fills it with the resolved page only when the check keeps that page; `references resolve` keeps types and not paths today, so its `related` stays empty until the check collects them.

## 5. On the way, if the owner wants it

`fieldsOf` reads and parses a type's schema on every call, and a run calls it for every page of the type (`lib/checks.mjs:831`). `joinsOf` re-reads on every call too, but it is called once per type and check (`1849`, `1894`), so only `fieldsOf` is worth a cache. `columnTablesCache` already holds the column tables for the length of one `instanceChecks` call, and the same cache, keyed by type, would hold the fields. It changes no verdict and is a commit of its own; it is named here only because the change of section 3 touches the same function.

## 6. What this is not

Not an incremental check. A call that checks only the pages that changed, `checkPages(candidates, context)`, would be correct for `page` findings and wrong for the rest: a `cross-page` verdict depends on pages the call did not read, and knowing which ones means tracking, per check, what each run read. The platform answers its own cost question without it, with one run per batch instead of one per page. `scope` is what lets it attach the results of that run; it is not a promise that a check can be run on part of an instance.

Not a change to `notes` or `skipped`, which stay strings. Not a change to the failures `bin/check-instance.mjs` adds of its own, the gate's and the manifest's and the `judge/known.md` failures, which are raised outside `checkInstance` and stay strings.

## 7. Tests

The instance-check tests build their instances inline, a `Map` of path and text, and assert over `failures`. They gain one case per check that can raise a failure, in the same form, that raises exactly one finding and asserts its `check`, `scope`, `rule` and `path`, and `related` where the check names several pages. The checks marked note only get the opposite assertion: a fixture that triggers their note yields no finding and leaves `failures` as it is. Every finding that overrides the default scope or the rule, each a cell of the table, gets its own fixture with the override asserted and the order and the wording of `failures` unchanged.

The example company raises nothing, so a parity test over `example/` alone cannot fail. The parity test therefore runs over the fixtures: `failures` is `findings` rendered, string for string, where a bare finding renders as its `message` alone, with one fixture for each of the two bare forms of section 1 (a path and no colon, no path), one for a line that opens with `${path}: ` and closes with no rule, and one for the ordinary line. A further test passes a caller's own `fail` collector, as `verify/check.mjs` does, and asserts it still receives complete lines and nothing else. A test that every check that can raise a failure declares a `scope` stops a new check from falling silently into `page`. The `rule-citations` test stays green.

## 8. Files

`lib/checks.mjs`: the `emit` function, the `finding` callback, `Check.scope`, the per-check scopes and the overrides of section 4, and the `Finding` typedef. `types/lib/checks.d.mts`: rebuilt by `npm run build`. `verify/`: the fixtures and the parity test of section 7. `bin/check-instance.mjs`, `mcp-server/lib/snapshot.mjs` and the Obsidian plugin: untouched.

## 9. Open questions

- The taxonomy. Whether four values are the right ones, in particular where `cross-page` ends and `reference` begins for the checks that read the target page's own fields (`refKind`, `descends`), is for the owner to read off the table in section 4.
- The bare lines. Section 3 keeps them as they are, and a bare finding carries its structured path. Opening them with their page like every other message would drop the `bare` field and change their lines in `failures`, which a minor cannot do.
- `scope` in the snapshot. Whether the server's list of checks shows it is the server's decision.

## 10. Release

A minor of the meta-model: `findings` is added, `failures` keeps its bytes, the exported callback keeps its signature and the checks gain a field. No schema changes, so `core/manifest.json` keeps its version and no vendored core reads as behind. beacon.build takes the release at its next regular re-pin, and its platform then attaches failures by `path` and `scope` and drops its pattern over the wording.

## Decisions

None yet. The shape, the four values of `scope` and the table of section 4 are proposed for the owner's decision.
