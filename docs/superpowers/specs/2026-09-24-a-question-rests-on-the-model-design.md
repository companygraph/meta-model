# A question rests on the model

A visitor asks in their own words, and the model is written in the company's. The chat reaches the model through a words search, so a question phrased the way people phrase it, or asked in German, finds nothing although the model holds the answer. Core gains a type `question`: one file per question as it is asked, a short answer that routes to the entities holding the facts, and a table naming those entities. The chat carries the instance's questions in its prompt and matches a visitor's words to them by meaning, then answers from the entities the question rests on.

Status: decided by the owner on September 24, 2026, one question at a time. The answer routes and states no fact of its own, rather than a full prose answer or no answer at all. Audience is left out until a page wants to filter by it. The chat reaches the questions through an index in its prompt, capped, rather than through the words search alone or a ranking boost in the server. A question references entities of any type through a new form of the vocabulary, a reference whose type is read from its row, rather than a frontmatter list per type; and the owner form R4 left to be designed when wanted is designed here, because a question has to reach an experience. Both instances are seeded in the first round.

## The type

`question` is owned by nothing, so its files sit in the container, `model/questions/*.md`, as a concept's do and for the same reason: a question points at entities of every type and owner, and belongs to none of them.

```markdown
# Question Schema

> Required structure for question files.

## File Location

`model/questions/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Question]` | Yes | The question as a visitor asks it, ending in a question mark. Every reference to it uses this exact string. |
| `> [Answer]` | Yes | One or two sentences that say where the answer lies and state no fact the model holds elsewhere |
| `## Rests on` | Yes | Table. One row per entity the answer comes from; its columns are declared below. |

`## Rests on` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `profile`, `strategic-objective` |
| `Entity` | Yes | ref → by Type in Owner | The entity the answer comes from, by its canonical name |
| `Owner` | No | string | Where `Type` is an owned type, the entity that owns this one, by its canonical name; blank otherwise |
| `For` | No | string | The part of the answer this entity carries, where the answer rests on more than one |
```

Purpose, as the schema will say it: a question answers "where in the model is the answer to what people actually ask?" It is the bridge from a visitor's words to the company's. The facts stay where they are mastered, and the question names them, so a fact changed on its own page is changed for every question that rests on it and no answer goes stale.

Writing rules:

- The H1 is worded as people ask, not as the model names things: "Can Robert still write code himself?", not "Software engineering proficiency". A question worded in the model's own vocabulary adds nothing the words search did not already find.
- The answer routes. It may say what kind of thing the answer is and where it lies, and it may say what the model does not claim; it states no count, version, date or fact that an entity in `## Rests on` holds, because that would be a second copy nothing keeps true.
- Every entity the answer draws on has a row, and no row names an entity the answer does not draw on.
- A question is not an alias. A concept's other names belong in its `## Also known as`; a question is how people ask, not what a thing is called.
- Names and prose are American English (R14). A visitor asking in German is matched by the chat, not by a German question.
- One question per thing asked. Two wordings of the same question are one file; the H1 takes the wording people use most.

`## Rests on` is required, and so is the answer, because a question with nothing under it is an open issue and not an entity. What the model is asked and cannot answer yet is a change to the model, written as one, and the question follows it.

## A reference whose type is read from its row

Every reference today declares its type in the schema, and the pair of type and name is what resolves. A question has to reach a profile in one row and a value in the next, which no single declared type can say. R9's closed vocabulary gains one form:

`ref → by <Column>` — a column whose cells name an entity of the type the same row's `<Column>` cell names.

`ref → by <Column> in <Owner>` — the same, where the type may be owned: the same row's `<Owner>` cell names the owner.

The form is legal in a column table only, because it needs a row to read its type from; in a frontmatter field it is an error in the schema. `<Column>` and `<Owner>` are columns of the same table typed `string`, and a declaration naming anything else is an error in the schema. Required on the `by` column means what it always means, and its type column is required wherever the `by` column is, since a name with no type cannot resolve.

R4 is held to it cell by cell. The type cell names a type the instance's core declares, by the name of its schema file without `-schema.md`; a type cell naming no type is R4, since the reference has no type to resolve against. The entity cell then resolves as a `ref → <that type>` would. Where the type is owned (R10), the owner cell is filled, it resolves as a reference to the type R10 declares as that type's owner, and the entity cell resolves within that owner, as R4 resolves any owned name within the owner it is written in. Where the type is not owned, the owner cell is blank, and a filled one is an error because it scopes a name that has no scope.

R4's closing sentence, "Should a reference from outside ever be wanted, it names the owner as well, and that form is designed when it is," is replaced by one saying that it has been: a reference from outside an owner is the `in <Owner>` form, and the owner is named in its own cell, never folded into the name.

R16: a `by` cell draws one edge, as a `ref → <type>` cell does, via `<Section>.<Column>`, `Rests on.Entity`. The type and owner cells draw none; they say what the edge points at and draw nothing of their own, as a qualifier draws nothing. R16's rule on `As` applies unchanged: two rows naming one entity carry an `As`, and a question has no reason to, so `question` declares none.

`shape` stays 3. A parser that predates the form reads the unknown Type cell as a fact, as R16 has every consumer do, so a question's rows reach an older consumer as text and draw no edges. Nothing breaks; the edges arrive with the re-pin.

## The tooling

Everything below reads the form from the schema and names no type, as the checker has since it stopped carrying rules of its own.

The checker, in `lib/checks.mjs`, learns the form. It reports a `by` column in a frontmatter table, a `by` or `in` naming a column that is not a `string` column of the same table, a type cell naming no declared type, an owned type with a blank owner cell, an unowned type with a filled one, and an entity or owner cell that does not resolve. `verify/` gains `ref-by.test.mjs` with one fixture per failure and one clean instance, and `verify/check.mjs` holds core's own schemas to the new form.

The parser, in `lib/instance.mjs`, draws the edge a `by` cell names, resolved within its owner where there is one, via `Rests on.Entity`, with the row's other cells as the edge's attributes. `model.json` is still exactly what the pinned commit parses to.

`core/CONVENTIONS.md` changes in R4, R9 and R16 as above, and `core/question-schema.md` is new. The manifest's version moves by a minor.

The example instance under `example/` gains two questions, one resting on unowned entities alone and one on an owned one, so the instance checks, which `example/` is written to pass, exercise both branches on a real tree as well as on the failing fixtures.

The Obsidian plugin takes the new checker through its vendored copy and shows a question's rows like any table section; its section picker offers `## Rests on` on a new question because the schema declares it required. A picker for the type cell is not in this round. The MCP servers need nothing of their own: `list_types` shows the type, `get_entity` returns a question's edges like any other, and `describe_schema` returns the new schema. Each re-pins the package.

## The chat

chat-server already asks the host for its types at start and again whenever the model's commit moves. Beside that, it lists the entities of type `question`, following pages, and keeps their titles. The prompt gains one line after the type map:

> Questions this model answers, each an entity of type question: "What does Robert do?"; "Can Robert still write code himself?"; …

The line is capped by `CHAT_QUESTION_INDEX_CHARS`, a new setting read in `lib/config.mjs`, 4000 characters when unset. Titles are added in the order the host lists them until the next would pass the cap. Where some are left out the line ends "; and more, found by search with type question", so a question past the cap is still reached the way it would have been without the index. A host that lists no questions, or a type map without `question`, adds no line, so the chat on a model that has none reads exactly as today.

The rules gain one sentence: "When the visitor's question is one of the questions this model answers, in any language or wording, get_entity that question first and answer from the entities it rests on, getting each one you draw on and naming it, never the question, as what the answer rests on." The existing sentence that every claim comes from a tool's answer is unchanged, and the index is a pointer, not an answer: the chat still calls `get_entity` for each fact.

chat-server tests: the index within the cap, the overflow ending, no line without questions, and the refresh when the commit moves. chat-server takes a minor release, and both hosts re-pin it.

## The instances

Each instance is seeded in its own pull request, questions chosen one by one by the owner from candidates drafted in the session that designed this: blust.ch's for someone deciding whether to hire or engage, a prospective client, a peer and the chat itself; CompanyGraph's for someone evaluating it, the skeptic, a contributor and the chat. Each question's rows are written against the entities as they stand at the instance's pin, and each pull request passes the instance checks with the new core.

A candidate whose answer the model does not hold yet, a license or where an adopter's data lives, is not seeded as a question. It is raised as a change to the model, and the question follows once the model holds its answer.

## Out of scope

Audience and a filter by it; a `/faq/` page on any site and the FAQPage structured data that would go with it; a priority field ordering the chat's index; a picker for the type cell in the plugin. Each is a change of its own once something asks for it.

## What it costs

A release of meta-model that every consumer re-pins: both instances, both sites, the MCP server and both deployments, chat-server, and the plugin. The re-pin is all it asks of any of them, since the form degrades to text on an older parser. The order is meta-model's release first; then chat-server's index, which reads nothing until an instance has questions; then the two instances' seeds; then the re-pins of the servers and sites, which is when the chat on each host starts carrying the index; then the plugin.

Verification at the end is a live one on each host: a question asked in a visitor's words that no search term of the model's matches, and the same question in German, each answered with the entities it rests on named.
