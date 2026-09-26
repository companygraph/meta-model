# A question has a kind

A visitor on blust.ch asked the chat which questions the model answers, got the whole list, and then asked whether the questions could be grouped. The chat grouped them into four themes and said, correctly, that the grouping was its own reading, because the model holds no such thing. The list in each instance is now long enough that a flat list stops being read. Core gains one type, `question-kind`, the instance's own ranked set of what its questions are about, and a question gains a required `kind` that names one. The chat then answers "what can I ask about?" from the model, and the chat's start chips offer one question from each of three kinds rather than three at random.

Status: decided by the owner on September 26, 2026, on the recommendation that the grouping be an instance-defined type in the form achievement kinds already take, ranked, and a field on the question rather than a heading. The kinds listed under The instances are the proposal the owner reviews one by one at implementation, as every editorial change to a model is reviewed.

## Where this comes from

The meta-model has made this call twice already. `achievement-kind` groups an experience's achievements, and was first proposed as seven headings fixed in core and then made a type, because the set that fits one career fits nobody else's. `decision-kind` says what sort of call a decision is, on the same reasoning. A question's topics are the same kind of fact: a person's visitors ask about their career, a product's ask about fit and terms, a hotel's ask about matching and privacy, and no set written in core would serve all three.

The owner ruled when the question type was designed that it has no audience in its first version. A kind is not an audience. It says what the question is about, never who asks it, and it gives no answer to anyone that it withholds from someone else.

## The type

```markdown
# Question Kind Schema

> Required structure for question kind files.

## File Location

`model/question-kinds/*.md`

A kind owns nothing and nothing owns it: every question claims one of the same few, and what each kind covers lives here rather than being restated on every question. It sits at the container root beside `questions/`, because every question in the instance claims one of the same set.

The set is the instance's own, as an achievement kind's is. What a company's visitors ask about, a career, a product's fit, a hotel's matching and privacy, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever questions are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every question references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the questions of this kind are about |
| `## What it means` | Yes | Which questions belong to this kind, and which do not |
```

Purpose, as the schema will say it: a kind answers "what is this question about?", the question a visitor asks of a list too long to read, when what they want is the part of it that concerns them. Its value is that the answer is a reference rather than a word: the kinds are nodes in the graph, a surface can draw the questions of one kind together or one from each, and the chat can say what the model answers about from the model rather than from its own reading.

Writing rules:

- `## What it means` is written so that two readers filing the same question would file it under the same kind, and it says what the kind excludes, since the boundary with the kind beside it is where every disagreement will be.
- A kind is about what the visitor has in mind when they ask, never about which entity the answer rests on. "Can I use Robert's colors and fonts for my own site?" is about the brand, whatever the answer routes to.
- Named as a visitor would read it above the questions it holds, `Career`, `Brand`, never for the type or the section the answers sit in.
- `rank` orders kinds wherever questions are drawn grouped, and nothing else. The first kind is the one most visitors come for. Two kinds never share a rank, which the existing check for every ranked type already holds.
- A kind holds at least two questions, unless the instance holds only one. One question alone is filed under the nearest kind until a second arrives, because a group of one is a heading over a single line.
- Names and prose are American English (R14).

## The question gains a kind

`core/question-schema.md` gains one frontmatter row, after `source-id`:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `kind` | Yes | ref → question-kind | What the question is about, the H1 of a file in `question-kinds/` |

and one writing rule: a question has one kind, the one a visitor would look under first, and a question that seems to need two is either two questions or is filed where most visitors would look for it.

The field is required, not optional, because an optional kind leaves every surface that groups to decide where the ungrouped ones go, and the answer would differ between the chat, the chips and a page. It is a field and not a heading, as an achievement kind is, because a question is a whole file and nothing inside it is grouped.

## What was left out

A kind that also names an audience, a hiring manager, a developer, a hotel's IT, which is the audience field the question type left out of its first version, and stays out.

A kind derived from the entities the answer rests on. Two questions resting on the same entity can be about different things, and a question resting on nothing, a stance or a boundary, would have no kind at all.

An unranked set, as decision kinds are. Decision kinds order nothing, and the owner chose ranked here because a grouped list is read top to bottom and the first group should be the one most visitors came for, not the first in the alphabet.

A grouped question index in the chat's prompt. The chat reaches the kinds through the tools it already has: `list_entities` with type `question-kind` lists them in the instance's words, and `list_references` on a kind lists its questions. A grouped index would spend the prompt's question budget on headings, and the prompt rule for a question about a kind of thing already sends the chat to the list.

## The tooling

Every field is written in vocabulary that exists, `ref`, `number`, so the parser, the Obsidian plugin, the MCP server and the chat read the type from its schema, as they did for the decision kind.

`TYPES` in `lib/checks.mjs` gains `{ type: "question-kind", folder: "question-kinds" }`, beside `achievement-kind`. `core/question-kind-schema.md` is new, `core/question-schema.md` gains the field and the rule, and `core/manifest.json` moves by a minor. `verify/` gains fixtures for a `kind` naming no kind, a question with no `kind`, and two kinds sharing a rank, and one clean instance; the rank check is the generic one and needs no change, and the fixture proves it reaches the new type. `init` writes the folder's README as it does for every type, and the README's schema list gains the type.

The example instance under `example/` gains two kinds, Product at 10 and Company at 20, and one question, so that each kind holds two as its own writing rule asks. "How do I find out why a line is on my invoice?" and "Who split billing out of the monolith?" take Product. "Does Beacon Systems publish its revenue?" takes Company, and so does the new "What is it like to work at Beacon Systems?", which rests on the values Craftsmanship and Say the hard thing, invents no fact the example does not already hold, and is worded as a visitor asks rather than as the model names things.

## The Obsidian plugin

The plugin takes its types and folders from the package's `TYPES` and its completion candidates from the schema, so the re-pin is what makes New entity offer the type and completion offer the kinds for `kind`. The e2e suite proves it against the reference instance at a pinned commit once that instance is seeded. The plugin takes a patch or minor release in its own repository once this release is tagged.

## The chat's start chips

`assets/chat.js` in design offers three questions when the panel opens and three after each answer, picked at random from the site's model file. With kinds, it picks three kinds at random and one unasked question from each, so a visitor sees the range of what the model answers rather than three questions that may all be about one thing. It reads a question's kind from `fields.kind`, which the model file already carries for every field. Where the model holds fewer than three kinds with an unasked question, the rest are picked at random from what is left, and a model file with no kinds on its questions is offered exactly as today, so a site that re-pins design before its model loses nothing. This is a minor release of design, with the unit test that the three picked chips name three kinds where three exist.

## The instances

Each instance upgrades its core and seeds its kinds and every question's `kind` in the same pull request, because the field is required. The kinds below are the proposal; each instance's pull request goes to the owner kind by kind.

The reference instance, four kinds:

- Career, 10: what Robert has done, led, studied and built, where he has worked and spoken, and why there is a break. What does Robert do?; What has Robert led?; What did Robert study?; Has Robert worked in banking?; Has Robert worked in insurance?; Has Robert built AI into a real business?; What is Robert strongest at?; How does Robert measure delivery?; Can Robert still write code himself?; What is Robert's history with Eclipse and modeling?; Where has Robert spoken?; Why is there a career break, and what happened in it?
- Ideas, 20: what the lines on the site and the work behind them mean. What problem does modeling a company solve?; What does "Building fast is solved. Deciding well is not." mean?; What does "over twenty-five years, in order" mean?
- Brand, 30: how the site looks and how its texts sound, and what a visitor may reuse. What do the colors on this site mean?; Can I use Robert's colors and fonts for my own site?; How should a text in Robert's voice sound?
- Model and chat, 40: what this model is, how its claims hold, and who answers here. Who answers this chat?; How well does this chat answer?; Is what I type here stored?; How do I know a claim here is true?; Can I build a model like this of myself?; How can I use this model from my own AI agent?

The chat put the voice question under ideas; it moves to Brand here because the voice profile is the brand's, and it is the first boundary the owner is asked about.

The CompanyGraph instance, five kinds:

- Fit, 10: what problem it solves and whether it fits a company's own shape. What problem does CompanyGraph solve?; Isn't this just a wiki, or Notion with rules?; What if the vocabulary doesn't fit our company?; What does a company's model actually look like?; Where do our targets and actual numbers go?; How does content stay current when it comes from a wiki or another system?; Who keeps the model true when the company changes?
- Getting started, 20: the first steps and what connects to it. How do I start?; How do I create my own profile?; Can our AI agents use it?; Does our data leave our hands?
- Terms, 30: what it costs, who is behind it, and how it proves itself. Do I need your service to run CompanyGraph, and what does it cost?; How do I contribute to CompanyGraph?; Is anyone besides you using CompanyGraph?; Is CompanyGraph a business, or a side project?; How do you know CompanyGraph is working?
- Brand, 40: What do the colors on companygraph.io mean?; Can I use CompanyGraph's colors and fonts for my own site?
- This chat, 50: Can I trust what this chat says?; Who answers this chat?

The GuestGraph instance, six kinds:

- The problem, 10: Why do we have the same guest five times?; Can we see everything a guest has booked, in one place?
- Matching, 20: Can I see why it thinks two records are the same person?; What happens if two different guests get merged by mistake?; What happens to a guest id we stored when guests are merged?; Who decides a match the system isn't sure about, a person or AI?
- Data and privacy, 30: What about GDPR and our guests' privacy?; Does it change or delete our original records?; Are guests kept apart between our hotels or brands?
- Connecting, 40: How do I connect my own system?; Which of our systems can it read from?
- Terms, 50: Can we run GuestGraph ourselves, and what does it cost?; Is GuestGraph a business, or an open-source project?
- Brand and chat, 60: What do the colors on guestgraph.io mean?; Can I use GuestGraph's colors and fonts for my own site?; How well does this chat answer?; Who answers this chat?

GuestGraph folds brand and chat into one kind because each holds two questions, and six kinds is already the most any instance carries.

## Out of scope

A questions page on any site that draws the questions under their kinds, and the German its headings would need; the kind names stay English in the model as every name does (R14), and a page that shows them in German translates them there. A grouped question index in the chat's prompt, left out above. Each is a change of its own once something asks for it.

## What it costs

A minor release of meta-model that every consumer re-pins, one row in the checker, and a minor release of design. The order is meta-model's release; then the reference instance upgrades its core and is seeded, because the plugin's e2e vault is that instance; then the plugin re-pins and is released; then the other two instances upgrade and are seeded; then design releases the chips; then the three sites re-pin design and their model, and the three MCP hosts re-pin their model, as they do for any model change. companygraph.io's `/model/` page lists the core vocabulary term by term and gains a row in that re-pin.

Verification at the end is the instance checks green on all three instances with every question carrying a kind; on each MCP host, `list_entities` with type `question-kind` answering the instance's kinds and `list_references` on one kind answering its questions; on each chat, "Can these questions be grouped?" answered with the model's kinds and named as the model's; and on each site, a live check that the three start chips name three different kinds, with no request to the chat host before send.
