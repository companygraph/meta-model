# The CLI: making an instance, and moving its core

> `companygraph init` writes an instance a checker passes on its first day, and
> `companygraph upgrade` moves its vendored core, its manifest and its workflow's tag together.
> One program, in this repository, released with the core it carries; every editor and every CI
> runs the same commands, and the Obsidian plugin calls the same code rather than writing its own.

Status: designed with the owner on September 20, 2026, and built the same day, in the plan at [`docs/superpowers/plans/2026-09-20-the-cli.md`](../plans/2026-09-20-the-cli.md). It supersedes the parts of `2026-08-25-companygraph-tooling-design.md` that place the tooling in a repository of its own and keep this one free of code; its layout, its manifest and its reasons for them stand and are not restated here. Where the two differ, this note is the later decision. The three skills this note describes below are not in what was built: `init` writes none of them, and porting them is a plan of its own, still to be written.

## Why here, and why now

The August design put the tooling in `companygraph/tooling` because the meta-model was Markdown and nothing else. That premise is gone: this repository ships `lib/instance.mjs`, `lib/checks.mjs` and `bin/check-instance.mjs`, and three consumers, the Obsidian plugin, the two sites and the MCP server, install it by tag. A second repository would mean a second release to make and a contract to keep in step, for code that has no life apart from the core it writes. One release moves core and the tooling together, and a mismatch between them cannot exist.

What is missing is the making of an instance. Today an empty vault becomes an instance by hand, or by an agent following prose, and moving a vendored core forward is the same work in the other direction, done member by member across the family and gone wrong before: a manifest moved and a workflow line forgotten, a lockfile that never re-resolved, hashes left behind. The three places a release lands are the CLI's to move in one command.

## What it is

One entry point, `bin/companygraph.mjs`, with subcommands, published by the package this repository already publishes and run as `npx companygraph-meta-model <command>`:

- `init` — write a new instance.
- `upgrade` — move an instance's vendored core, skills, manifest and workflow tag.
- `check` — the existing mechanical checks, reached through the one entry point.

`bin/check-instance.mjs` stays exactly where it is and keeps working, because the reusable workflow and every instance's CI call it by that path; `check` is a second door to the same code.

Every command exits non-zero on any problem, writes nothing when its pre-flight fails, prints paths relative to the instance's root, and prompts only where a flag is absent, so CI runs it without a terminal. What each command decides is a pure module, `lib/plan.mjs`: files in, a list of writes, moves and removals out. The writer is thin and does what the plan says. Both are exported, so a program that cannot spawn a process, the Obsidian plugin among them, calls the same code and gets the same instance: it already bundles this package.

## `init`

```
companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--schemas <dir>] [--name <instance>] [--folders <a,b>]
```

It writes the layout the August design fixes, which this note does not restate, and three things that design did not name:

- **The workflow.** `.github/workflows/companygraph.yml`, calling this repository's reusable
  `instance-check.yml` at the release whose checker runs, which is the release of this tooling
  and never the tag a core was fetched from. Those two are separate facts: the workflow's `ref`
  chooses a checker, the manifest's `tooling` names the checker the instance asks for, and the
  checker refuses the two when they differ, so pinning a fetched core's tag made an instance
  whose own CI failed on its first commit. Which core is vendored is recorded by `core.version`
  and `core.source` instead, and a core behind the checker is legal by design. An instance is
  checkable from its first commit, and the tag in that file is one of the three places an
  upgrade must move.
- **The agent's own files**, for the agent the owner chooses.
- **The skills**, in that agent's format.

**The agent is asked, not assumed**, as spec-kit asks. `init` prompts with the agents it can write for, and in this release that list holds Claude alone, which is said rather than implied. `--agent claude` runs it without a prompt, and an agent the release cannot write for is refused by name, listing what it can. What differs per agent is a template set and nothing else, so Codex and Copilot are later templates, not a later design.

For Claude, `init` writes `AGENTS.md` and `CLAUDE.md`, which say where the vendored core sits and that the instance's own rules belong there, and `.claude/skills/companygraph-{validate,export,surface}/`.

**The core it vendors** is the one inside the release that runs, so `init` needs no network and the version is never in doubt. `--core vX.Y.Z` fetches that tag from GitHub instead. The manifest records which, as `bundled` or `fetched:vX.Y.Z`. A tag whose core is newer than the tooling that runs is refused before anything is written, and the refusal names the tag to run `init` from instead: `tooling` can only name the release that runs, that release's checker refuses a core newer than itself, and the release that could run the core refuses a manifest naming another, so the tool would have no value to write that any checker accepts. A core at or behind the tooling stays legal.

**The folders are the ones asked for.** Without `--folders`, `init` writes a folder for every root type core declares; `--folders values,processes` writes only those, and `sources/` always, because the instance's starting source is written there. A company that has none of a thing should not carry a folder implying it forgot, and a folder core does not declare is refused by name, listing the ones it does. Each folder gets a README that names the schema its files are written against, under a sentence-case heading, and a folder whose type owns others names their schemas too: `processes/` names the process, phase and track schemas.

**It refuses rather than merges.** `--here` writes into an existing repository and refuses when `meta/` (or `--schemas`) or `.companygraph/` is already there. Every conflict is found before anything is written, so a refusal leaves nothing behind.

## The three skills

Ported from the reference instance's, which is where they were written and proven, and made portable on the way. Three things change:

- **No instance is named.** The instance's name comes from the manifest; no path is baked in;
  the comments lose the examples that name a profile or a repository. This repository publishes
  nothing instance-specific, and porting them is how that rule is kept.
- **Validate names the mechanical half rather than repeating it.** Its steps 1 to 7 today walk
  rules the checker now reads; the ported skill says that `companygraph check` covers those and
  cites it, and judges what nothing mechanical reaches: each entity against its schema's
  `## Writing rules`, the gap lines, and the lines only reading can judge. It is shorter and it
  cannot drift from the checker.
- **Export and surface carry their scripts**, which need Python 3 on the machine; validate needs
  nothing. `init` says so once, when it writes them.

`companygraph-add-entity` is not ported: the owner never used it, and an editor scaffolds an entity now.

## `upgrade`

```
companygraph upgrade [<folder>] [--core <tag>] [--dry-run] [--force]
```

It moves an instance from the core its manifest names to the core of the release that runs, or to `--core <tag>`, refusing a core newer than itself for the reason `init` does, and it owns exactly what the tooling wrote:

- the vendored core under the manifest's `units` path,
- the skills it installed,
- `.companygraph/manifest.json`, whose `tooling`, `core.version`, `core.shape`, `core.source`
  and per-file hashes all move,
- the `instance-check.yml@<tag>` line in the workflow it wrote.

`AGENTS.md`, `CLAUDE.md`, the model and everything else are the instance's, and are never touched.

**An edited vendored file stops it.** Before writing, every file the manifest lists is hashed. A file whose hash differs was edited inside the instance, and core is not the instance's to edit: `upgrade` names every such file and writes nothing, so an instance is never half old and half new. `--force` overwrites them and says which it overwrote. There is no three-way merge, as the August design decided.

**`check` names the same edit first.** The hashes are read on the one command every commit runs as well, so an edited or missing vendored file fails the instance's own CI on the commit that made it, rather than being met by whoever upgrades next. A manifest that recorded no hashes has nothing to be held to.

**It ends by checking.** A core release can make a valid instance invalid — 0.31.1's required sections would have — so `upgrade` runs the checks over the instance it has just moved and prints what the instance now owes. The upgrade is not undone by a failing check: the files are the release's, and the work is the owner's to do.

**`--dry-run`** prints the same plan and writes nothing: the file that would change, the one that would go, the versions and the tag line. That is what a CI drift check wants.

## What it is not

- No `add`. An editor scaffolds an entity, and the CLI would be a second way to do one thing.
- No packs, no migration of a pre-tooling instance, no agent but Claude. Each waits for the first
  case that needs it.
- No sync, no connector, no validator beyond the checks: the August design's non-goals stand.

## How it is proven

- **The plan is pure and tested**: the files `init` would write for each agent, the writes,
  removals and version moves `upgrade` would make, an edited vendored file refusing, `--force`
  overwriting, and a tag that does not exist refusing.
- **The instance it writes passes the checks.** The test runs `init` into a temporary folder and
  then `checkInstance` over the result: an empty instance is a valid instance, its manifest's
  hashes match the bytes on disk, and its workflow names this tooling's own release.
- **An upgrade that really moves is tested end to end**, at the command line and without a
  network: `init` writes an instance, the instance is then set back to an older core by hand, and
  `upgrade` moves it, with the vendored bytes, every hash, `tooling`, `core.version` and the
  workflow line all asserted to have moved and the checks run after. Two published releases are
  not used, because reaching for one would put the network in the suite.
- **What making the second instance found is tested**: a core newer than the tooling refused by
  both commands with nothing written, `--folders` writing what it names and `sources/`, a README
  naming its schemas, `check` failing on an edited and on a missing vendored file, and the
  core-newer refusal naming both pins.
- **The network is not in the tests.** Fetching a tag is one function, and the tests pass a
  fetcher that answers from a fixture, as the plugin's runner takes its process starter.

## What follows for the plugin

The Obsidian plugin bundles this package, so it calls the planner and the writer directly: a command that turns the open vault into an instance, asking the same questions, and later one that moves its core. Nothing of it is Obsidian's own, and nothing about making an instance lives in a plugin. An editor that is not Obsidian runs the same commands in a terminal.
