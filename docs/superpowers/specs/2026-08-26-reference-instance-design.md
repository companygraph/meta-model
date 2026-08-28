# CompanyGraph reference instance — design

> Roadmap item 2: a real company of one, described in the core vocabulary, laid out exactly as
> the tooling will lay one out. It is the first thing that can show the extraction was wrong,
> and the first thing that can show the tooling design is wrong — before either is built on.

Status: built, and still moving — §7 records what it taught, including what it taught after
the first pass. Each finding is a follow-up unless its entry says core has already acted. The
instance is a new repository, `robertblust/mental-model`; this spec lives here because the
findings it produces are about core and the tooling, not about one person's CV.

Reads against [`2026-08-23-companygraph-design.md`](2026-08-23-companygraph-design.md) — §6
(splitting the agent instructions), §7 (an instance ships as a skill), §9 (the first slice) —
and [`2026-08-25-companygraph-tooling-design.md`](2026-08-25-companygraph-tooling-design.md)
— §2 (the release contract), §3 (the instance layout), §5 (installed skills). Where this spec
and either of those disagree, their decisions stand and this one records the disagreement as a
finding (§7) rather than resolving it.

---

## 1. Purpose and non-goals

**Owns:**

- the first release of `meta-model` under the tooling spec's contract: `core/manifest.json`
  and the tag `v0.1.0`
- one instance repository, `robertblust/mental-model`, in the exact layout the tooling spec's
  §3 says `init` produces — built by hand, so the layout is tested before the code exists
- the complete professional portfolio of the company of one, as content: every core type
  populated, every reference resolving
- the portable agent skills the tooling spec's §5 names, as prose that works today without
  the CLI
- a findings section (§7) that names what core or the tooling design got wrong, by section

**Non-goals:**

- any code in the instance — no validator, no build, no sync. The tooling spec's `check`
  belongs to the tooling; R0 says validation is agent-run, and it is
- a sync from the CV repository. The §5 sync slot stays a convention with no worked example
  here; the content is written once, by hand (decided, not deferred)
- changing core or the tooling spec. A finding is recorded, not acted on — each is its own
  follow-up
- a focused application. This is the whole portfolio, which is what the model is for; the CV
  repository keeps the overlays
- a second language. Core has no mechanism for one and this spec does not invent it; the
  instance is English

---

## 2. The release contract, honoured first

The tooling spec's §2 contract has two halves and `meta-model` has neither yet: no
`core/manifest.json`, no tag. An instance that mimics `init` must record which core it
vendored, so the release comes first.

- `core/manifest.json`:

  ```json
  { "version": "0.1.0", "shape": 1 }
  ```

  `shape: 1` is the R9 fixed shape as it stands. `0.1.0`, not `1.0.0`: the six types are
  usable — two instances run on them and a third is about to — but this very instance exists
  to find out whether they are right, and roadmap item 3 adds types. `1.0.0` is for when the
  remaining clusters are in and §7's findings are resolved. Not `0.0.1`, which would say
  nothing is usable yet. (This bullet also said every pre-1.0 vocabulary change bumps the
  minor, one per roadmap slice. The tooling spec's §2 now decides it by what an instance must
  do about a release, which this spec's own findings produced two of: an optional `## Ending`
  asks an instance for nothing.)
- `verify/check.mjs` gains the check the tooling spec promises: the manifest parses, `version`
  is a semantic version, `shape` is a positive integer, and — when `HEAD` carries a `v*` tag —
  the tag equals `v<version>`. No tag is not a failure; a tag that disagrees is.
- Tag `v0.1.0` on the commit where the manifest says so, after the PR merges. No GitHub
  release object yet: the tooling spec's §8 leaves release notes open and nothing consumes
  them until `upgrade` exists.
- `LOCAL.md`'s last line names the instance `robertblust/company`; it becomes
  `robertblust/mental-model`. The name pairs with the multi-person instance's, whose
  repository is `magic-mental-model`.
- `README.md` roadmap item 2 is ticked and links to the instance once it is public.

---

## 3. The instance layout

`robertblust/mental-model`, public — the content is the portfolio the CV already sends out,
and a reference instance nobody can read is not a reference. Laid out as the tooling spec's
§3 describes, with nothing added and nothing left out:

```
mental-model/
  .companygraph/
    manifest.json
  meta/
    CONVENTIONS.md  LICENSE
    experience-schema.md  proficiency-level-schema.md  profile-schema.md
    skill-schema.md  source-schema.md  value-schema.md
  profiles/  skills/  proficiency-levels/  values/  sources/
                                each with a README.md index stub
  AGENTS.md
  CLAUDE.md                     one line: @AGENTS.md
  README.md
  LICENSE                       Apache 2.0, the instance's own
  .claude/skills/
    companygraph-validate/SKILL.md
    companygraph-add-entity/SKILL.md
    companygraph-export/SKILL.md
```

Decisions inside that:

- **`meta/` holds exactly the release tarball's content** — `core/*.md` at `v0.1.0`,
  `CONVENTIONS.md`, `LICENSE` — copied, never edited. Every file is hashed into the
  manifest so a later `upgrade` finds them untouched.
- **The manifest** follows the tooling spec's shape with one value it did not foresee:

  ```json
  {
    "tooling": "0.0.0",
    "core": { "version": "0.1.0", "shape": 1, "source": "fetched:v0.1.0" },
    "schemas": "meta",
    "packs": [],
    "files": { "meta/CONVENTIONS.md": "sha256:…", "…": "…" }
  }
  ```

  `tooling: "0.0.0"` means *no tooling wrote this*. The spec's manifest has no way to say
  that, and an `upgrade` that reads `0.0.0` as "very old" and proceeds is doing the right
  thing by accident. Recorded in §7.
- **`README.md` index stubs** in each type folder, as `init` leaves them: one line naming the
  type and pointing at its schema in `meta/`. `README.md` is never an entity's file (R6), so
  the stub is safe in a folder something walks.
- **Owned types get no root folder.** `experiences/` exists only inside the one profile.
- **A root `README.md`** for people: what the repository is, that it is the reference
  instance of the meta-model, the tree above, and where the content came from. It is not an
  entity and not a stub.
- **Three portable skills, not four.** `companygraph-validate`, `companygraph-add-entity` and
  `companygraph-export` are agent prose and work with no CLI; where the spec has them run
  `companygraph check` or `companygraph add` first, the skill says the command is absent and
  does the mechanical part by hand. `companygraph-upgrade` wraps a command that does not
  exist and is not written. When the tooling ships, `init --here` refuses because `meta/`
  exists — so the instance is adopted by hand then too: replace the three skills with the
  tooling's, rewrite the manifest's `tooling` field, keep everything else. That path is the
  tooling spec's §8 "migrating a pre-tooling instance", exercised on purpose.
- **No sync slot.** Nothing under `.claude/skills/mental-model-*/`. `AGENTS.md` still carries
  the section the tooling spec's §5 says the generated file has, saying the slot is empty.

---

## 4. Content

Everything is drawn from the CV repository's `content/` — `profile.yaml`, `skills.yaml`,
`experience/`, `projects/`, `education/`, `community/` — in English only. Nothing is invented:
a fact that is not in the CV is not in the instance. Where a CV entry has an `id`, the entity
carries it as `source-id`.

### Sources — 2

| H1 | `url` | masters |
| --- | --- | --- |
| Local | — | values, proficiency levels, skills — written here, mastered here |
| rob-cv | — (a local repository with no remote; the field is optional and stays absent rather than naming a path) | the profile and every experience; `source-id` is the CV entry's `id` |

The split follows the source schema's own words: a source is "where a page's facts are
mastered". The definition of a skill is written for this graph; the dates of a role are not,
and copying them here does not make this repository their master. No sync exists and the CV
repository has no public address, so the `source-id` is a pointer a person with that
repository follows, not a key a program does — the field's contract does not depend on which.

### Proficiency levels — 4

The ladder from `example/`, unchanged: Familiar 10, Competent 20, Proficient 30, Expert 40,
each with the example's `## What it means`. One ladder in two instances is a stronger claim
than a second ladder would be, and inventing rungs for one person is the wrong direction.

### Skills — about 25

One skill per capability, not per product: "Event-driven architecture", not Kafka and Pub/Sub
and RabbitMQ as three files. Products are named under `## In practice`, which is what the
section is for. `group` carries the CV's group name verbatim — the schema leaves whether a
group becomes a type "deliberately open", and ten strings on twenty-five files is the data that
question needs.

The list, by CV group, is drawn up during the build and reviewed in the PR. The rule for a
cut: a capability earns a file when at least one experience evidences it; a product earns a
mention, never a file.

### The profile — 1

`profiles/robert-blust/robert-blust.md`:

- `source: rob-cv`, no `source-id` (the CV's profile has none), `email`, `location`
- `# Robert Blust`, tagline from the CV's title line
- `## Skills`: one row per skill file, `Level` from the ladder, `Evidence` a concrete fact from
  a role or project — the schema requires it "because the adjective on its own measures
  confidence rather than skill". A skill with no evidence to cite is a skill that should not
  have earned a file; the table is the second pass of the cut above.
- `## Summary`: the CV's default summary, as prose.

### Experiences — 20

Every dated CV entry becomes one experience under `profiles/robert-blust/experiences/`:
six roles, seven projects, two education entries, five community entries. Filename
`YYYY-<slug>.md` by start year, as the schema's File Location asks; where two entries share a
year the slug distinguishes them and the folder still sorts.

| CV folder | `organisation` | `# Title` | `> Tagline` | `## Achievements` |
| --- | --- | --- | --- | --- |
| experience | the employer | the role | one line from the highlights | the bullets |
| projects | the client, with the employer in the tagline | the project name | the role played | the bullets |
| education | the institution | the degree or certificate | one line | the bullets |
| community | the organisation or event | the CV's title | one line | the bullets, if any |

`start` and `end` as `YYYY-MM` where the CV has a month, `YYYY-01` where it has only a year —
the schema types the field `date` in that format and a bare year is not one. That coercion is
a finding (§7). `skills` lists the skill files the entry evidences, by H1.

The mapping of degrees and talks onto a type whose tagline says "period" is the decision
taken in the brainstorm: describe everything in the vocabulary that exists and record where it
strains, rather than leave two folders of the CV unmodelled or invent types before core's
remaining clusters are designed.

### Values — 3 or 4

Drafted from the CV's summary and achievements, each with the schema's required `## In
practice` in its two halves (following it, breaking it). These are the one place the instance
carries prose the CV does not, and they are marked for the owner's review in the PR: a value
someone else wrote for you is not yet yours.

---

## 5. Agent instructions

`AGENTS.md` is the instance half of the older spec's §6 and nothing else:

- **House style**, lifted from the CV repository's own agent file: American English, no
  Oxford comma, one idea per bullet, active voice, claim only what is verifiable.
- **Mastership**: anything with `source: rob-cv` is corrected in the CV repository first and
  copied here second; the reverse is a drift.
- **Before every commit**: run `companygraph-validate`.
- **The sync slot**: the section the tooling spec's generated file carries, stating it is empty.
- A pointer at `meta/CONVENTIONS.md` for every modelling rule. Not one modelling rule is
  restated here — restating is how the two halves fuse again.

`CLAUDE.md` is the one line `@AGENTS.md`, the Claude Code target.

The three skills follow the tooling spec's §5 descriptions:

- `companygraph-validate` — reads `meta/CONVENTIONS.md`, walks the graph, reports per rule and
  names what it did not check. Per rule, not per a range written down here: the vendored
  `CONVENTIONS.md` is what says which rules exist, and it has gained two since this was
  written. It also reads each schema's `## Writing rules` and reports those the same way. Says
  at the top that `companygraph check` is absent and the mechanical rules are therefore its own
  to do.
- `companygraph-add-entity` — reads the type's schema by the fixed shape, writes the shell
  `add` would write (H1, every field, every required section), fills the body from the
  prompt, then runs validate. Never invents a referenced entity; offers to add it.
- `companygraph-export` — produces `dist/mental-model-skill.zip`: `SKILL.md` with name and
  description from the manifest and entity counts computed at export time, one
  `model/<type>.md` per root type (README first, each entity preceded by its boundary comment),
  `model/meta.md`.
  `export/SKILL-intro.md` is spliced in when present; the instance ships one, because a
  company of one is exactly the case where the persona text matters.

---

## 6. Order of work and verification

1. `meta-model`: manifest, verify check, `LOCAL.md`, PR, merge, tag `v0.1.0`.
2. Create `robertblust/mental-model`; layout of §3 with `meta/` copied from the tag and the
   manifest hashed from what was copied.
3. Content of §4 in the order that lets references resolve as they are written: sources,
   levels, skills, values, the profile, the experiences.
4. `AGENTS.md`, `CLAUDE.md`, the three skills, `export/SKILL-intro.md`.
5. Run `companygraph-validate` over the instance until it reports no failure and lists what
   it did not check. Run `companygraph-export` once and confirm the zip's counts equal the
   files on disk.
6. Fill §7. Open one PR in the instance with all of it; open one PR in `meta-model` ticking
   roadmap item 2 and carrying the filled §7.

Verification is the agent pass in step 5 and `npm run verify` in `meta-model` after step 1.
There is no script in the instance to run; that absence is the design.

---

## 7. What the instance taught

Filled during the build. Each entry names the section of the spec it bears on and states the
finding without proposing the fix — the fix is a follow-up decision, not part of this work.

Known before the first file is written:

- **Tooling §3, the manifest** — has no value for "hand-built, no tooling". `tooling: "0.0.0"`
  is the placeholder; whether the field should allow `null`, a `"manual"` token, or whether
  `init --here` should learn to adopt a hand-built instance, is open.
- **Tooling §5, the skills** — three of the four work as prose with no CLI behind them. Either
  the skills belong in `meta-model` (portable prose, versioned with the schemas they enforce)
  and the tooling only installs them, or the spec's "owned and upgraded by the tooling" is
  right and this instance is carrying copies it will have to give back. The older spec's §7
  leaned core for the export mechanism on the same reasoning.
- **Core, `experience`** — a degree, a certification, a board seat and a conference talk are
  each a dated period with an organisation, and the type holds them, but "Achievements" is
  the wrong heading for a talk and `organisation` is a stretch for a conference. Core has since
  written the stretch down rather than removed it: `organisation` for a one-off is whoever
  hosted, awarded or published it, because the alternative — leaving it empty — says less. The remaining
  clusters (identity, direction, …) may or may not be where these belong.
- **Core, `experience` — how a period ends** — a period carries `end` and nothing that says why
  it ended. The date is read into regardless: the reader supplies a reason, and the model's
  silence is not neutral. The first instance hit this on a founder's departure, where the honest
  sentence had nowhere to go and `## Achievements` was the only section that would hold it — and
  a departure is not an achievement. Core has since gained an optional `## Ending`.
- **Core, `date`** — the CV keeps years; the schema wants months. The coercion to `-01` is a
  false precision the model now asserts.

Found in the building:

- **Core, `experience`, `end`** — an absent `end` means the period is ongoing, and six of the
  twenty entries are not periods at all: two conference talks, a certification, a published
  case study and two projects the CV dates by year alone. No end date was invented for them,
  so a talk given in 2022 now reads as still running. The field is honest about roles and
  silently wrong about events. The instance has since settled both halves in its own files —
  a one-off carries `end` equal to `start`, and a period still running says "Ongoing." in its
  tagline rather than relying on a reader noticing an absent field — and core has since made
  both writing rules on `experience`. What stays open is whether a talk or a certification is
  an `experience` at all; the remaining clusters may say otherwise.
- **Core, `profile`, the Skills table** — the skill list was cut twice and neither pass removed
  anything. Twenty-three capabilities were drawn up from the CV's groups, twenty-three earned an
  evidenced row in the profile's table, and twenty-three were named by at least one experience;
  the table ended with twenty-three rows. What the two passes did produce, on review, was three
  `skills:` changes across three experience files — not one skill relocated between two of
  them: a skill swapped for a better fit on the experience that already carried it, that same
  skill's replacement swapped onto a second experience, and the skill it displaced there moved
  on to a third — and two levels lowered from Proficient to Competent for resting on a single
  role. Where evidence lives is what a second pass over the table actually tests. It cannot
  test whether the list itself is right, because every input to it — the CV's groups, the
  table, the experiences — is the same source read again. What was wrong with the list needed
  a check from outside it, and got one; that is the next entry.
- **Core, `skill`, the grain and the person** — the twenty-three were cut from the CV's tag
  cloud by feel, and every `## In practice` read the schema's "what someone using this skill
  actually does" as *what this person did*: employers, years and numbers, in a file many
  profiles are meant to claim. Two defects with one cause. A skill file must be person-neutral
  to be claimable at all — the history belongs in the profile's Skills table, which already
  holds the level and the evidence. And the grain was arbitrary: "Database design and
  operation" is two skills to anyone who has hired for either, and nothing existed to check a
  cut against. The instance re-cut them against four public vocabularies compared row by row —
  SFIA 9, ESCO v1.2, O\*NET, Lightcast Open Skills — and adopted none of them: SFIA names the
  leadership, architecture and governance skills at the right grain and has no modern layer at
  all, ESCO covers about half the rows and generically, Lightcast has the market grain under a
  licence that is not open, and O\*NET is products. The vocabulary is therefore the instance's
  own, written in its own words at the grain a job posting names — seventy-five skills where
  there were twenty-three. Nothing is cited, quoted or vendored, and the licence question
  disappears with the copying. The schema had nowhere to say any of this, which is the next
  entry but one.
- **Core, every schema** — a schema says the *shape* of an entity and nothing about its
  *purpose* or how to write one. Shape alone does not produce usable entities: all twenty-three
  first-cut skills satisfied `skill-schema.md` in every particular and all twenty-three were
  wrong. The rules that make a good one — person-neutral, imperative without a subject, the
  definition starting with the thing itself, products only in a closing `Typical tools:` clause
  — are writing rules, and the R9 fixed shape has no section that holds them. Proposed
  separately as `2026-08-27-schema-purpose-and-writing-rules-design.md`.
- **Core, the type set, products** — PostgreSQL, Camunda, Claude Code are not skills, and the
  model has no type for them. They survive here as prose in a `Typical tools:` clause. Whether
  a product becomes a type of its own is a pack question, unasked so far.
- **Core, the type set, domain knowledge** — half of what makes a person hireable is the domain
  they know: hospitality technology, financial services, insurance, real estate, for this
  profile. It is not a skill — there is no "In practice" for knowing how a hotel works — and no
  core type holds it. The instance holds its domains back rather than force them into `skill`,
  so this is the one finding here that is blocking content already written.

  It will not arrive with the roadmap's Domain cluster, which this entry first assumed. That
  cluster holds one type, `concept`, and the design spec is explicit about what it is: the
  company's *own* vocabulary — a hotel operator models booking and folio, a consultancy models
  engagement and deliverable. Company-scoped, seeded per company type, and the place where
  company type actually varies. An industry a person has worked in is the opposite of that:
  external, shared between companies, and unchanged by who is describing it. Widening `concept`
  to hold both would put two things in one schema that share no field and no reader, so
  `concept` stays as designed and this needs a type of its own.

  Deferred, and not for want of a design. CLAUDE.md has core as the union of the two instances
  rather than one extended to fit the other, and only the company of one has asked for this.
  The multi-person instance decides it: if it turns out to carry industry knowledge in some
  shape of its own, that shape is evidence and the type gets designed against both. If it does
  not, one instance wanting a type is what a pack is for.
- **Meta-model, `example/`** — its three skills are written the first-cut way, one person's
  history and all. The example is what adopters copy, so it needs the same rewrite as soon as
  core says what the rule is. Core has since gained `## Purpose` and `## Writing rules` on
  `skill`, and the three are rewritten to them.
- **Core, R9 against R10** — R9 says the path under `## File Location` "begins with the type's
  own folder"; R10 says an owned type's File Location nests inside its owner. `experience`
  cannot satisfy both, and the vendored `experience-schema.md` satisfies R10:
  `profiles/<profile>/experiences/*.md` — which is also what `verify/check.mjs` had always
  enforced, so the contradiction was in the prose alone. R9 has since been reworded to say
  that the *last* folder in the path is the type's own. The walk over all six schemas at `v0.1.0` found nothing
  else — heading order, the single frontmatter table, the `Table.` section and its column table,
  the closed type vocabulary and the plain-dash separators all hold.
- **Tooling §5 and §6, what a validation pass cannot reach** — `companygraph-validate` reported
  no failure on R1 through R10 over 54 entities and then named what it had not touched. Three of
  those matter beyond this instance: core declares no `enum` field anywhere, so R8 passed with
  nothing to exercise it; no `source-id` was resolved, because the source it points into has no
  address this repository can reach, which makes the field a pointer for a person and unchecked
  by anything; and the skill and experience bodies it walked were read for shape,
  not for sense. §6 has `check` end by naming the rules it did not reach. On an agent pass the
  useful list is longer than a list of rule numbers, and the things on it are not rules.
- **Tooling §4, `init` against `add`** — the layout `init` writes is eighteen files and eight
  sha256 hashes, wholly mechanical, and it was one commit. The fifty-four entity files `add`
  would have shelled took five, and three further commits went to review fixes that changed no
  shape at all. `add` writes the frontmatter keys, the headings and a table's header row; every
  reference it would leave empty is the half that took the time. The command saves the shell, not
  the work — which is the right split, and worth stating so the command is not measured against
  the wrong thing.
- **Tooling §6, `check` as one implementation** — three disposable checks written during the
  build each got a mechanical rule wrong, in three unrelated ways: one walked a type folder with
  a glob that swept in the `README.md` the rules define out of it; one piped an empty `grep -E`
  into a negated `grep -Evq`, read the vacuous truth as a match and flagged six correct files;
  one, in the validation pass itself, was a section extractor whose lookahead spelled `\Z` in a
  language where that is the literal letter, so it stopped at the word "Zeebe" and read the
  profile's twenty-three-row table as eighteen rows and one malformed one. The three mistakes
  have nothing in common. What they share is that none of them failed — each returned something
  shaped like an answer. These are checks §6 specifies `check` will own, implemented ad hoc three
  times and wrong three times.
- **Tooling §5, `companygraph-export`** — *fixed in the tooling spec; an entity is now preceded
  by a boundary comment naming its file.* The consolidated `model/<type>.md` separated entities
  with a line holding `---`, and every entity's YAML frontmatter opens and closes with the same
  line. `model/skills.md` carries sixty-nine of them for twenty-three skills, and nothing in the
  file says which three are a boundary. The counts in `SKILL.md` are the only thing that tells a
  reader how many entities the file holds.
- **Tooling §5, the export skill** — *fixed in the tooling spec; `description` is emitted as a
  quoted YAML scalar, whatever it came from.* The procedure took `SKILL.md`'s `description` from
  the README's `>` line as written, Markdown and all. That line held a link and a colon, and the
  frontmatter built from it did not parse as YAML. §5 calls the export "uploadable as an
  organization or personal skill"; a skill nobody can load is exactly what that promise was
  made against.
