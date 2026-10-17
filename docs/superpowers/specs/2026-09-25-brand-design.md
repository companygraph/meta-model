# A brand is stated as meaning, not measure

A company's brand is written in a brand book, a slide of the logo with its clear space, a stylesheet somebody once pasted a palette into, and none of these is where a person or an agent writing in the company's name looks first. Core gains a type `brand`: one file per instance, holding what the company looks and sounds like wherever it appears, as meaning rather than measure. What each color is for, which typeface does which job, what the mark is and what it never sits on, and the traits a sentence in the company's voice can fail. The values themselves, the hex codes, the sizes, the weights, the SVG, stay where they are built, and a required References table says where.

Status: decided by the owner on September 25, 2026, one question at a time. The model states the grammar and the roles and references the design repository for the bytes, rather than holding the values and having a check in design read them back; a second copy of a hex value is a value that drifts, and two of the family's favicons already show it. The file holds the visual identity and the voice, and not imagery, which has one rule in core already and waits for a second. Voice is a table of traits with a `Never` beside each, as a value has what breaking it looks like, rather than prose with do's and don'ts. It is a singleton, a file in the container as vision and identity are.

## Where this comes from

The multi-person instance this meta-model was extracted from keeps a brand as three files: a main document with an owner, a state and an approval date, a visual identity with a color system, typography, logo rules and photography, and a tone of voice with a messaging framework, voice traits, headline patterns and do's and don'ts. The split into visual and verbal held up. The owner, state and approval rows did not carry over: the model is the master (R17) and an approval date is a number that moves.

What the file should hold was checked against what the market writes. Brand guidelines converge on six parts: positioning, the logo with clear-space and minimum-size rules, color with semantic roles, typography with a hierarchy, imagery, and voice and tone, which since 2026 is written to include the voice of the agents that speak for the brand. The current guidance is that guidelines are queryable systems rather than PDFs. The machine-readable formats agree on a smaller core: Posit's brand.yml holds meta, logos in light and dark variants, a palette with semantic roles and typography as fonts with their jobs; the W3C Design Tokens format, stable since October 2025, holds the values themselves with theming and aliases. Two things follow. Positioning is already in the model, in the identity's tagline, the vision and the values, and brand references it rather than restating it. And the split the formats draw, meaning in one place and value in another, is the split this type makes: the model is the brand.yml layer without the numbers, and the design repository is the tokens.

This family has the visual system as code already. The design repository's tokens carry a grammar in their comment, brightness is confidence, one hue at four stops with one flag and one sum beside it, and three typefaces each with a job; each site's favicon is the master of its mark, and the communication repository renders tiles from it. None of that is written anywhere an agent asks. The brand file is where it is stated, and the References table is where it is found.

## The type

`brand` is a singleton. A company has one brand, so the type is a file directly in the container, `model/brand.md`, named for the type (R6, R12, R13), which leaves the H1 free to be the name the brand goes by. For a company of one that name differs from the identity's H1: the identity is the person, the brand is the address the work appears under.

```markdown
# Brand Schema

> Required structure for the brand file — what the company looks and sounds like.

## File Location

`model/brand.md`

A company has one brand, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The name the brand goes by — the one the mark spells and the lockup carries |
| `> [Promise]` | Yes | One-paragraph statement of what carrying this name promises a reader |
| `## Mark` | Yes | Bulleted. What the mark is, in a sentence, then one rule per item: clear space, minimum size, what it sits on |
| `## Color` | Yes | Table. One row per color role; its columns are declared below. |
| `## Typography` | Yes | Table. One row per typeface; its columns are declared below. |
| `## Voice` | Yes | Table. One row per trait of the company's voice; its columns are declared below. |
| `## References` | Yes | Table. Where the values are: the tokens, the mark's file, the rulebook; its columns are declared below. |

`## Color` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Name` | Yes | string | The role's name as the place that masters its value spells it — a token, a swatch name |
| `Means` | Yes | string | What a thing painted in it is saying |
| `Never` | Yes | string | The one misuse it is most often put to |

`## Typography` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Face` | Yes | string | The typeface's name as its foundry writes it |
| `Job` | Yes | string | What it sets, and nothing about how |

`## Voice` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Trait` | Yes | string | One word for a way the company writes |
| `Means` | Yes | string | What a sentence with the trait does |
| `Never` | Yes | string | What a sentence without it does, specifically |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of file — the tokens, the mark, the rulebook |
| `URL` | Yes | string | Where it is |
```

Every column is `string`, so each table draws no edge and is data, which is a table's other legal shape (R9). `## References` is required here where every other schema leaves it optional, because the decision above rests on it: a brand file that names no place for its values has no values.

Purpose, as the schema will say it: the brand is what the company looks and sounds like wherever it appears, stated as meaning rather than measure, so that a person or an agent producing anything in the company's name reads one file, finds what each color, face, mark and trait is for, and follows a reference to the bytes. It answers "what does this look and sound like, and why?" for someone writing a post, cutting a tile or reviewing a draft. It is not the palette and not the stylesheet, which are built and kept where the References rows point, and it is not the positioning, which the identity's tagline, the vision and the values already hold.

Writing rules:

- No hex code, size, weight, line height or file dimension anywhere in the file. A value moves with a release, and a References row says where it is kept.
- A `## Color` row is named as the place that masters its value names it, so a reader can find it there by the same string.
- A `Means` cell says what a thing in that color, or a sentence with that trait, is saying; a `Never` cell names one specific misuse, not the absence of the trait. "Never decoration" can be checked; "never misused" cannot.
- A `Job` names what a face sets in the words the page uses for it — prose, the ledger, a section mark — and says nothing about how it is set.
- A trait is one a draft can fail. "Plain" fails a sentence with an adjective that sells; "professional" fails nothing.
- `## Voice` speaks in the company's first person, "I" for a company of one and "We" for a company of more, the same one the instance's values use.
- `## Mark` says where the shape is mastered and never carries a copy of it, so the mark has one source and every render is made from it.
- Positioning stays out: the promise is one paragraph, and what the company is, where it is going and what it holds to are the identity's, the vision's and the values' to say.
- Names and prose are American English (R14).

## What was left out

Owner, state and approval date: the model is the master and a date of approval is a number that moves. The file is approved when it is on `main`.

Imagery: core holds one image rule already, R9's square picture beside a profile, and the family has one photograph and one watermark. A section returns when a second rule exists to write.

Positioning: mission, vision and values are entities of their own, and a restatement here would be the second copy R17 exists to end.

The values: hex codes, sizes, weights, the SVG. Kept where they are built, for the reason the first writing rule gives. A check in the design repository that reads the model's roles against its tokens is a change of its own once something asks for it.

## The tooling

Every field and column is written in vocabulary that exists, `ref`, `string` and tables of strings, so the parser, the Obsidian plugin, the MCP server and the chat read the type from its schema and need no source change; the plugin still adopts it, as its own section says.

The one list that names the types is `TYPES` in `lib/checks.mjs`; it gains `{ type: "brand", file: "brand.md" }` beside identity and vision. A singular type has no folder, so `init` writes no README for it and the folder-README rule does not reach it. It does write a stub, `model/brand.md` beside the identity's and the vision's, because the container check requires every singular type's file (R13) and an instance `init` writes passes the checks on its first day: the H1 is the instance's name, the promise and the mark's one item are placeholder prose as the identity stub's are, and each table is its header row alone, which the checks pass and which a reader cannot mistake for content.

`core/brand-schema.md` is new and `core/manifest.json` moves by a minor, to 0.42.0. `verify/` gains `brand.test.mjs` with one fixture per failure the type can make, a missing `## Voice`, a `## Color` table with a column the schema does not declare, a `## Mark` written as a numbered list, a missing `## References`, and one clean instance; `test:instance-checks` runs it. `verify/check.mjs` holds the new schema to the fixed shape as it holds the others. The README names `brand` among the schemas.

The release moves the package by a minor and the instance workflow's `ref:` with it, in the same commit, as the 0.46.1 guard requires.

The example instance under `example/` gains `brand.md` for Beacon Systems: an invented mark, four color roles, two faces, four traits and References to files under its own invalid domain, so the instance checks exercise the type on a real tree as well as on the fixtures.

## The Obsidian plugin

The plugin takes its types from the package's `TYPES` and already knows the singular kind: New instance writes every type that has a `file`, the rename command refuses to move one, and the instance suite asserts `model/identity.md` after New instance. So re-pinning `companygraph-meta-model` to this release is what makes New instance write `model/brand.md` beside identity and vision with its five required sections, from the package's own starting entities, the rename command refuse it, the section picker offer `## Mark`, `## Color`, `## Typography`, `## Voice` and `## References`, and the live table know each table's columns. No source change is expected; if the re-pin shows one is needed, it is made in the plugin's own plan.

What the re-pin has to prove is proved in the e2e suite, driven over the DevTools protocol against a scratch vault of the reference instance at a pinned commit, whose own core is what the plugin reads: New instance writes `brand.md` with its H1 and the five sections, the section picker on a brand file offers the declared sections and nothing else, and the live table on `## Color` offers its three columns. The fixture under `test/fixtures/mental-model` moves to the commit where the reference instance carries its brand, so the reference instance upgrades and is seeded first. The README gains a paragraph on the type, as it has for a question and a KPI. The plugin takes a minor release, and its plan is written in its own repository once this release is tagged, because it builds on the package; the release is installed in the vault through the CLI's `obsidian` command.

## The instances

Each of the three instances upgrades its core and seeds `model/brand.md` in the same pull request, and each passes the instance checks with the new core.

- The H1 is the name the mark spells: `blust.ch`, `CompanyGraph`, `GuestGraph`.
- `## Mark` describes the site's favicon in words, the `rb` in Plex Mono, two squares joined by a line, three lines resolving into one dot, names the favicon as the master of the shape, and carries the rules the communication repository's brand README states: a full-bleed square, the mark at about 60% of the tile, no rounded corner.
- `## Color` carries the six roles the tokens comment states, `--c-weak`, `--c-mid`, `--c-firm`, `--c-flag`, `--c-sum` and `--c-path`, each with the meaning the comment gives it and the one misuse it names. A theme is not a row: the grammar is the same on dark and light, and which value each role takes on which ground is the tokens file's to say.
- `## Typography` carries the three faces with the jobs the design blocks give them: Instrument Sans for prose, Plex Mono for the ledger and the chrome, Bricolage Grotesque for section marks.
- `## Voice` is drawn from the Writer's never-lines and the family rulebook in the conventions repository, four to six traits, each with what it means and what a sentence without it does.
- `## References` names the design repository's `blocks/tokens.css`, the site's `favicon.svg` and the writer brief in conventions.
- `## Mark` says, as a rule and not as an observation, that the mark's colors are the design tokens' ground and accent, and that where a render carries other values, the favicon included, the tokens are the master and the render follows. Two favicons carry values older than the tokens today; the file does not say which, since that is true on the day it is written and unfalsifiable afterwards, and the fix to the files is a site change that stays out of the instance pull request.

The three files are alike across the instances and not copies: each mark, each promise and each voice is its own.

## Out of scope

A page on any site that draws the brand; a chat index of it; a check in design that reads the model's color roles against the tokens; the favicon fixes; an imagery section; a qualifier on a voice trait referencing a value. Each is a change of its own once something asks for it.
