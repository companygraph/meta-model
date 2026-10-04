# A context is drawn as its flow and its lifecycle implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the software pack's aggregate names which command emits which event and the states it passes through, `diagram` draws a bounded context's `flow` and `lifecycle`, the widget draws sequence and state diagrams, and the chat shows all four views of a context.

**Architecture:** Five repositories, one pull request each (two in companygraph/mental-model), in the order the spec releases them. meta-model changes only the prose schema `packs/software/aggregate-schema.md`, since the schema written as prose is the only schema; the parser and the checks follow it. mental-model takes the release and migrates its tables, then writes Checking's rows. mcp-server reads the new section and columns and adds two shapes. design teaches the widget sequence and state diagrams. chat-server words the new relations and asks for four views.

**Tech Stack:** Node 22+, `node:test`, zod 4, Mermaid 12.0.0 (vendored in design), Playwright's Chromium. No dependency is added.

**Spec:** `docs/superpowers/specs/2026-10-04-a-context-is-drawn-as-its-flow-and-lifecycle-design.md` in companygraph/meta-model, pull request #283. Read it before any task.

## Global Constraints

- **One worktree per repository and branch, beside its clone, from `origin/main`:** `git -C <clone> fetch -q && git -C <clone> worktree add ../<repo>-<branch> -b <branch> origin/main`. A clone stays on `main` and is never edited. `npm ci` in each new worktree.
- **`export PATH=/opt/homebrew/bin:$PATH`** before any `node`, `npm`, `npx`, `gh` or `sh conventions/…`. A push: `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin <branch>`.
- **Every command's exit code is read on its own**, never through a pipe into `tail` or `head`.
- **Before every commit:** the repository's full suite, `sh conventions/conventions-check` and `sh conventions/conventions-format check`, all exit 0.
- **Commits** are authored by the seat: `Implementer <implementer@companygraph.io>` in companygraph repositories, `Implementer <implementer@blust.ch>` in robertblust/design; a model page's prose in companygraph/mental-model is the `Writer <writer@companygraph.io>` with `Track: Prose`. Trailers `Process: Delivery`, `Phase: Implement`, `Track: Code` (or `Prose`), then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The git register of `conventions/WRITING.md`: a plain-sentence subject under seventy characters, one to three prose paragraphs, a `Verified:` line naming what ran with no test counts. Message to a file, `git commit -F`; check `git log -1 --format='[%s]'`. Never amend a commit a reviewer has read.
- **Pull requests:** read the repository's last two merged bodies first; prose only, no headings, bullets or checkboxes; a `Verified:` sentence; a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Each repository's last task opens its pull request and stops: **nothing is merged, released, tagged, deployed or deleted by an agent.**
- **A release** is the owner's step: a version-bump pull request, merged, then `gh release create v<x> --target <that merge commit's SHA>`, never a target computed before the merge is confirmed. A later task that needs a release waits for it.
- **No count or version of something that still moves** in prose or comments. Comments say why, present tense, no history.
- **lib/ names no entity of a fixture** (mcp-server's `test/portability.test.mjs`).
- **A model page is shown to the owner before it is committed**, in chat, and committed only on the owner's word (Task 3).

### Rulings where the plan corrects the spec

Found by running a prototype of meta-model's schema change and mcp-server's shapes before this plan was written:

- **The new columns are not optional per table.** A column table writes every column its schema declares, so once `Emits` and `When` are declared, a `## Handled commands` table written `Command | Description` fails ("columns are Command|Description; the schema declares Command|Emits|When|Description"). companygraph/mental-model holds eight such aggregates, so taking the release migrates them (Task 2), and the release notes say an instance that writes `## Handled commands` fails until it adds the two columns. The spec's "breaks no page" holds only for `## State transitions`.
- **A prose `## State transitions` does not fail.** The checks do not hold a table section's body to being a table, so the spec's test of that is dropped; nothing new is invented to hold it.
- **A branch that emits nothing is drawn as `Note over <aggregate>: —`**, an em dash: a note's words would be the one text in the source written in a language, and an empty last branch puts its condition below the `alt` frame, so the frame needs something inside it (both rendered 2026-10-04).
- **A lifecycle answers `transitions`,** an optional output field `[{ aggregate, from, to, command }]`, since a state is no entity and so no node a link could join; a flow's links carry their label as `Command · When` (`·` with a space each side), or `Command` where the row has no `When`.

## Review Focus

- **A command whose rows are all blank `Emits`** draws its message and an `alt` whose branches each hold a dash, never a refusal. Task 4 holds it.
- **The same event named by two commands** draws two links, each labeled with its own command. Task 4 holds it.
- **A state named in two aggregates of one context** is two states, one in each composite. Task 4 holds it.
- **An instance whose aggregates have no handled commands or no transitions** answers a context's flow or lifecycle as `cannot_draw` `empty`, and the chat says so in one sentence. Tasks 4 and 7 hold it.
- **A German answer** states the flow's and the lifecycle's relations in German from English `says` sentences. Task 7 measures it.

---

## Part A — `companygraph/meta-model`

### Task 1: The aggregate names its commands' events and its transitions

**Files:** Modify `packs/software/aggregate-schema.md`; Test `verify/software.test.mjs`.

**Interfaces:** Produces the edge `Handled commands.Emits` (aggregate → domain-event) with qualifiers `Command`, `When`, `Description`, and the table section `State transitions` with columns `From`, `Command`, `To`, which Tasks 2 to 7 read.

- [ ] **Step 1: The failing tests.** In `verify/software.test.mjs`, beside the existing tests over `tree()`, add tests that (a) an aggregate with `## Handled commands` written `Command | Emits | When | Description` with three rows — one naming `Invoice issued`, one naming a second event of the same context, and one with `Emits` blank — and a `## State transitions` table `From | Command | To` passes with no failure; (b) an `Emits` naming an event of another context fails with the R5 message naming `Emits` and "is not one of its bounded-context's own"; (c) a `## Handled commands` table written `Command | Description` fails with the message that its columns are `Command|Description` and the schema declares `Command|Emits|When|Description`. Add the second event page (`invoice-voided.md`, `emitted-by: Invoice`) inside the test, as `tree((m) => …)` does elsewhere.

Run: `npm run test:instance-checks`

Expected: FAIL on (a) and (c) against today's schema.

- [ ] **Step 2: The schema.** In `packs/software/aggregate-schema.md`:

The `## State transitions` row of the sections table becomes:

```markdown
| `## State transitions` | No | Table. The states the aggregate moves through and what moves it, one transition per row (DDD Crew, Aggregate Design Canvas); its columns are declared below. |
```

The `## Handled commands` column table becomes, followed by the new table:

```markdown
| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Command` | Yes | string | The command, in the imperative: "Issue invoice" |
| `Emits` | No | ref → domain-event | An event the command emits, by its canonical name, an event of this context; a command that emits two is two rows |
| `When` | No | string | When the command emits this event rather than another, in words; it may cite the invariants it rests on by their labels |
| `Description` | No | string | What it asks for, and what it refuses |

`## State transitions` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `From` | No | string | The state the aggregate leaves, blank for the transition that starts it |
| `Command` | No | string | The handled command that moves it, as `## Handled commands` writes it, blank for a step the aggregate takes on its own |
| `To` | Yes | string | The state it reaches; a state that is never a From ends the lifecycle |
```

In `## Purpose`, the sentence "The events it emits are not written here: each event names its aggregate as `emitted-by`, and the edge is read from that end." becomes: "Each event names its aggregate as `emitted-by`, and a handled command may name the events it emits, one row per command and event, which is where a flow is read from; when it emits one rather than another is said in words, and may cite the invariants it rests on." In `## Writing rules`, add: "- An event `Emits` names is one whose `emitted-by` is this aggregate." and "- A `Command` in `## State transitions` is written as `## Handled commands` writes it."

Run: `npm run test:instance-checks`, then `npm run verify` and every `test:*` script.

Expected: PASS, every suite; the worked example and the instance fixtures do not write `## Handled commands`, so nothing else moves. If an existing fixture does write it, add the two columns to that fixture's table, blank.

- [ ] **Step 3: Commit, push, open the pull request, stop.** Subject: `A handled command names the events it emits`. The body says the columns, the table, that an instance which writes `## Handled commands` fails until it adds `Emits` and `When` (blank is fine), that the release is the owner's, and that the core moves with it as every pack change has ("Core 0.59.0 and the package at 0.79.0", made by the owner's release step, which moves `core/manifest.json`, the pack's manifest, `package.json` and both reusable workflows' refs together, as the release check requires).

---

## Part B — `companygraph/mental-model` (after the meta-model release)

### Task 2: Take the release and migrate the tables

- [ ] **Step 1:** Worktree, then the pin's own move: `npx --yes 'github:companygraph/meta-model#v<release>' upgrade`.
- [ ] **Step 2:** `npx --yes "github:companygraph/meta-model#v$(node -e "console.log(require('./.companygraph/manifest.json').tooling)")" check .` Expected: FAIL, one finding per aggregate whose `## Handled commands` is written `Command | Description` (eight today).
- [ ] **Step 3:** In each failing page, rewrite the table's header and separator to `| Command | Emits | When | Description |` and give every row two blank cells after `Command`. Change nothing else in the page.
- [ ] **Step 4:** The check again. Expected: PASS. Commit as Implementer (the form moved, no content), `Track: Code`; subject `Takes meta-model v<release> and widens the command tables`. Open the pull request; stop.

### Task 3: Checking's flow and lifecycle (on the owner's word)

- [ ] **Step 1:** In a worktree from `main` after Task 2 merges, write in `model/bounded-contexts/checking/aggregates/check-run.md` the rows the spec's "Checking, written" section gives: `Check an instance` twice, once emitting `Run refused` when "a pin disagrees (INV-K2, INV-K3, INV-K4)" with today's Description, once emitting `Instance checked` when "the pins agree"; and a `## State transitions` table after `## Handled commands` with the five rows the spec gives.
- [ ] **Step 2:** **Show the two tables to the owner in chat** and wait for their word. Commit only then, as `Writer <writer@companygraph.io>`, `Track: Prose`; the check passes first. Open the pull request; stop.

---

## Part C — `companygraph/mcp-server` (after the meta-model release)

### Task 4: The flow and the lifecycle

**Files:** Modify `package.json`/`package-lock.json` (the meta-model pin to the release), `lib/diagram.mjs`, `lib/schemas.mjs`, `test/helpers.mjs`, `test/diagram.test.mjs`.

- [ ] **Step 1: Pin and fixtures.** Move `companygraph-meta-model` to the release tag with `npm install companygraph-meta-model@github:companygraph/meta-model#v<release>`; prove `package-lock.json` resolves to the tag's commit; `npm run fixtures`. In `test/helpers.mjs`, `aggregate()` takes commands and transitions and the Quote and Price list aggregates write them:

```js
const aggregate = (id, name, root, members, commands = [], transitions = []) =>
  `---\nid: ${id}\nsource: Local\nroot: ${root}\nmembers:\n${members.map((m) => `  - ${m}\n`).join("")}---\n\n# ${name}\n\n> What the test needs kept consistent.\n\n## Invariants\n\n${table(["Label", "Invariant"], [["INV-T1", "It holds after every change."]])}`
  + (commands.length ? `\n## Handled commands\n\n${table(["Command", "Emits", "When", "Description"], commands)}` : "")
  + (transitions.length ? `\n## State transitions\n\n${table(["From", "Command", "To"], transitions)}` : "");
```

```js
  write(dir("quoting", "aggregates", "quote.md"), aggregate(C.quote, "Quote", "Quote", ["Quote line", "Money", "Discount", ...crowded.map((n) => `Part ${n}`)],
    [["Send quote", "Quote sent", "", "Sends it to the customer"], ["Accept quote", "Quote accepted", "the customer signs before it expires", ""], ["Accept quote", "", "it has expired (INV-T1)", ""]],
    [["", "Send quote", "Sent"], ["Sent", "Accept quote", "Accepted"], ["Sent", "", "Expired"]]));
  write(dir("quoting", "aggregates", "price-list.md"), aggregate(C.priceList, "Price list", "Price list", ["Money"], [["Publish price list", "", "", ""]]));
```

- [ ] **Step 2: The failing tests** in `test/diagram.test.mjs`, over `const B = withContexts()` and `K = CONTEXT_IDS`: a flow of `K.quote` is exactly

```text
sequenceDiagram
  participant caller as Caller
  participant n0 as Quote
  caller->>n0: Send quote
  n0--)caller: Quote sent
  caller->>n0: Accept quote
  alt the customer signs before it expires
    n0--)caller: Quote accepted
  else it has expired (INV-T1)
    Note over n0: —
  end
```

with nodes `n0` Quote (its aggregate id), `n1` Quote sent, `n2` Quote accepted and links `{n0→n1 "Send quote"}`, `{n0→n2 "Accept quote · the customer signs before it expires"}`; a flow of `CONTEXT_ID` draws Price list (`n0`, its one command and no answer) before Quote (`n1`); a lifecycle of `K.quote` is exactly

```text
stateDiagram-v2
  state "Sent" as s0
  state "Accepted" as s1
  state "Expired" as s2
  [*] --> s0 : Send quote
  s0 --> s1 : Accept quote
  s0 --> s2
  s1 --> [*]
  s2 --> [*]
```

with `transitions` `[{Quote, null→Sent, "Send quote"}, {Quote, Sent→Accepted, "Accept quote"}, {Quote, Sent→Expired, null}]`; a lifecycle of `CONTEXT_ID` wraps the same lines, indented four spaces, in `  state "Quote" as n0 {` … `  }`; `cannot_draw` `empty` for a flow of `K.archive` and a lifecycle of `K.priceList`; `invalid_argument` for an id of another type; `unknown_type` on the worked example; the Review Focus cases above (all-blank `Emits`, one event under two commands, one state name in two aggregates); a `When`, a command and a state holding a quote, a colon and a semicolon, escaped as `#quot;`, `#58;`, `#59;` (rendered correctly 2026-10-04). Update the shape list in the refusal test to all eight shapes.

Run: `node --test test/diagram.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement.** `SHAPES` appends `"flow", "lifecycle"`; `TAKES.id` takes both; the dispatch calls `flow(s, id)` and `lifecycle(s, id)`; `OUTPUTS.diagram` gains `transitions: z.array(z.strictObject({ aggregate: z.string(), from: z.string().nullable(), to: z.string(), command: z.string().nullable() })).optional()`. Above `TAKES` in `lib/diagram.mjs`:

```js
// The aggregates a flow or a lifecycle is drawn for: the one an id names, or every aggregate the
// context an id names holds, in name order, as the aggregate picture takes them.
function aggregatesOf(s, id) {
  requireType(s, "aggregate");
  const e = requireId(s, id);
  if (e.type !== "aggregate" && e.type !== "bounded-context")
    throw new ModelError("invalid_argument", `id names ${e.id}, which is a ${e.type} and not an aggregate or a bounded-context`, { details: { argument: "id", reason: "not an aggregate or a bounded-context" } });
  return { e, aggs: e.type === "aggregate" ? [e] : s.entities.filter((x) => x.type === "aggregate" && x.owner === e.id).sort(byName) };
}
// A table's cell by its column's name, blank where the table has no such column.
const cellOf = (table, row, column) => { const i = table.columns.indexOf(column); return i < 0 ? "" : text(row[i]).trim(); };

// A flow: a command sent to an aggregate and the events it emits, read from the aggregate's
// handled commands in the order its table writes them. The section and the column an event is
// named in are read from the one reference an aggregate declares to a domain event, so neither is
// written here. A command of several rows is an alt, one branch per row under its When; a row that
// names no event is a branch in which nothing is emitted, holding a dash. The sender is one participant, Caller,
// which is no entity: the model does not say who sends a command.
function flow(s, id) {
  const { e, aggs } = aggregatesOf(s, id);
  const decl = relationsOf(s).relations.find((r) => r.from === "aggregate" && r.to === "domain-event");
  if (!decl) throw cannot("flow", "empty", 0);
  const [section, column] = decl.via.split(".");
  const edges = allEdges(s).filter((x) => x.via === decl.via);
  const drawn = [];
  for (const a of aggs) {
    const table = a.sections.find((x) => x.heading === section)?.tables?.[0];
    if (!table || !table.rows.length) continue;
    const groups = [];
    for (const row of table.rows) {
      const command = cellOf(table, row, "Command"), named = cellOf(table, row, column), when = cellOf(table, row, "When");
      if (!command) continue;
      const event = named ? edges.find((x) => x.from.id === a.id && x.to.name === named && text(x.attrs?.Command) === command)?.to ?? null : null;
      let g = groups.find((x) => x.command === command);
      if (!g) { g = { command, rows: [] }; groups.push(g); }
      g.rows.push({ event, when });
    }
    if (groups.length) drawn.push({ a, groups });
  }
  if (!drawn.length) throw cannot("flow", "empty", 0);
  const messages = drawn.reduce((n, d) => n + d.groups.reduce((m, g) => m + 1 + g.rows.filter((r) => r.event).length, 0), 0);
  if (drawn.length + 1 + messages > DIAGRAM_CAP) throw cannot("flow", "too_large", drawn.length + 1 + messages);
  const { nodes, of } = namer();
  const lines = ["sequenceDiagram", "  participant caller as Caller"];
  for (const { a } of drawn) lines.push(`  participant ${of(a)} as ${unquoted(a.name)}`);
  const links = [];
  for (const { a, groups } of drawn) {
    for (const { command, rows } of groups) {
      lines.push(`  caller->>${of(a)}: ${unquoted(command)}`);
      // A branch in which nothing comes back holds a note of one dash: an empty last branch puts its
      // condition below the frame, and a word would be the one text in the source written in a language.
      const back = (r) => (r.event ? `${of(a)}--)caller: ${unquoted(r.event.name)}` : `Note over ${of(a)}: —`);
      if (rows.length === 1) { if (rows[0].event) lines.push(`  ${back(rows[0])}`); }
      else { rows.forEach((r, i) => lines.push(`  ${i ? "else" : "alt"} ${unquoted(r.when)}`, `    ${back(r)}`)); lines.push("  end"); }
      for (const r of rows) if (r.event) links.push({ from: of(a), to: of(r.event), label: plain(r.when ? `${command} · ${r.when}` : command) });
    }
  }
  return { title: e.name, mermaid: lines.join("\n"), nodes, links, edges: links.length, omitted: 0 };
}

// A lifecycle: the states an aggregate passes through, one transition per row of its table, read in
// the table's order. A blank From starts it, a state that is never a From ends it, and a step with
// no command is one the aggregate takes on its own. A state is a word in a cell and no entity, so
// it is named s0, s1 and on with its words as the label; a context's aggregates are each a
// composite state under its name.
function lifecycle(s, id) {
  const { e, aggs } = aggregatesOf(s, id);
  const drawn = [];
  for (const a of aggs) {
    const table = a.sections.find((x) => x.heading === "State transitions")?.tables?.[0];
    const rows = (table?.rows ?? []).map((r) => ({ from: cellOf(table, r, "From"), command: cellOf(table, r, "Command"), to: cellOf(table, r, "To") })).filter((r) => r.to);
    if (rows.length) drawn.push({ a, rows });
  }
  if (!drawn.length) throw cannot("lifecycle", "empty", 0);
  const states = drawn.reduce((n, d) => n + new Set(d.rows.flatMap((r) => [r.from, r.to]).filter(Boolean)).size, 0);
  if (states > DIAGRAM_CAP) throw cannot("lifecycle", "too_large", states);
  const { nodes, of } = namer();
  const lines = ["stateDiagram-v2"];
  const transitions = [];
  let k = 0;
  const composite = drawn.length > 1 || e.type === "bounded-context";
  for (const { a, rows } of drawn) {
    const ids = new Map();
    const sid = (name) => { if (!ids.has(name)) ids.set(name, `s${k++}`); return ids.get(name); };
    const pad = composite ? "    " : "  ";
    const body = [];
    for (const name of [...new Set(rows.flatMap((r) => [r.from, r.to]).filter(Boolean))]) body.push(`${pad}state "${label(name)}" as ${sid(name)}`);
    for (const r of rows) {
      body.push(`${pad}${r.from ? sid(r.from) : "[*]"} --> ${sid(r.to)}${r.command ? ` : ${unquoted(r.command)}` : ""}`);
      transitions.push({ aggregate: a.name, from: r.from || null, to: r.to, command: r.command || null });
    }
    const froms = new Set(rows.map((r) => r.from).filter(Boolean));
    for (const name of new Set(rows.map((r) => r.to))) if (!froms.has(name)) body.push(`${pad}${sid(name)} --> [*]`);
    if (composite) lines.push(`  state "${label(a.name)}" as ${of(a)} {`, ...body, "  }");
    else { of(a); lines.push(...body); }
  }
  return { title: e.name, mermaid: lines.join("\n"), nodes, links: [], transitions, edges: transitions.length, omitted: 0 };
}
```

Run: `node --test test/diagram.test.mjs`, `node --test test/portability.test.mjs`, then `npm test`. Expected: PASS.

- [ ] **Step 4: Commit.** Subject: `A context is drawn as its flow and its lifecycle`.

### Task 5: The tool's surface, a render of Checking, the pull request

As the context map's Task 3 did (companygraph/mcp-server `docs/superpowers/plans/2026-10-04-a-bounded-context-is-drawn.md`, Task 3), for the two new shapes: the description (exactly, 59 words: "A picture of the model as Mermaid, from its edges or its schemas. Use to show connections; for edges as data use list_references. Input: `shape`; `id`, `domain` or `type` narrow it; an aggregate, flow or lifecycle takes a context's id for all its aggregates. Returns `mermaid`, `nodes`, `links`, `title`, `edges`, `omitted`, schema's `everyType`, lifecycle's `transitions`. At most 50 nodes."), `id`'s description naming them, contract tests over `withContexts()` for both shapes and their `unknown_type` refusals on both fixtures, two interface examples (`### \`diagram\` flow` and `### \`diagram\` lifecycle`, each heading followed by a fence holding `{}` for `npm run interface` to fill), INTERFACE.md's `diagram` prose, the README row. Render Checking's flow and lifecycle from companygraph/mental-model at the commit Task 3 merged, with the vendored Mermaid, and look at both. Push, open the pull request; stop.

---

## Part D — `robertblust/design`

### Task 6: The widget draws sequence and state diagrams

**Files:** `assets/chat.js` (strings, `mermaidConfig`), `test/fixtures/diagrams.json`, `test/chat.test.mjs`, `test/chat-diagram.test.mjs`.

- [ ] `mermaidConfig` gains `sequence: { useMaxWidth: false, mirrorActors: false, actorFontSize: 13, messageFontSize: 13, noteFontSize: 12, actorMargin: 24, width: 150, height: 40, boxMargin: 6, messageMargin: 26, diagramMarginX: 8, diagramMarginY: 8 }` and `state: { useMaxWidth: false }` (the mockup's values, with the actor width raised from 104 to 150, which keeps a branch's condition from wrapping into fragments). The strings gain `flow: "Flow"`, `lifecycle: "Lifecycle"` and in German `flow: "Ablauf"`, `lifecycle: "Lebenszyklus"`; `reading.flow`: "Solid arrows are commands sent to the aggregate, dashed arrows the events it emits; a box names the condition of each branch." / German "Durchgezogene Pfeile sind Befehle an das Aggregat, gestrichelte die Ereignisse, die es auslöst; ein Kasten nennt die Bedingung jedes Zweigs."; `reading.lifecycle`: "Each arrow is a step from one state to the next, labeled with the command that takes it where there is one." / German "Jeder Pfeil ist ein Schritt von einem Zustand zum nächsten, beschriftet mit dem Befehl, der ihn auslöst, wo es einen gibt." The German lines go to the Translator's review in the pull request.
- [ ] Fixtures `flow` and `lifecycle` are Task 4's two Quote pictures as `{ shape, title, mermaid, nodes, omitted }`. Tests: both captions and reading lines in both languages; an answer bringing a context, an aggregate, a flow and a lifecycle draws four fitted figures in order, each opening full screen; a flow and a lifecycle draw as SVG in both themes with no fallback source. A browser check at 1280×900 and 390×844, dark and light, looked at. Push, open the pull request; stop.

---

## Part E — `companygraph/chat-server` (after Tasks 5 and 6 are released and taken by the hosts and sites)

### Task 7: Four views, and their relations in words

**Files:** `lib/loop.mjs` (`diagramOf`, `diagramNote`), `lib/prompt.mjs` (`DIAGRAM_RULE`), `test/loop.test.mjs`, `test/prompt.test.mjs`.

- [ ] `diagramOf` keeps a lifecycle's `transitions` for the note and strips it from the `diagram` event, as it strips `links`. `diagramNote` gives a flow's link as `{ emitter, event, command, when, says }` with `says` "<aggregate> emits <event> on <command>" and, where the label has a `When` after ` · `, " when <When>"; a lifecycle's `transitions` as `{ aggregate, from, to, command, says }` with `says` "<aggregate> starts in <to>" for a blank `from`, else "<aggregate> moves from <from> to <to>", plus " on <command>" where there is one; and for both shapes the sentence the aggregate shape carries, "Each relation's says states it as the picture draws it. State each relation as its says states it, in the answer's language, in words." `DIAGRAM_RULE`'s bounded-context clause becomes: a visitor who asks to see a bounded context, or the diagrams of one, is shown shape context, then aggregate, then flow, then lifecycle, all with the context's id; where flow or lifecycle refuses as empty, the answer says in one sentence that the model does not describe that flow or lifecycle yet; one who asks for the sequence or the lifecycle of a context or an aggregate is shown that shape alone.
- [ ] Tests for each sentence form, the strip, and the rule's clauses. Measure locally against a host serving companygraph/mental-model at Task 3's merge commit with Task 5's build: "can you show me the diagrams for checking" (four pictures, every stated relation true), "show me the sequence diagram of checking" (the flow alone), and the first in German; then once against a context with no rows, to hear the sentence. Push, open the pull request; stop.

## After the plan: the owner's steps, in order

meta-model #283 merged; Task 1 merged and released (core 0.59.0, package 0.79.0). Task 2 merged; Task 3 merged on the owner's word. mcp-server Tasks 4–5 merged and released; hosts re-pinned. design Task 6 merged and released; sites re-pinned. chat-server Task 7 merged and released; chats re-pinned after their sites. guestgraph's and robertblust's mental-models take the meta-model release in their next resync; neither writes `## Handled commands`, so neither migrates.
