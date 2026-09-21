# CompanyGraph describes itself — design

> A second instance, `companygraph/mental-model`, describing the company behind the
> meta-model in the meta-model's own vocabulary; and companygraph.io drawing it on the
> landing page, where a picture of the shape stands today.

Status: designed, not built. The instance is a new repository; this spec lives here because what it produces is about core and the tooling, not about one company's copy. It is the second instance and the first one the tooling creates, so it tests `init` the way the reference instance tested the layout.

Reads against [`2026-08-26-reference-instance-design.md`](2026-08-26-reference-instance-design.md) — §1 (what an instance spec owns), §3 (the layout), §7 (what an instance teaches) — and [`2026-09-20-the-cli-design.md`](2026-09-20-the-cli-design.md) — §2 (`init`), §3 (the plan). Where this spec and either of those disagree, their decisions stand and this one records the disagreement as a finding in §8.

---

## 1. Purpose and non-goals

The reference instance answered whether the vocabulary could hold a real company. It could not answer whether the vocabulary holds a company that is not a person, because the company it describes is one: its vision, its strategies and its processes are all a person's, and nothing in it shows which parts of the vocabulary need a person behind them and which do not. A second instance with no people in it separates the two.

**Owns:**

- one instance repository, `companygraph/mental-model`, created by running the tooling rather
  than by laying out folders — the first instance `init` produces
- the content: CompanyGraph described by what it is for, what it will and will not do, where
  it is published and how it works, with no person in it
- the landing page of companygraph.io drawing that instance on the shared stage, in place of
  the drawn figure that stands there now
- a second pin on that site, and the build target that reads it
- a findings section, §8, naming what `init`, core or the conventions got wrong

**Non-goals:**

- any person, skill, experience, role or proficiency level in the instance. Decided, not
  deferred: §3 says why, and the finding it would produce is worth more than the coverage
- an MCP server over this instance. mcp.blust.ch serves the reference instance; a second
  deployment is its own decision and nothing here depends on it
- per-entity pages on companygraph.io. The site renders no entity pages for `/model/` or
  `/example/` either — the stage draws the card from the artifact, client side — and this
  instance gets the same treatment
- retiring `/example/`. Beacon Systems stays: it is the only place on the site a multi-person
  company is shown, and this instance, having no people, cannot replace it
- a second language in the instance. Core has no mechanism for one; the German on the site is
  the site's, in the `-de` attributes the family already uses

---

## 2. The instance

`companygraph/mental-model`, named for what every instance in the family is called rather than for what distinguishes it. The cost is real and was weighed: `companygraph/mental-model` and `companygraph/meta-model` differ by one letter in the same organization list. The alternatives, `company-model` and `model`, each buy that back and spend a family-wide name to do it, and `model` collides with the site's `/model/` page, which is the core vocabulary and a different thing. One name for one kind of repository is worth more than one letter of distance.

**It is created by running the tooling, not by copying the reference instance.** `init` is designed and built on the open pull request #105 and exists in no release, so the run is `node ../meta-model/bin/companygraph.mjs init . --here` from inside the new, empty repository, with `../meta-model` checked out at that pull request's head. That is the point rather than a shortcut around a missing release: the tooling's own spec is not done until the tool has made something, and a second instance made by hand would prove the layout twice and the tool not at all. What the run gets wrong is a finding against #105 while #105 is still open, which is the cheapest moment it will ever be.

Two things the run leaves to be corrected by hand, both recorded as findings in §8:

- the two pins. `init` records the release it is as `tooling` in `.companygraph/manifest.json`
  and pins `.github/workflows/companygraph.yml` to that same release by design, and a `--core`
  naming a newer one leaves that pair unable to check the core it just vendored, so neither pin
  is wrong by itself and both move together — §8 records what the run did. Both are set to the
  newest release whose checker this instance actually passes, and moved to the release that
  carries #105 once there is one.
- the empty folders. `readmesFor(rootFolders())` writes a README into every root type folder,
  so a fresh instance carries `model/profiles/`, `model/skills/`, `model/roles/`,
  `model/proficiency-levels/`, `model/experience-kinds/` and `model/achievement-kinds/` whether
  or not it will populate them. The meta-model README's own words are that a consultancy "has
  none of those and should not carry empty folders implying it forgot." The six this instance
  does not populate are removed after the run.

On top of what `init` writes, the repository joins the conventions family: the vendored `conventions/`, a `conventions.json` pin, `.markdownlint-cli2.jsonc` at the root, and the `check.yml` that calls the shared `conventions / conventions` job beside the instance check. Its `README.md` is titled `CompanyGraph — Mental Model`, and `REPOSITORIES.md` carries that title in the row §6 adds.

Licensed as the reference instance is: CC BY 4.0 for everything written in `model/` and `docs/`, with `meta/core/` staying under its own Apache 2.0. The content is prose describing a company, which is what a content license is for, and the vendored core is not written here.

---

## 3. Content

Direction, operation and surfaces, and no organization at all. In folders:

```text
model/identity.md            CompanyGraph, and where it can be found
model/vision.md              the future it works toward
model/sources/               where each page's facts are mastered
model/values/                what it will and will not do
model/strategic-objectives/  what must become true for the vision to be reached
model/strategies/            how one gets reached, and what the route rules out
model/surfaces/              one file per place the model is published
model/processes/             its one kind of work, phase by phase, with tracks
```

**No person appears in this instance.** CompanyGraph is operated by the company of one that `robertblust/mental-model` describes, and that is where the person is described. Writing a `profiles/robert-blust/` here would put one person's canonical name in two instances with two sets of facts behind it, and the second set would go stale without a sound. An instance that declares no `profile` is legal by design — core defines a type without obliging an instance to populate it — and this is the first instance to exercise that, which is a finding in its own right: every check that walks profiles now has a case where there are none.

What each entry says is drawn from prose that is already published and already reviewed: the organization profile at github.com/companygraph, this repository's README and the specs beside this file, the pages of companygraph.io, and the twelve-minute introduction. Nothing is invented, and a claim that cannot be traced to one of those does not go in. The surfaces are the ones that exist, classified by how each is produced, under the rule that a surface is named for the page and never for the place.

The entries are written and reviewed one at a time — what it says, the case against it, a proposal, the owner's decision — because these are editorial facts about the company rather than a schema being filled in. Nothing is committed ahead of that review.

The count is not written here. It is what `model/` holds on the day someone looks, and a number in this paragraph would be true for a week.

---

## 4. The site's second source

companygraph.io draws two artifacts today, both from one pin: `example.json` from the meta-model's `example/` and `model.json` from its `core/`. A third artifact comes from a different repository, so the site needs a second pin, and `source.json` grows into the shape guestgraph.io's `api-sources.json` already uses for the same reason:

```json
{ "meta-model":   { "repo": "companygraph/meta-model",   "commit": "…" },
  "mental-model": { "repo": "companygraph/mental-model", "commit": "…" } }
```

One file still holds every pin the site has, which is the property the site's own history was protecting when it consolidated `example/source.json` into a root `source.json`. A second file beside it would have kept `build.mjs` and `pages.mjs` untouched and left a reader two files that differ only in which repository they name.

`build/build.mjs` gains a third target: `parseInstance`, files from `model/`, schemas from the instance's own `meta/core/`, which is how blust.ch reads the reference instance and not how the example target works — the example is parsed against the core it sits beside in the same commit, and an instance carries its own. Each target names the pin it reads. `MENTAL_MODEL` joins `META_MODEL` as the local-checkout escape hatch, and refuses a checkout whose `HEAD` is not the commit the pin names, exactly as the first one does.

The artifact is `company.json`. `model.json` is taken by the core vocabulary and `instance.json` says less than either. `build/pages.mjs` adds it to the loop it already runs and compares each artifact's commit against its own pin rather than against one; `pin-check.mjs` reports both pins, which `pinDrift` already supports by taking a `pin` argument. Both pins are editorial, and neither moves without a commit that says why.

The JSON-LD the site writes names `example.json` as a `Dataset`. `company.json` is the same kind of thing on the landing page and is named the same way.

---

## 5. The page

The landing page carries a drawn figure: two trees in `--c-weak` and the shape they share in `--c-firm`, with a caption that makes the page's argument in words. It is replaced by the model it argues for.

The stage is the one component `/model/` and `/example/` already share — `stage.css`, `d3.v7.min.js`, `stage.js` and a generated contract block of CSS, all copied byte-identical, with `<link rel="preload" as="fetch" href="company.json" data-stage crossorigin>` pointing it at the artifact. It goes **inside the existing `<figure class="figure">`**, replacing the `<svg class="fig">` and keeping the `<figcaption>`. A new section under the hero would have meant deleting the figure's CSS, rebuilding the caption and teaching the card recipe a new selector, for the same result in the same place.

The `.fig` rules, the three `@keyframes` blocks and the figure's reduced-motion block go with the drawing they styled. The caption stays and gets new words: that this is CompanyGraph's own model, drawn from the repository the page links to. Every string the stage adds carries a `data-de` attribute, taken from `/example/` where it is the same string, and made by the translator where it is not.

**The share card does not change.** `HOME_HIDE` is `.figure{display:none}`, so a stage inside that figure is hidden by the rule that hid the drawing, and the card goes on showing the headline and the call to action. That was weighed against making it the third stage card: the two stage pages show their stage because the stage is what those pages are about, and the landing card's job is the claim and the way in, which is the reasoning already written into `og-recipe.mjs` and is not weakened by the drawing underneath becoming real.

The header mark is derived from the figure that leaves, and the caption is where that derivation was stated. It is not restated. A mark does not need a footnote, and the caption's words are better spent on the model that is now drawn under it; the derivation stays in the source comments for a reader who looks.

The navigation is unchanged. The graph is on the landing page, so it needs no entry pointing at itself, and `/example/` keeps the entry it has.

---

## 6. What this reaches beyond the three repositories

The site's `README.md` and `AGENTS.md` both say the site has one pin and stop being true; both say which artifact is built from what, and gain the third.

The organization profile at `companygraph/.github` carries the repository table a reader meets before choosing a repository, and the diagram of which repository holds what. Both gain `companygraph/mental-model` and the edges it sits on: core vendored at a release, and the site pinning it by commit.

`conventions/REPOSITORIES.md` names every member of the family and what pins what, and a tripwire holds each member to its row. A new member is an edit there, a conventions release and a re-sync — which is the one part of this work that reaches every member rather than these three. Whether that re-sync is its own wave or rides the next one is the owner's call and not this spec's.

---

## 7. Order of work and verification

The instance ships first and merges first. The site cannot pin a commit that does not exist, and a pin added to an unmerged branch is a pin to a commit that may be rewritten.

1. **The instance.** Run `init` as §2 spells it, correct the two things §2 names,
   add the conventions member files, then write the content entry by entry under review.
   Verified by `bin/check-instance.mjs` and the shared `conventions` job, both green on the
   pull request.
2. **The conventions row.** `REPOSITORIES.md` gains the member, released, and the members
   re-synced on the owner's word. It follows rather than precedes because a repository the
   list does not name passes: `conventions-check` says the title is not checked and moves on,
   so the new member is green from its first run and gains the title check when the row lands.
3. **The site's second source.** `source.json`, `build/build.mjs`, `build/pages.mjs` and
   `pin-check.mjs`, with `company.json` built and committed. Verified by `npm run build:check`
   and `npm run pages:check` passing against a freshly built artifact, and by the renderer
   tests.
4. **The page.** The stage in place of the figure, the caption rewritten, the German made from
   the reviewed English. Verified by `npm run verify` with the landing page's spec extended to
   the stage click-through the other two pages already have, `npm run og:check` passing with no
   re-render, and `npm run sitemap` run because a page was edited.
5. **The documents.** The site's README and agent file, and the organization profile.

CI never writes what the repository commits, so `company.json` is built locally and committed, and the check proves the committed copy is what the pin parses to.

---

## 8. What it teaches

Findings against core, the tooling or the conventions, recorded here rather than acted on; each is its own follow-up. They are observations rather than predictions now: the instance was created by running `init`, the command [`2026-09-20-the-cli-design.md`](2026-09-20-the-cli-design.md) designs, from inside the new, empty repository, as `node ../meta-model/bin/companygraph.mjs init . --here --agent claude --name CompanyGraph --core v0.35.0`, where `../meta-model` is a checkout at the head of `the-cli-design` — [#105](https://github.com/companygraph/meta-model/pull/105)'s head commit, and the only place the command exists — whose package version reads `0.32.0`. It wrote forty files and exited 0, and everything below is what that run and the checks after it produced. The two findings this section carried before the run are both superseded — the first by what the tool wrote, the second by a comment in the tool that answers it.

**The `--core` path leaves nothing able to say which checker should run the instance it just made.** The run wrote `"tooling": "0.32.0"` into `.companygraph/manifest.json`, beside `"core": { "version": "0.34.0", "shape": 3, "source": "fetched:v0.35.0" }`, and pinned the workflow it wrote to `instance-check.yml@v0.32.0`. Both halves of that pin refuse what it made. The `0.32.0` checker — the release the instance names, and the one its own CI would run — exits 1 with

```text
✗ this checker is 0.32.0 and .companygraph/manifest.json vendors core 0.34.0 — a checker cannot hold an instance to a core newer than itself; move the workflow pin to v0.34.0
```

and the `0.35.0` checker, which can run core `0.34.0`, exits 1 with

```text
✗ this checker is 0.35.0 and .companygraph/manifest.json names 0.32.0 — move the pin and the workflow together, or call the release the manifest names
```

This section predicted that the core-newer guard would fire. It does, but only from the older side: the tooling-version guard fires from the newer one, so both fire, and an `init --core <tag>` whose fetched release is newer than the package fetching it produces a repository no released checker runs. It went green only after the two lines the tool itself wrote were edited by hand, which is the correction §2 has the instance make. Nothing here is a pin written carelessly: `tooling` can only name the release `init` is, that release cannot check the core it was told to vendor, and the tool has no third value to write. Whether `init` should refuse `--core <tag>` before writing anything when the fetched core is newer than the core the running package carries — on the reasoning `check-instance.mjs` already gives, that a checker may lag its core's vocabulary in one direction only — or whether `--core` is usable only for a release at or below the running package's own and should say so, is the follow-up's to decide.

**`init` pinning the workflow to its own version is deliberate, and the finding that stood here is withdrawn.** This section called that pin a defect because `v${tooling}` need not name a release carrying the code that ran. `lib/plan.mjs:49-56` writes it under a comment recording that the alternative was tried and reverted: "pinning the workflow to the fetched tag instead made an instance's own CI red on its first commit whenever `--core` named a release older than this package's own version." The workflow ref and `tooling` are one pin by design, which is what the checker's first guard compares itself against, and the fetched tag feeds `core.source` alone because which core is vendored is a separate fact from which checker runs it. That comment reasons about `--core` naming an older release; the case this run hit is the newer one, where both pins fail together because they are the same pin. That is the finding above, and this is not one.

**`init` writes a folder for every root type core declares.** `readmesFor(rootFolders())` gave this instance `model/profiles/`, `model/skills/`, `model/roles/`, `model/proficiency-levels/`, `model/experience-kinds/` and `model/achievement-kinds/`, each holding a `README.md` and nothing else, and an instance that declares no people deleted all six by hand after the run. Empty folders are legal — the check passes before the deletion and after it — but this repository's own README says a company that has none of those things should not carry folders implying it forgot. Whether the remedy is a flag, a prompt or writing only the folders an instance asks for is the follow-up's to decide.

**The `0.32.0` refusal names the workflow and not the manifest.** Its remedy, "move the workflow pin to v0.34.0", points at a real release whose checker can run core `0.34.0`, so it works as far as it goes. It names one of the two pins: `.companygraph/manifest.json`'s `tooling` is the field the other guard then refuses on, so a reader following it literally moves one line and meets the next refusal. The `0.35.0` wording, "move the pin and the workflow together", says both.

**The manifest's per-file hashes are read by no released command and by no gate.** `init` writes a sha256 for every vendored file into `.companygraph/manifest.json` — twenty entries in this instance — and the only code that reads them is `companygraph upgrade`, at `lib/plan.mjs:107-110`. That code is in no release: `bin/` at `v0.35.0` holds `check-instance.mjs` alone and `bin/companygraph.mjs` does not exist there at all, and the checker reads `tooling`, `core.version` and `units` from the manifest and nothing else. The reusable workflow an instance pins runs that one command, so the gate on every commit does not read them either. Observed on this instance: one run of `sh conventions/conventions-format fix` with `meta` out of `format-exclude` rewrote eighteen of the twenty hashed files, and the instance check, `conventions-format` and `conventions-check` each exited 0 afterwards.

That path is the family's own rather than a hypothetical. `conventions-format fix` rewrites every Markdown file it is not told to skip, `.vscode/` asks VS Code to run the same library on save, and `conventions.json`'s `format-exclude` is the only thing holding either off `meta/core/` — which an instance `init` makes does not have, because joining the conventions is a later step. When the rewrite is finally met, `upgrade` does not report it but refuses, with "These vendored files are not as this tooling last wrote them, so nothing was written:" and the list, and the refusal lands on whoever next upgrades rather than on whoever made the edit.

Two things to put to the author. Should `check` read the hashes it already holds, at one `createHash` per vendored file, on the only command that runs on every commit? If not, should `init` write into every instance a record that one unreleased command reads, which reads to a maintainer like an integrity guarantee the repository does not have? There is an argument on the other side that the author may already hold: core's bytes are not a modeling rule, and a checker failing on whitespace would fail an instance for as long as the family's Markdown form and core's committed bytes disagree — which is exactly the window this work is in, with conventions v1.23.0's reflow merged into core here and no release carrying it.

Further findings are added as the work produces them.
