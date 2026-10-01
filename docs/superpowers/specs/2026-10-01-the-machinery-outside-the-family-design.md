# The machinery outside the family

An instance made with `init` is held to its vendored core by a check, a commit hook and a workflow at a pinned tag, and nothing more. The family that keeps CompanyGraph holds its repositories to more: one Markdown form, a declared list of what each repository takes from another, and a report of which of those pins are behind. That machinery lives in `robertblust/conventions`, which every family member vendors, and it cannot be taken by anyone else, because it carries the family's own content with it: its member list, its writing rules, its seats' addresses. beacon asked to use the machinery without joining the family. This spec moves the part an outside company can use into meta-model, where it is applied by the CLI and moved by the one `tooling` pin an instance already has.

Status: decided by the owner on October 1, 2026: the machinery and the content are split, the machinery ships from meta-model and the content stays with whoever owns it; the family takes the machinery from meta-model too, in a second phase; the first phase ships the form check and a read-only pin report and leaves the prose check and the resync run to the second; the pin report reads one repository at a time; every instance takes the machinery with `init` and `upgrade`, and a repository that is not an instance takes it with a command of its own; the Markdown form is fixed, and a repository may only exclude paths from it.

## Where this comes from

beacon will start its instance before the software pack ships, and asked how to start one and pin core and the pack, and whether the pack waits until the automation stands. Their question is about the machinery, not about the family: they want what holds the family's repositories, applied to their own, with their own rules and their own seats.

`robertblust/conventions` holds two things. One is machinery: `conventions-format`, which runs markdownlint at a pinned version with the rules in `markdown-rules.cjs`; `conventions-check`, which refuses words and forms; `conventions-sync`, which vendors the files and points `core.hooksPath` at the seat hook; and `family/`, which reads every member's `pins.json`, reports what is behind and, on the owner's word, moves it through to merged pull requests and releases. The other is content: `WRITING.md`, `WORKING.md`, `GERMAN.md`, `GLOSSARY.md`, the role briefs, and `REPOSITORIES.md`, whose rows a tripwire holds each member to. A repository outside the family fails that tripwire on its first run, and it would take on the family's identity and words if it passed.

Meta-model already carries part of the machinery. `init` writes the seat hook, `commits` runs the seat check against the seats the instance declares, and `instance-check.yml` runs both at the pinned tag. The family's `PINS.md` already names a `core-release` pin, the `tooling` line in an instance's manifest. What an outside company is missing is the form and the pins.

## The levels this serves

The machinery is the third of the levels an instance can reach:

1. Model: `init` vendors core, records `tooling` and `core` with a hash per file, and writes the agent skills and the seat hook.
2. Gated: a repository runs `instance-check.yml` at the pinned tag, and its default branch requires it.
3. Governed: every repository is held to one Markdown form, declares what it takes from another, and is told which of those pins are behind. This spec.
4. Served: `mcp-server` and `chat-server` run over the model at a pinned commit, in the company's own deployment.
5. Published: surfaces drawn from the model.

Before this spec only the family reached the third level.

## Phase 1: what ships

Four parts, all in meta-model, all moved by `tooling`.

**The form check.** `markdown-rules.cjs` and the markdownlint version `conventions-format` pins move into meta-model unchanged, so the family's form is everyone's. `check` runs it over every Markdown file in the repository except the paths in the manifest's `exclude`, and a form failure is a failure like any other, exit 1. The form is fixed: a repository can exclude paths and cannot turn a rule on or off. The parser, the plugin and the MCP server all read model files, and one form means none of them meets a surprise. Adding overrides later is a minor release; taking them away would be a major.

**The pin report.** `companygraph pins [<folder>]` reads `pins.json` in that one repository and asks each pin's upstream for its newest tag or commit with `git ls-remote`, without cloning. It prints one line per pin: `current`, `behind <newest>`, `unknown` when the upstream cannot be reached, or `unmanaged` for a pin line the repository holds and `pins.json` does not declare. A pin that is behind is intent until the owner says it is drift, so `pins` exits 0 when one is. It exits 1 only when `pins.json` cannot be read or an entry names no line in the file it names. It moves nothing.

**The pin kinds.** `pins.json` keeps the shape `PINS.md` gives it, so the family's files read the same. Phase 1 reads `pins` and leaves `after`, `verify` and `release` to the resync run. It reads every kind `PINS.md` names except `conventions` and `service-conventions`, which are the family's own and which phase 2 replaces; a file that declares one is reported as such and not refused.

**Taking the machinery.** `init` writes it into every new instance and `upgrade` into every existing one: the form check in `check` and in `instance-check.yml`, the seat hook as today, and a `pins.json` that declares the instance's own `core-release` pin:

```json
{ "pins": [{ "kind": "core-release", "file": ".companygraph/manifest.json", "repo": "companygraph/meta-model" }] }
```

A repository that is not an instance, a site or a service that draws a model at a commit, takes it with `companygraph adopt [<folder>]`. It writes a manifest with `tooling` and `exclude` and no `core` and no `files`, the workflow, the seat hook and `{ "pins": [] }`. In a folder that is already an instance it refuses by name and points at `upgrade`. The menu gains `adopt` and `pins` beside `check` and `upgrade`.

## Files and failures

The manifest gains `exclude`, an array of paths the form check skips. `init` and `upgrade` write `["dist", "meta"]` for an instance, so the vendored core is held by meta-model and not by the instance a second time; `adopt` writes `["dist"]`.

`upgrade` runs the form check of the release it is moving to before it moves anything. When the repository's Markdown fails, it lists the failures and stops, and `--force` moves anyway. A new instance is written clean, and the family's three instances are already held to the same form by the `conventions` job, so the stop is for an instance made outside the family before this release.

The checker has had no dependencies, and `instance-check.yml` says so: nothing is installed, so a maintainer without Node still gets the gate. The form check breaks that once, on purpose. markdownlint is a library an editor plugin can bundle too, and a form held by one tool in CI and another in the editor is two forms, which is why `conventions-format` took it. The workflow runs it as `conventions-format` does, with `npx` at the pinned version; `check` does the same locally, so the first local run needs the network and later ones use the cache.

## Tests

Each check runs on fixtures: an instance whose Markdown passes and one with a heading out of order; a `pins.json` with a pin that is current, one that is behind, one whose upstream cannot be reached and an entry that names no line. `git ls-remote` is replaced by a fake that answers fixed tags and commits, so no test reaches the network. `adopt` runs into an empty folder and into an instance. `upgrade` runs against an instance whose Markdown fails, with and without `--force`. The menu's drawing gains its two entries, and companygraph.io's `/cli/` page, which restates the menu, changes with it.

## Release

A minor release of the package; core does not change, so `core/manifest.json` stays where it is. The three family instances take it by re-pin. The family's `conventions` job keeps running beside it, and in phase 1 a family member runs both form checks, which agree because they read the same rules at the same version.

## Phase 2

The family moves onto the machinery, and a spec of its own says how. Decided now: `robertblust/conventions` keeps its content and pins meta-model for the machinery. Left to that spec:

- The prose check as an engine that reads its word lists from the repository, with the family's lists as its first content. Until then an outside company writes its language rules as `rule` entities a reviewer holds a change against.
- The resync run, which moves pins through to merged pull requests and releases, proved on the family before an outside company relies on it.
- The list of repositories a report across all of them needs: a file, or a `repository` type in core. No core type names a repository today; a surface names the one that builds it as a string and a source names its URL.

## Not part of this

The software pack's plan offers the pack to a new instance with `init --pack software`, and `upgrade` moves only the packs a manifest already lists, so an instance made before the pack ships has no way to take it. That is a change to the plan of September 30, not to this spec: `upgrade --pack <name>`.

A site generator for a company outside the family. The family's sites are drawn with `robertblust/design`, which is the family's; an outside company reaches the fifth level through the surface and export skills.
