# A bounded context is drawn as its flow and its lifecycle

Asked for a sequence diagram of Checking, the chat on companygraph.io answers that the model has no sequence shape, and it is right: the model holds no answer to what a sequence needs. A handled command is a row on its aggregate that names no event, an invariant names no outcome it guards, and `## State transitions` is a prose section no instance has written. The owner chose four views of a bounded context on October 4, 2026, in a mockup run on companygraph.io's own widget: its context map, its aggregate, its flow from a command to the events it emits, and its lifecycle. The first two went live the same day (companygraph/mcp-server #125 to #127, robertblust/design #232, companygraph/chat-server #83). This design gives the model what the other two need, in the software pack, and draws them.

Status: draft, written on October 4, 2026 against this repository at `635b8fd` (package 0.78.0, core and software pack 0.58.0), with companygraph/mcp-server at v0.55.2, robertblust/design at v0.134.1 and companygraph/chat-server at v0.25.1. The owner settled five questions before it was written, one at a time, and each is a section below.

## The gap

A sequence diagram of a context is a command arriving at an aggregate and the events that come out, with the condition under which each does. A state diagram is the states an aggregate passes through and what moves it. The aggregate schema says a command is a row of `## Handled commands`, with a `Command` and a `Description`, and that "the events it emits are not written here: each event names its aggregate as `emitted-by`." So the model can say which events an aggregate emits, but not which command emits which, nor when. The mockup drew Checking's flow by reading the sentences of its invariants, INV-K2 to INV-K4, and its states from the word "Refused, passed or failed" in an attribute's description: a picture no tool could draw without guessing, which is why the shapes were held back.

**What the change buys is a flow and a lifecycle for any aggregate whose page says them, drawn from cells and never from sentences, and an honest sentence where a page does not.**

## A command names the events it emits (question 1)

`## Handled commands` gains two optional columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Command` | Yes | string | The command, in the imperative: "Issue invoice" |
| `Emits` | No | ref → domain-event | An event the command emits, by its canonical name, an event of this context |
| `When` | No | string | When the command emits this event rather than another, in words; it may cite the invariants it rests on by their labels |
| `Description` | No | string | What it asks for, and what it refuses |

A row draws one edge, from the aggregate to the event `Emits` names, via `Handled commands.Emits`, and `Command`, `When` and `Description` qualify it, as every table's other cells do (CONVENTIONS, "A column table draws one edge per row"). A command that can emit two events is two rows with the same `Command`; one that emits none is one row with `Emits` left blank, which names nothing and draws no edge. `Emits` names a domain event, an owned type, and resolves within the owner the aggregate is written in, its bounded context, as `emitted-by` does from the other end.

A command is still a row and not a type: nothing outside the aggregate names it, and the aggregate schema's reason stands. The other two forms the owner weighed were commands as a type of their own, which the schema argues against, and an event naming its command as a string, which needs a check across pages the schema language does not have.

The schema's purpose paragraph changes its sentence on events: an event still names its aggregate as `emitted-by`, and a handled command may now name the events it emits, which is where the flow is read from. A writing rule says that an event a row names is one whose `emitted-by` is this aggregate; no check holds it in this release (§9).

## A branch is written in words (question 2)

`When` is free prose. Where one command has more than one row, the flow draws an `alt` block with a branch per row, each labeled with its `When`; a command of one row draws no `alt`. The checker holds `When` to nothing but text, so the picture shows the author's words and nothing pretends to be checked. A column holding one invariant's label, checked against the page's own `## Invariants`, was weighed and left: the schema language has no check of one cell against another table's labels, and it would carry only a refusal, never "the pins agree".

## A lifecycle is a table of transitions (question 3)

`## State transitions` becomes a table:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `From` | No | string | The state the aggregate leaves, blank for the transition that starts it |
| `Command` | No | string | The handled command that moves it, as `## Handled commands` writes it, blank for a step the aggregate takes on its own |
| `To` | Yes | string | The state it reaches |

A state is a word in a cell, not an entity, and a state that is never a `From` ends the lifecycle. No instance writes the section today, so turning it from prose into a table breaks no page. States declared as a list on the aggregate, with the table held to it, were weighed and left: a field and a check for something no instance writes yet. Deriving the lifecycle from the events was left too, because a state is not always an event: Checking's passed and failed are both `Instance checked`.

## The caller is not named (question 4)

The flow starts from one participant, `Caller`, which is no entity and links nowhere. The model does not say who sends a command: a context's `## Consumes` table names, in `Reaction`, a command in words, and a `Sent by` column could name a context, but neither is written by any instance, and a name the picture puts on the caller would be the one claim in it the model does not make. A named caller is its own question, once an instance writes `## Consumes` rows that could carry it.

## The four views (question 5)

Asked to see a bounded context, the chat draws its context map, its aggregates, and, where the model has them, its flow and its lifecycle. Where an aggregate has no `Emits` row or no transitions, the tool refuses that view as `cannot_draw` with `reason: "empty"`, and the answer says in one sentence that the model does not describe that flow or lifecycle yet. A question for one view, "show me the sequence of Checking", draws that view alone, as a specific question does today.

## The pictures

`companygraph/mcp-server`'s `diagram` gains two values of `shape`, both taking `id`, an aggregate's or a bounded context's.

**`flow`** is a `sequenceDiagram`. Its participants are `Caller` and one per aggregate drawn, labeled with the aggregate's name. For each command of an aggregate, in the order of its table, one message from `Caller` to the aggregate carries the command, and each of its rows with an `Emits` answers with a dashed message back carrying the event's name; a command with several rows wraps them in `alt` and `else`, each labeled with its `When`, blank where a row has none. Given a context, every aggregate it holds is drawn in one picture, aggregates in name order. `nodes` names the aggregates and the events with their ids, so a client can say what was drawn; Mermaid's sequence participants are not linked by the widget, which finds a node only in a flowchart or a class diagram.

**`lifecycle`** is a `stateDiagram-v2`. Each distinct state of an aggregate is one state, named `s0`, `s1` and on with its words as the label; a blank `From` is the start, `[*] --> state`, and a state never a `From` ends, `state --> [*]`; each row is one transition, labeled with its `Command` where there is one. Given a context, each aggregate with transitions is one composite state labeled with its name. `nodes` names the aggregates.

Both escape a label as every shape does, hold the fifty-node cap, counting participants and messages for a flow and states for a lifecycle, and refuse as `cannot_draw`: `empty` where nothing is to be drawn, `too_large` past the cap. An instance without the software pack refuses both with `unknown_type`.

`robertblust/design`'s chat widget draws both kinds: Mermaid's sequence and state diagrams at their own size, with the sequence's fonts and spacing the mockup settled (actor and message text at the panel's size, a narrow actor box), captioned "Flow" and "Lifecycle" ("Ablauf" and "Lebenszyklus" in German), each with a reading line: for a flow, that solid arrows are commands and dashed arrows the events they emit, and a box names the condition of each branch; for a lifecycle, that each arrow is a step from one state to the next, labeled with the command that takes it where there is one.

`companygraph/chat-server`'s note gives a flow's relations as sentences, as it does a context map's and an aggregate's: "Check run emits Run refused on Check an instance when a pin disagrees (INV-K2, INV-K3, INV-K4)". A lifecycle's are "Check run moves from Comparing to Refused". `DIAGRAM_RULE` asks for the four views for a bounded context, and the answer names the views the model does not have.

## Checking, written

The design is held to one real context before any release. Check run, in companygraph/mental-model, would gain these rows, shown to the owner and committed only on the owner's word:

| Command | Emits | When | Description |
| --- | --- | --- | --- |
| Check an instance | Run refused | a pin disagrees (INV-K2, INV-K3, INV-K4) | Holds every page to the vendored schemas and every recorded file to its hash; refuses when the pins disagree, the core is newer or a pack is unknown |
| Check an instance | Instance checked | the pins agree | |

and, for its lifecycle:

| From | Command | To |
| --- | --- | --- |
| | Check an instance | Comparing |
| Comparing | | Refused |
| Comparing | | Reading |
| Reading | | Passed |
| Reading | | Failed |

The other seven aggregates in companygraph/mental-model are their owner's to fill, each in its own change.

## Tests

meta-model: the aggregate schema's two new columns and the table form of `## State transitions` parsed from a fixture page; `Emits` drawing one edge per row via `Handled commands.Emits`, a blank `Emits` drawing none, an `Emits` naming another context's event failing R4; a `## State transitions` written as prose failing as a section that is a table; the worked example and the three instances still passing.

mcp-server: the whole Mermaid source of a flow with one command of two rows (an `alt`), one of one row, and one with no `Emits`; a context with two aggregates in one flow; a lifecycle with a start, two branches and two ends, and a context's composite states; every refusal; a `When` and a state holding a quote, a colon and a semicolon. A render of both shapes for Checking with the vendored Mermaid.

design and chat-server: as the first two views were tested (companygraph/mcp-server `docs/superpowers/specs/2026-10-04-a-bounded-context-is-drawn-design.md`, §5), and the chat measured against the host serving companygraph/mental-model with Checking's rows, asking for the diagrams of Checking and for its sequence, in English and German.

## Release and order

meta-model releases the pack, with the core version unchanged unless the release needs it, and its notes say the aggregate schema changed. companygraph/mental-model takes it and then Checking's rows, on the owner's word. mcp-server takes the release, adds the two shapes and releases; its hosts re-pin. design releases the widget; the sites re-pin. chat-server releases its note and rule; the chats re-pin after their sites. Each merge, release and re-pin is the owner's to allow, each release created on the merge commit of its own version bump.

## Out of scope

A check that an event a row names has this aggregate as its `emitted-by`. A named caller. An invariant as an entity a branch could reference. Commands as a type. The other seven aggregates' rows. A process's back flows, which the process shape already draws.
