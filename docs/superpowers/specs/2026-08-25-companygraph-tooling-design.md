# CompanyGraph tooling — design

> The mechanical half of instantiating CompanyGraph: a CLI that scaffolds, vendors, upgrades and
> mechanically checks an instance, and the agent skills it installs. It never interprets a
> schema's prose; the agent remains what enforces the model.

Status: design agreed, nothing built. This spec lives here because the `tooling` repository
does not exist yet. When it does, the spec moves with it and this file becomes a link.

Reads against [`2026-08-23-companygraph-design.md`](2026-08-23-companygraph-design.md) — §5
(schemas, and the rejected validator), §6 (splitting the agent instructions), §7 (an instance
ships as a skill), §8 (declaring packs) and §10 (the versioning question). Where the two
disagree, the older spec's *decisions* stand and this one is wrong, except where this spec
explicitly answers a question the older one left open.

---

## 1. Purpose and non-goals

The README's roadmap item 5 says what is missing: copying `core/` and `CONVENTIONS.md` into a
repository is the method, not a stopgap, and what is absent is the mechanical half —
scaffolding the folders a schema names, wiring the agent commands, and upgrading an instance
in place when core moves. This is that half, in the manner of
[spec-kit](https://github.com/github/spec-kit).

**Owns:**

- creating an instance (`init`)
- keeping its vendored core current (`upgrade`)
- scaffolding an entity from its schema (`add`)
- the mechanical subset of the conventions (`check`)
- installing and upgrading the portable agent skills
- the export-as-skill mechanism of §7

**Non-goals:**

- the validator — roadmap item 6 stays deferred, and §6 below is what stops this tooling
  from becoming it by accretion
- any sync or connector to an external system — instance-owned, see §5
- any agent target other than Claude Code
- a three-way merge on upgrade
- migrating a pre-tooling instance — manual and agent-assisted in v1 (§8)

---

## 2. Repositories and the release contract

```
companygraph/
  meta-model/      Markdown only. Gains core/manifest.json. Tags releases: vX.Y.Z.
  tooling/         Node, zero dependencies, built with spec-kit. Publishes npm `companygraph`.
```

The tooling is a separate repository because it is code with its own release cycle, and the
meta-model stays a zero-dependency Markdown repository. The cost, taken knowingly: spec-kit
keeps templates and CLI in one repository to stay in lockstep, and this design gives that up.
What replaces lockstep is a contract.

### The release contract of `meta-model`

The one thing another program reads:

- `core/manifest.json`:

  ```json
  { "version": "1.4.0", "shape": 1 }
  ```

  `version` equals the git tag. `shape` is the version of the R9 fixed shape and the closed
  type vocabulary — the only thing the tooling depends on.

  Which number moves is decided by one question: **what must an instance do about it?**

  | | the release | an instance must |
  | --- | --- | --- |
  | MAJOR | the fixed shape changes, and `shape` with it | be read by a newer tooling |
  | MINOR | a type added or removed, a required field or section added, a rule that makes an entity that was valid invalid | change files |
  | PATCH | an optional field or section added, a rule clarified or corrected, prose fixed | do nothing |

  This is `upgrade`'s question, not a taste in numbering. §4 has it print the release notes
  between two core versions and walk the entities a schema change affects; a PATCH is the
  release where it has nothing to walk, and it can only know that if the number says so. A
  policy applied per release by judgement makes `upgrade` undecidable and the number
  decorative.

  Pre-1.0 the same three apply — the earlier "every vocabulary change bumps the minor, one per
  roadmap slice" is superseded, having been written before there was a release that asked an
  instance for nothing. `1.0.0` is still for when the remaining clusters are in and the
  reference instance's findings are resolved.
- The tag `vX.Y.Z` sits on the commit where `manifest.json` says `X.Y.Z`. `verify/check.mjs`
  gains a check that the two agree.
- A release tarball contains `core/`, `CONVENTIONS.md` and `LICENSE`. Nothing else is consumed.
- Release notes live on the GitHub release (§8 records this as still open in form).

### The tooling side

- Bundles the latest `meta-model` release under `vendor/core/` at build time. A CI job in
  `tooling` re-vendors and publishes when `meta-model` tags. Bundled core is the default for
  every command; `--core <tag>` fetches the release tarball of `companygraph/meta-model` at that
  tag instead. `GITHUB_TOKEN` is honoured when set and never required.
- Declares `supportedShapes: [1]`. A core whose `shape` is not in that list is refused, loudly,
  naming the tooling version that supports it. No silent misreads — the same posture as R4.
- Its own version is independent of core's. The instance manifest records both.
- Installed with `npx companygraph@latest <command>`; before the npm release,
  `npx github:companygraph/tooling <command>` works from the repository — the Node equivalent
  of `uvx --from git+…`.
- Apache 2.0, like everything else the org owns. The vendored `LICENSE` lands in the instance
  beside the schemas, which is what makes the README's "carry the licence with the files you
  took" happen mechanically.

---

## 3. The instance layout `init` produces

```
<instance>/
  .companygraph/
    manifest.json          tooling version, core version, shape, source (bundled | fetched:<tag>),
                           schemas path, declared packs (empty in v1), sha256 per vendored file
  meta/                    everything vendored, and only that
    CONVENTIONS.md
    LICENSE
    profile-schema.md … value-schema.md
  profiles/  skills/  proficiency-levels/  values/
                           one folder per root type, each with a README.md index stub
  AGENTS.md                generated once, never upgraded: points at meta/, holds the
                           instance's own rules — the §6 "operational + house style" half
  CLAUDE.md                `@AGENTS.md` — the Claude Code target
  .claude/skills/companygraph-*/   the portable skills (§5); owned and upgraded by the tooling
  .claude/skills/<instance>-*/     the sync slot (§5); never touched
```

Decisions inside that:

- **`meta/` is the default, not a rule.** R9 only forbids a schema inside a type folder; `meta/`
  is what the multi-person instance already uses. `init --schemas <dir>` overrides it and the
  manifest records the path, so `upgrade` and `check` never guess. This answers the half of
  §10's versioning question the older spec withdrew a rule over: the location stays the
  adopter's business, and the manifest is how the tooling learns it.
- **Vendored files are the only thing `upgrade` owns.** `AGENTS.md`, `CLAUDE.md` and the type
  folders belong to the instance after `init` — the line spec-kit draws between
  `.specify/templates/` and `specs/`.
- **Owned types get no root folder.** `experience` lives inside a profile (R5), so `init`
  creates nothing for it; `add profile` creates the `experiences/` folder inside the profile.
- **`init --here` onto an existing repository** refuses if `meta/` (or the `--schemas` dir) or
  `.companygraph/` exists, and otherwise only adds. It never renames or moves existing folders.
- **Declared packs** is a manifest field from day one so an agent can tell an intentionally
  absent type from a forgotten one (§8 of the older spec). It is an empty list until the first
  pack exists; `init --pack` and a `meta/packs/` layout wait for that.

### The manifest

```json
{
  "tooling": "0.3.0",
  "core": { "version": "1.4.0", "shape": 1, "source": "bundled" },
  "schemas": "meta",
  "packs": [],
  "files": {
    "meta/CONVENTIONS.md": "sha256:…",
    "meta/profile-schema.md": "sha256:…"
  }
}
```

`source` is `bundled` or `fetched:v1.4.0`. `files` lists every vendored file with the hash it
had when written; it is what `upgrade` compares against, and what `check` reports drift from.

---

## 4. The four commands

All four: exit non-zero on any problem, write nothing when pre-flight fails, and print paths
relative to the instance root. Interactive prompts exist only where a flag is absent, so CI can
run every command non-interactively.

### `init [--here] [--core <tag>] [--schemas <dir>] [--name <instance>]`

Writes the layout in §3. Pre-flights every conflict, then writes; a partial instance is never
left behind. Interactive only for the instance name when `--name` is absent.

### `add <type> <name> [--owner <name>]`

Reads `meta/<type>-schema.md` — its tables only, by the R9 fixed shape — and writes one entity:

- H1 is the name exactly as given; the filename is derived by R12 — the slug of the H1, or
  whatever the type's own schema states instead, as `experience` does. Three documents said
  "kebab-case of the H1", none said what that does to a parenthesis, a slash or an umlaut, and
  one type does not derive from the H1 at all. The H1 stays canonical (R2).
- Frontmatter carries every field the schema declares: required ones present and empty,
  optional ones present as YAML comments.
- Every required section as a heading; a section marked `Table.` gets its header row from the
  column table.
- An owned type requires `--owner` and lands inside the owner's folder (R5). An entity of a type
  that owns collections becomes a folder holding its own file and one empty folder per owned
  type (R6).
- Refuses a `--owner` that resolves to no entity of the owning type.

This is the one place the tooling reads a schema, and the fixed shape is the reason it can: the
reader is a table reader, not a prose reader.

### `check`

Fails on:

| what | rule cited |
|---|---|
| `.companygraph/manifest.json` missing or unreadable | — |
| a schema file inside a type folder | R9 |
| a root folder no schema names, or a schema whose root folder is missing | R6, R7 |
| in the folder form, an entity whose own file is not named for its folder | R6 |
| a frontmatter `ref → <type>` or `array of ref → <type>` value that resolves to no H1 of that type | R4 |
| a list-valued frontmatter field written as a flow sequence | R11 |
| a filename that does not derive from its entity, or two in one folder that derive alike | R12 |
| a list-valued frontmatter field written as a flow sequence | R11 |
| two H1s of one type that derive to the same filename | R12 |
| a schema that does not match the fixed shape | R9 |

Reports without failing: a vendored file whose hash differs from the manifest (that is
`upgrade`'s business, §4, and the instance may have a reason).

Every failure cites the rule number, and a meta-check refuses to cite a rule that the vendored
`CONVENTIONS.md` does not define — the R0 discipline `verify/check.mjs` already has. The output
ends by naming the rules it did not check, so nobody reads a green `check` as a validated
instance.

### `upgrade [--core <tag>] [--force]`

1. Resolve the target core: bundled latest, or the fetched tag. Refuse an unknown `shape`.
   Refuse a downgrade unless `--force`.
2. For every vendored file: hash equals the manifest → replace from the new core; hash differs →
   leave it, list it with a diff against the new version. An instance is not supposed to edit
   core schemas, and if it did, that is the signal it needs a pack, not a silent overwrite.
3. Add files the new core introduces; report files it removed and leave them (removal is the
   instance's decision).
4. Refresh `.claude/skills/companygraph-*/` the same way.
5. Print the release notes between the two core versions.
6. Write the manifest last, so an aborted run is re-runnable.

A three-way merge is deliberately not attempted.

---

## 5. Installed skills and the sync slot

Four skills under `.claude/skills/companygraph-*/SKILL.md`, owned and upgraded by the tooling:

- **`companygraph-validate`** — the R0 agent pass. Reads `meta/CONVENTIONS.md`, walks the graph,
  reports per rule. Runs `companygraph check` first so the agent's attention goes to what the
  script cannot reach: R1, R2, R3, R5, R7, R8, and whether prose that crept into the instance's
  rules is really about modelling. The generated `AGENTS.md` instructs that it runs before every
  commit.
- **`companygraph-add-entity`** — takes a prompt, runs `companygraph add` for the shell, fills the
  body from the prompt, then runs validate on the result. Never invents a referenced entity that
  does not exist; offers to add it.
- **`companygraph-export`** — §7 of the older spec, generalised from the multi-person instance's
  distribution command. Produces `dist/<instance>-skill.zip` containing `SKILL.md` and one
  `model/<type>.md` per root type — the folder's README first, then its entities — plus
  `model/meta.md`. Name and description come from the manifest; entity counts are computed at
  export time. An optional instance-owned `export/SKILL-intro.md` is spliced into `SKILL.md`
  when present, which is where the instance's persona and personalisation text lives.

  **Each entity is preceded by a boundary comment naming the file it came from:**

  ```markdown
  <!-- entity: skills/api-design.md -->
  ---
  source: Local
  ---

  # API design
  ```

  Not a line holding `---`, which is what the reference instance's export used and what an
  earlier draft of this said. Every entity's frontmatter opens and closes with that same line,
  so a consolidated file of seventy-five skills holds over two hundred of them and nothing says
  which are boundaries; the entity counts in `SKILL.md` were the only thing telling a reader how
  many entities the file held. An entity whose body contains a horizontal rule is
  indistinguishable from a boundary, and no program can split the file at all. `<!--` cannot
  collide with YAML or with Markdown's own rule, the comment does not render, and naming the
  path restores the provenance the consolidation throws away.

  **`description` is written as a quoted YAML scalar**, whatever it came from. The reference
  instance built one from a Markdown tagline holding a link and a colon, and the frontmatter did
  not parse — a skill nobody can load, which is exactly what "uploadable as an organization or
  personal skill" is a promise against. Markdown is reduced to plain text first (a link becomes
  its link text, emphasis markers drop), then the result is emitted double-quoted with inner
  quotes escaped. A description arriving from the manifest is already plain text and still needs
  the quoting: a colon is enough.
- **`companygraph-upgrade`** — wraps the `upgrade` command and then does what the script cannot:
  reads the release notes, walks the entities a schema change affects, and proposes the edits.
  This is where "upgrade an instance in place when core moves" actually lives; the command only
  moves the schemas.

This settles the older spec's §7 open question — the packaging belongs in core's tooling,
shared and versioned, not copied per instance.

**The sync slot** is a convention, not code. Instance-owned skills live at
`.claude/skills/<instance>-<source>/` — `magic-sync-kpis`, say — are never touched by
`upgrade`, and the generated `AGENTS.md` carries a section listing them. What generalises from
the multi-person instance's sync commands is the shape — *fetch from a system, write entities,
run validate* — and the slot documents that shape with one worked example. No connector ships.
This is §6 of the older spec applied to skills: the portable ones the tooling ships, the ones
naming a tracker or a CRM the instance owns.

---

## 6. `check` and the deferred validator — where the line is

The older spec rejected a validator that parses Markdown schemas as its source of truth (§5).
`add` and `check` do read schemas, so the boundary is stated here so that the tooling cannot
become that validator by accretion.

- **What is read:** the three R9 tables, by their fixed columns, and the H1 of every entity.
  Reading is by position in the fixed shape — never by interpreting a Description cell or any
  prose.
- **Failure posture:** a schema that does not match the fixed shape is refused by `add` and
  `check` with the R9 violation, never read leniently. That is what keeps prose from being
  load-bearing: the shape is enforced before anything reads through it, which was the exact
  objection in the older spec's §5.
- **What is never done:** typing values (`date`, `number`, `enum` membership), checking a body
  table's columns against its column table, checking a required section's content, anything
  needing a judgement. Those stay with `companygraph-validate` until the validator arrives —
  and when it does it may replace `check`, not extend it.
- **One table reader, two harnesses.** The reader that walks the fixed shape lives in `tooling`
  and `meta-model/verify/` vendors it as a single byte-identical file with a hash check — the
  pattern the three sites already use for `design.mjs`. `verify/check.mjs` checks this
  repository's own shape on top of it; `tooling check` checks an instance on top of it.

---

## 7. Testing

- The tooling repository is built with spec-kit. Its constitution carries the settled decisions
  above — zero dependencies, nothing written on pre-flight failure, never read leniently,
  refuse unknown shapes, `upgrade` owns only vendored files — and one spec per command follows.
- Node's built-in test runner, no dependencies.
- Fixtures: `meta-model/example/` as the valid instance; `fixtures/broken/` with one instance
  per check in §4, each named for the rule it violates.
- Round trip, in a temporary directory: `init` → `add` one entity of every core type, including
  an owned one → `check` passes → `upgrade` to the same version is a no-op → `export` produces a
  zip whose `SKILL.md` counts equal the entities added.
- Compatibility: a fixture core with `shape: 99` is refused by every command; a fixture core
  with an edited vendored file is left alone by `upgrade` and listed.
- CI in `tooling` runs the suite against the bundled core and, on a schedule, against
  `meta-model` `main`, so a shape change there fails here before it is tagged.

---

## 8. Open questions

- **Release notes for core.** `upgrade` prints them; whether they live on the GitHub release,
  in a `CHANGELOG.md` inside the tarball, or both, is undecided. The tarball is the offline-safe
  answer.
- **Migrating a pre-tooling instance.** The multi-person instance has `name` fields, a display
  name fallback chain and plural schema filenames — none of which core kept. v1 says manual and
  agent-assisted; a `migrate` command is a candidate once the reference instance has been through
  it by hand.
- **A non-Claude export.** A plain zip of `model/` without `SKILL.md` is cheap; whether anyone
  wants it is unknown.
- **Packs.** The manifest has the field. `init --pack`, `meta/packs/<name>/` and how `check`
  learns a pack's types all wait for the first pack, as the older spec decided.
- **The R9 reader as a package.** If a third consumer appears, the vendored single file becomes
  an npm package. Not before.

---

## 9. Findings from the reference instance

Building `robertblust/mental-model` by hand tested this design before any of it was written,
and §7 of
[`2026-08-26-reference-instance-design.md`](2026-08-26-reference-instance-design.md) records
what it found. The entries bearing on this document, so that whoever builds it reads them here
rather than rediscovering them:

- **§5, the export format and the description** — both fixed above rather than left as findings.
- **§3, the manifest has no value for a hand-built instance.** `tooling: "0.0.0"` was the
  placeholder. Whether the field allows `null`, a `"manual"` token, or whether `init --here`
  learns to adopt a hand-built instance, is open.
- **§5, whether the skills belong here at all.** Three of the four work as prose with no CLI
  behind them. Either they belong in `meta-model` — portable prose, versioned with the schemas
  they enforce — with the tooling only installing them, or "owned and upgraded by the tooling"
  is right and the reference instance is carrying copies it will have to give back.
- **§4, `init` against `add`.** The layout `init` writes was eighteen files and eight hashes,
  wholly mechanical, and one commit. The fifty-four entity files `add` would have shelled took
  five commits, and three more went to review fixes that changed no shape at all. `add` writes
  the frontmatter keys, the headings and a table's header row; every reference it leaves empty
  is the half that takes the time. The command saves the shell, not the work — which is the
  right split, worth stating so the command is not measured against the wrong thing.
- **§6, `check` implemented ad hoc is `check` implemented wrong.** Three disposable checks
  written during that build each got a mechanical rule wrong, in three unrelated ways, and none
  of the three *failed* — each returned something shaped like an answer. A glob swept in the
  `README.md` the rules define out; an empty `grep -E` piped into a negated `grep -Evq` read a
  vacuous truth as a match and flagged six correct files; a section extractor spelled its
  lookahead `\Z` in a language where that is the literal letter, stopped at the word "Zeebe",
  and read a twenty-three-row table as eighteen rows and one malformed one. These are checks §6
  specifies `check` will own.
- **§6, what a validation pass cannot reach.** `check` ending by naming the rules it did not
  reach is necessary and not sufficient. On the agent pass the useful list is longer than a list
  of rule numbers and the things on it are not rules: core declares no `enum` anywhere, so R8
  passes with nothing to exercise it; a `source-id` resolves against nothing this repository can
  reach, so the field is a pointer for a person; and entity bodies are read for shape rather
  than for sense. Core has since given every schema `## Writing rules`, which is what the agent
  pass reads for the third of those.
