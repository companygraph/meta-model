# A gate says where failure leads

The chat draws a process as its phases and the arrows between them, and every arrow is a `gate-to`: the path a piece of work takes when every gate is met. A reader looking at the Delivery picture on blust.ch said so: "we just show the happy flow, but the process defines back flows and stop". The process does define them, in a sentence closing every gate: "Where they cannot be met, the Owner decides whether the change is reshaped, narrowed or dropped." A sentence draws no edge, so the picture cannot show it, and a picture that read the sentence to draw arrows would be drawing edges the model does not hold. A phase gains a required table, `## If not met`, whose rows each name one thing the escalation authority may decide and the phase the work goes to, or none where the process stops; the sentence it replaces goes, and the `process` diagram draws each row as a dashed arrow.

Status: decided by the owner on September 27, 2026, question by question: the targets a row may name, the hand-off to another process, the sentence's fate, the section's place, that it is required, the direction a row may point, the drawing, and three rows whose target the sentence left open. The rows listed under The instances are the settled content; each instance's pull request still goes to the owner.

## Where this comes from

A phase has one structured exit, `gate-to`, and the schema's `## Gate` asks for "the criteria that must be satisfied to leave the phase, one item each, and in a sentence after them what happens when they cannot be". Every phase in the three instances writes that sentence, and read together they say four different things. Some send the work back to an earlier phase: a specification reshaped goes back to Shape, and a plan whose specification is reopened goes back to Spec. Some keep it in the phase: a branch reworked, a plan recut, a change narrowed, an issue left open, a release held. Some stop the process: a request dropped, a branch abandoned, a pull request declined or closed. And one hands the work to another process: a narration clip whose note must change goes back through Delivery.

The first three are edges within one process, and a table can hold them. The fourth is not an edge into another process's phase but a fresh run of it, with its own first phase, and it stays prose.

## The section

`core/phase-schema.md` gains one row in `## Sections`, directly after `## Gate`:

| Section | Required | Description |
| --- | --- | --- |
| `## If not met` | Yes | Table. What the escalation authority may decide when the gate's criteria cannot be met, one row each, and where the work goes; its columns are declared below. A paragraph under the table may say what the rows cannot. |

and a column table after the one for `## What it produces`:

`## If not met` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Outcome` | Yes | string | What the escalation authority may decide, in a few words: `reworked`, `dropped` |
| `Leads to` | No | ref → phase | The phase the work goes to: this one, or one before it in the owning process's `## Phases`. Empty where the process stops. |

`## Gate` loses its closing sentence. Its description becomes "Bulleted. The criteria that must be satisfied to leave the phase, one item each", and the introductory line a gate opens with, "To leave Spec, all of these hold:", stays, as R16 allows a list section to open with a sentence.

The section is its own `##` and not a `### If not met` under `## Gate`, because the grammar has no form for a fixed `###` heading holding a table inside a list section: the one `###` form is `Grouped.`, where each heading names an entity. A nested heading would cost a grammar change in CONVENTIONS, the parser, the plugin and the MCP server to indent one heading. As its own section it is a column table like every other, each row draws its edge as `If not met.Leads to`, and `Outcome` reaches a reader in that edge's attributes, as the qualifier form already does for a row's other columns.

It is required because `escalation-authority` already is. A phase that names the seat deciding a failure and not what that seat may decide says half of it, and every phase in the three instances already writes the sentence, so none has to invent a failure to comply. The last phase is not exempt: what happens when Integrate's gate fails is what a reader of the last phase most needs.

Writing rules the schema gains:

- An outcome is what the escalation authority decides, in a word or a few, as a past participle where it can be: `reworked`, `narrowed`, `dropped`. It is not the gate criterion that failed.
- `Leads to` names this phase where the work stays in it, redone or waiting, and an earlier phase where the work goes back. It never names a later one: a failure that skips work is a happy path, and it belongs in `gate-to`.
- An empty `Leads to` stops the process. A hand-off to another process is a stop in this table, and the paragraph under it names the process the work goes to.
- Two rows may lead to the same phase; the outcome is what tells them apart.
- The paragraph under the table says only what the rows cannot, a reason or a hand-off, and a page whose rows say everything carries none.

The `gate-to` writing rules stay as they are, and one line is added to the rule on the last phase: its gate releases the work, and its `## If not met` still says what happens when it cannot.

## The checks

CONVENTIONS R16 says a required list section carries at least one item. It gains the same sentence for tables: a section that is required and declared `Table.` carries at least one row. Today a required table section with a header and no rows passes, since the checks hold rows that are there and R9 holds only that the section is present. The check is generic: it reads the schema's `Required` and `Table.` and names no type. Before the release, it is run against the three instances and `example/` to find any required table section that already holds no rows; any it finds is fixed in the instance, not exempted.

A second check holds the direction. It is found the way the order check is found, by what a schema declares: on a page of a type whose schema has a field declared `ref → <itself>` (the successor field, a phase's `gate-to`), a column declared `ref → <that type>` may name only an entity at or before the page's own position in its owner's order, the order the owner's table gives. It names no type, and a phase is the only type it reaches today. The same-process half needs no check: R4 already resolves a phase reference within its own process, so a row naming another process's phase is unresolved.

`verify/` gains, for each check, a fixture that fails (a required table section with its header and no rows; a row whose `Leads to` names a later phase) and the clean instance passing, so each check is shown able to fail before its zero is read. The `example/` instance's three phases gain their tables: Specify, reshaped → Specify and dropped → stop; Build, reworked → Build and abandoned → stop; Release, rolled back → stop.

## The instances

Each instance upgrades its core and rewrites every phase's sentence as a table in the same pull request, since the section is required. Outcomes are written as the sentence has them. An empty cell is written empty, shown here as —.

Delivery, in all three instances:

| Phase | Outcome | Leads to |
| --- | --- | --- |
| Shape | reshaped | Shape |
| Shape | dropped | — |
| Spec | reshaped | Shape |
| Spec | narrowed | Spec |
| Spec | dropped | — |
| Plan | recut | Plan |
| Plan | specification reopened | Spec |
| Implement | reworked | Implement |
| Implement | abandoned | — |
| Integrate | release held | Integrate |
| Integrate | reverted | — |

A revert stops the process rather than returning to Implement, because it undoes the merge rather than bringing the branch back into work: a second attempt is a new request with its own Shape, and Implement's own `reworked` is where work that continues goes.

Answering's Answer, in all three: `chat closed` → —, with the paragraph "The rules or the model are corrected through Delivery, and the chat opens again; no answer is corrected after the fact, because none is kept." What opens again is the chat, not the phase for the answer that failed, which is not retried.

Narrating's Narrate, in all three: `voice changes` → Narrate; `note changes` → —, with the paragraph "A note that changes goes back through Delivery."

Contribution, in companygraph and guestgraph:

| Phase | Outcome | Leads to |
| --- | --- | --- |
| Propose | carried on | Propose |
| Propose | stopped | — |
| Consider | pull request closed | — |
| Review | narrowed | Review |
| Review | carried on by someone else | Review |
| Review | declined | — |
| Integrate | reverted | — |

Review's `narrowed` stays in Review because a narrowed change is a subset of what Consider already accepted, and what is left of it still needs reviewing. Consider keeps its reason as a paragraph: the Owner says which criteria failed, with what would make a later pull request succeed. Contribution's Integrate keeps "rather than leaving the default branch in a state nobody chose", and Propose keeps "nothing here obliges anyone to finish what they started".

Propose's sentence names the Contributor as the one who decides, and its `escalation-authority` names the Owner. The diagram labels an arrow with the escalation authority, so it would say "Owner: carried on" for a decision the page says is the Contributor's. The instance pull request puts this to the owner as its first question: the field moves to Contributor, or the rows stand under the Owner and the paragraph says the Contributor may stop at any time.

Feature request, in companygraph and guestgraph:

| Phase | Outcome | Leads to |
| --- | --- | --- |
| Raise | stated with help | Raise |
| Understand | closed as not understood | — |
| Triage | left open | Triage |
| Answer | left open | Answer |

Each keeps its reason as a paragraph: a request nobody could phrase is still a finding; not understood is an answer, not a refusal; a request is not classified to be finished with it; an answer nobody can act on is not an answer.

## The diagram

mcp-server's `process` shape draws, after the solid `gate-to` arrows, one dashed arrow per phase and target, from the `If not met.Leads to` edges: `n2 -.->|"Owner: reshaped, dropped"| n0`. The label is the phase's escalation authority, a colon, and the outcomes of every row of that phase leading to that target, in table order, joined by commas, so two rows to one phase are one arrow rather than two lines Mermaid lays on top of each other. A row leading to its own phase is a self-loop, which Mermaid draws on the node in both directions the widget uses.

Stop rows, which draw no edge, are read from the phase's table. They lead to one node, `stop((Stop))`, drawn once per picture and only where some phase stops, styled dim by a `classDef` in the source. The node is not in `nodes` and its arrows are not in `links`: chat-server keeps only nodes that carry an entity `id`, the widget links every node in `nodes` to a page, and a stop is neither. The chat's note therefore states back arrows and not stops, and a stop stays readable on the phase through `get_entity`. `Stop` reads the same in German, so the picture needs no language of its own. The back arrows go into `links` like the solid ones, and `edges` counts both.

One shared stop node pulls arrows across the picture; Delivery would have four meeting there. Before the build is final, the new shape is run against the live reference instance and the Delivery picture is shown to the owner. If it tangles, a stop per phase is a change to how the node is named and nothing else.

## What was left out

A column for a hand-off to another process, `Hands to` typed `ref → process`, which would draw Narrate's return through Delivery. It is one case among every gate in the three instances, and its arrow would mean a new run rather than an edge between phases, unlike every other arrow on the picture. It can be added later without changing anything decided here.

Telling a wait from a redo. `release held` and `left open` lead to their own phase, as `reworked` does, and the picture draws both the same way; the outcome's words tell them apart.

A stop mark per phase, unless the preview calls for it; German labels for the picture; and any change to chat-server, design, the sites or the Obsidian plugin, none of which needs one: the plugin reads a `Table.` section and its columns from the schema.

## What it costs

A minor release of meta-model, with two checks and one R16 sentence, and a minor release of mcp-server. The order is meta-model's release; then the three instances each upgrade their core and write their tables, the reference instance first; then mcp-server's release, tested against the reference instance's tables; then the three MCP hosts re-pin mcp-server and their model; then the three sites re-pin their model, as they do for any model change.

Verification at the end is the instance checks green on all three instances with every phase carrying at least one row; each check shown failing on its fixture; on each MCP host, `get_entity` on Spec returning the three rows and `diagram` on Delivery returning dashed arrows for every row with a target and one Stop node; and on each chat, "show me the Delivery process" drawing the back arrows, with the answer stating none that `links` does not hold.
