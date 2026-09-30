---
name: companygraph-vocabulary
description: Use when new types are to be brought into CompanyGraph's core or a pack — a feature request or issue asks for vocabulary the model lacks, a company's own model has a thing no schema holds, or a pack is being designed — before any schema is written.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, WebFetch, WebSearch
---

# companygraph-vocabulary

New vocabulary arrives as a few names and some sources and leaves as a spec the owner can decide on: what each type is, where it lives, what it names, and where it departs from what the rest of the world calls it. Never a schema; the plan and the build follow the spec through the usual pipeline.

Read `AGENTS.md`, `core/CONVENTIONS.md` and the design spec it names before anything else. Every question is asked one at a time, in its own turn, with options, the answer the run proposes and the reason, so a yes is a complete answer and a no a correction.

## Two documents, and what each may hold

| | The report | The spec |
| --- | --- | --- |
| Where | `dist/research/<date>-<topic>.md`, ignored by git | `docs/superpowers/specs/<date>-<topic>-design.md`, public; `<topic>` names the vocabulary, as `the-software-pack`, and never ends in `-design` itself |
| Private sources | Quoted and paraphrased freely: their content, their counts, their wording | The **pattern** only, in a sentence per source, as `AGENTS.md` asks: what kind of company, what kind of thing it keeps and where the type would have helped. Never its decisions, processes, seats, services, counts or wording. |
| Public sources | Quoted | Paraphrased, with the address |
| Counts, versions, dates that move | Allowed | None. "Several", "a set of", never a number read off a source. |

Everything a source says goes to the report first. The spec is written from the report, taking only what its column allows. A sentence in the spec that could only have been written by someone who read the private source is a leak, however unnamed.

## Procedure

1. **Seat.** Ask whether the operator holds the Owner seat. Yes: every answer is a decision, and the Status line reads `Status: decided by the owner on <date>: <the calls>`. No: every answer is the operator's proposal, the Status line reads `Status: proposed by <operator> on <date>, awaiting the owner: <the proposals>`, and step 10 drafts a feature request. The seat is fixed here; the Status line itself is written last, in step 7, from the answers step 6 gathered.
2. **Types.** Names at least, a sentence each where the operator has one. An issue that asks for them is read first and linked.
3. **Sources.** Web addresses and local paths. For each that is not public, ask how the spec may cite it: named, described without a name, or not at all; propose "described, not named". Record every name to keep out, the organization's and the folder's included, and write each private path into the untracked `LOCAL.md`, never the spec. Hold every source's own names against `example/` and the entity names core ships: where a real company shares a name with the fictional one, the spec says which it means each time.
4. **Unit.** Core, or a pack and which, as the operator's first guess. Where the unit does not exist yet, the first pack, the mechanism that makes it a unit is part of the proposal, and the spec's cost says so.
5. **Report.** Run `git check-ignore -q dist/`; where it fails, ask, and add `dist/` to `.gitignore`. Then read and write, per type:
   - the operator's sources: every file that bears on the types read whole, the rest searched, and the report says which;
   - public practice, searched even where no source names it: the established definition, the standards that name the type, the words they use for its relations, each with its address;
   - core: the nearest schemas, the rules the type touches, earlier specs that deferred or rejected it, open issues;
   - **the company count**: how many companies, of how many kinds, the sources show the type in. It opens the type's section, because it decides the unit. Count each type on its own, even inside a pack, and mark a company that shows the idea without a place to keep it as thin;
   - every field and column proposed, written in core's type grammar (`ref → <type>`, `array of ref → <type>`, `enum`, `Table.`, `Grouped.`, `Bulleted.`), and each place the grammar cannot draw what is proposed: a list that would have to reference something, a heading that names no entity, a relation that would be written on both sides;
   - what was read, what yielded nothing, and what was not read and why.
6. **Decisions.** The eight kinds, in order. Where the report settles one, say so in one line and do not ask it. Where it leaves a choice, ask it.
   1. **Unit.** Core only where the count shows the type in companies of more than one kind; one kind is a pack; one company is a wait for the second.
   2. **Ownership.** Top level or owned, and so what a name is unique within (R2, R10).
   3. **Definition.** Which source's meaning, where they disagree.
   4. **Type, field or row.** A thing named from outside its page needs a page; otherwise a field or a row.
   5. **Reuse.** A core type that already carries it, proposed before any new type.
   6. **Edges.** Each reference, its direction, whether it is required. A pack's edge to core is optional, core never names a pack, and a relation is written on one side only.
   7. **Grammar.** Each gap the report found; propose reshaping the type, and a grammar change only where no shape works.
   8. **Departures.** Where the vocabulary differs from its source, and why.
7. **Spec.** In the family register, on a branch in a sibling worktree named `<repo>-<branch>`: the gap and the Status line; where it comes from, with each source cited as step 3 allowed and the company count; a section per type with its fields, sections, edges and sources; the decisions and their reasons; the departures; what was left out; out of scope; what it costs; and a Mermaid diagram of the types and their edges, rendered once with `npx -p @mermaid-js/mermaid-cli mmdc` to prove it parses.
8. **Leak search.** For every name from step 3, `grep -i` the spec and the commit message, after first running the same search on the report and seeing it hit; a name the report never uses is controlled against the source it came from instead. A hit in the spec stops the commit until it is gone. Then reread the spec's paragraphs about each private source against the table above.
9. **Commit.** `sh conventions/conventions-format` and `sh conventions/conventions-check`, then commit as `Specifier <specifier@companygraph.io>` in the git register with a `Verified:` line naming what ran, `Part of #N` where an issue started the run, and the trailers `Process: Delivery`, `Phase: Spec`, `Track: Code`.
10. **Hand-off.** Open the pull request and stop; nothing is merged. For a contributor, draft the feature request that points at the spec and hand it to the operator to file.

## Common mistakes

| Mistake | Instead |
| --- | --- |
| Writing research straight into the spec | The report first; the spec takes only what its column allows |
| "Described, not named" read as "any detail but the name" | The pattern in a sentence; the detail stays in the report |
| "<n> decision records", "every count below is a fact on that date" | No count read off a source reaches the spec |
| Asking every decision kind | State the settled ones in a line |
| Batching questions into one message | One per turn, with options and a proposal |
| "Proposed" when the Owner ran it | The seat decides the Status line |
| A grammar gap found at plan time | It is found in step 5, in the report's grammar lines |
