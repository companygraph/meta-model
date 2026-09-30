# Consumers take stable ids Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every repository that reads meta-model's parser output keeps working once an instance's pages carry stable ids, so the three instances can then take v0.65.0 and backfill.

**Architecture:** Since v0.65.0 the parser hands out an entity's stable id as `id`, `owner`, edge `from`/`to`, qualifier values and `rootId`, and the folder-and-slug path as `address`; a page without an id keeps its path as `id`. Every consumer reads `address` wherever it means where a page sits (a folder, a breadcrumb, an anchor, an image file, a readable link) and keeps `id` wherever it means which entity (a lookup, an edge, a citation). A consumer that takes an entity from outside accepts either form and hands out the id. Each change reads `e.address ?? e.id`, so it works on data built by the old parser and the new one, and ships before any instance backfills.

**Tech Stack:** Node 22 ES modules, `node --test`, Playwright checks, esbuild (plugin), the family's release-by-tag and pin conventions.

**Spec:** `docs/superpowers/specs/2026-09-30-an-entity-keeps-its-id-design.md` (sections "What the tools accept and return" and "The sites").

The work runs in two waves, because a site cannot pin a release that does not exist. Wave A is the libraries: meta-model's patch, design, mcp-server, chat-server and the Obsidian plugin, each a pull request and then a release the owner cuts. Wave B is the takers: the three sites and the three MCP deployments, each re-pinning the wave A releases. Step 2, the instances' backfill, follows wave B and is not in this plan.

## Global Constraints

- Where a page sits is `address`; which entity it is is `id`. Code that needs where reads `e.address ?? e.id`, never `e.id` alone.
- A readable link stays readable: the stage's `#hash`, a timeline anchor, a surface anchor and a principle anchor are built from the address, so every hand-written link in the sites keeps working unchanged.
- Anything that takes an entity from outside (a URL hash, a `postMessage`, an MCP tool argument) accepts the stable id or the current address, and resolves the id first.
- Published images stay named by address: `imagesOf` returns `to` as `<address>.<ext>`, and every image URL is built from `address ?? id`.
- An MCP answer always carries the stable id as `id`; it adds nothing called `address` to its output unless a task says so.
- Every test that only held true because id and path were one string is rewritten to read the value off the data or to carry both fields; none is deleted or loosened.
- No pin moves in wave A except each repository's own meta-model or mcp-server pin where a task says so. Releases, tags and merges are the owner's word.
- Commits: authored by the seat (`Implementer <implementer@<governing domain>>`, blust.ch for robertblust repositories, companygraph.io for companygraph ones, guestgraph.io for guestgraph ones), prose in the git register, a `Verified:` line naming the commands run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and `Co-Authored-By` naming the model that wrote the commit.
- Every branch lives in a sibling worktree `../<repository>-<branch>`. Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.

## Review Focus

- A stage opened at `#skills/java-programming`, and at a folder hash with no entity of its own such as `#processes/delivery/phases`, must still land where it did, with the breadcrumb it showed, once `model.json` carries UUID ids. Pinned in Task 2.
- A chat citation link carries the stable id (`#0192…`); the stage must open that entity and rewrite the hash to its address. Pinned in Task 2.
- An avatar on a card, in the MCP's `image_url` and in blust.ch's JSON-LD must resolve to the file `imagesOf` actually wrote, `<address>.<ext>`. Pinned in Tasks 2, 3 and 6.
- An MCP call with an owner's address (`owner: "profiles/mira-halvorsen"`) must return that owner's entities, each with its stable id, the same as a call with the owner's id. Pinned in Task 3.
- A page made by the plugin's "New entity" command must pass R18 on its first save. Pinned in Task 5.

---

### Task 1: meta-model exports its id maker, and the maker runs anywhere

**Repository:** companygraph/meta-model

**Files:** Modify `lib/ids.mjs`, `package.json` (`exports`), `verify/ids.test.mjs`.

- [ ] Replace `randomBytes` from `node:crypto` with `globalThis.crypto.getRandomValues(new Uint8Array(10))`, and `Buffer` with a `Uint8Array(16)` and a hex encoder, so the module has no Node import and bundles for a browser or Obsidian. `uuidv7(ms, random)` keeps its signature; `random` is any byte array of at least ten bytes.
- [ ] Add `"./ids": "./lib/ids.mjs"` to `exports`.
- [ ] Add a test that imports through the package name the way a consumer does (`import("companygraph-meta-model/ids")` resolved from the repository root via a self-reference, or a subprocess that resolves the exports map), and one that `uuidv7(ms, new Uint8Array(10))` gives the same id as a `Buffer` of the same bytes.
- [ ] Run `npm run verify && npm run test:ids && npm run test:instance && npm run test:instance-checks && npm run test:plan && npm run test:cli` and commit.

The release that follows is a patch, v0.65.1, core unchanged.

### Task 2: design reads where from address and which from id

**Repository:** robertblust/design

**Files:** `assets/stage.js`, `assets/card.js`, `assets/chat.js`, `lib/render/principles.mjs`, `lib/render/home.mjs`, `lib/render/surfaces.mjs`, `blocks/surfaces.js`, `blocks/model-card.js`, `verify/stage.mjs`, `verify/links/resolve.mjs`, `test/fixtures/team.mjs`, the stage and card tests.

- [ ] `stage.js`: every folder operation reads the address: `folderIdOf`, `nFolder`'s child ids (`n.id + "/" + t.folder`), `nodeById`'s walk, `pathOf` (the breadcrumb), `pagesUnder`'s count. A stage node carries the entity's address as its path-shaped key and the entity's id for `byId`, `refsOut`/`refsIn` and `rootId`. `focus()` writes the address to `location.hash`. The hashchange handler, the initial hash and the `rb-graph-focus` `postMessage` accept an id or an address: a direct `byId` hit first, then the address walk; on an id hit it rewrites the hash to the address with `history.replaceState`.
- [ ] `card.js`: `avatar()` builds the image URL from `e.address ?? e.id` (the `encId` split stays, on the address); `levelOwner()` tests ancestry on addresses. Lookups by id (`entityOf`, `resolveFrom`, edge matching) stay on id.
- [ ] `chat.js`: `link()` keeps writing the id it is given, since the stage now accepts either; correct the comment that says an id is `type/slug`.
- [ ] `principles.mjs`'s `slugOf` and `surfaces.mjs`'s `slug` read the address. `model-card.js` keeps `data-role` as the id and builds its stage href from the entity's address when it has one.
- [ ] `verify/stage.mjs` and `verify/links/resolve.mjs` derive folders and expected hashes from `address ?? id`.
- [ ] Fixtures: `test/fixtures/team.mjs` and the stage fixtures carry both fields, with UUID-shaped ids and path-shaped addresses, so the tests exercise the split; keep one fixture without `address` to prove the fallback. Tests pin the first three Review Focus lines that fall to design: a folder hash lands with its breadcrumb, an id hash opens the entity and rewrites to the address, an avatar URL uses the address.
- [ ] Run design's `npm test` and its page checks, and commit.

The release that follows is a minor.

### Task 3: mcp-server accepts an id or an address and hands out the id

**Repository:** companygraph/mcp-server

**Files:** `package.json` and `package-lock.json` (meta-model pin to v0.65.1 once released; until then v0.65.0), `lib/model.mjs`, `lib/diagram.mjs` (through `requireId`), `lib/tools.mjs` (descriptions), `lib/server.mjs` (instructions), `scripts/interface.mjs`, `docs/INTERFACE.md`, the tests.

- [ ] Re-pin meta-model and run `npm run fixtures`, as `pins.json`'s `after` says.
- [ ] `requireId(s, value)` resolves an id first, then an entity whose `address` equals the value, and returns the entity; every caller uses the returned entity's `id` from there on, so `owner` filters in `listEntities` and `search`, `list_references`' `entity`, `diagram`'s `id` and `domain`, and `find_evidence`'s `skill` (after its id and name tries) all accept either form. A value that is neither is the same `unknown_entity` refusal as today.
- [ ] `imageUrl(s, e)` builds from `e.address ?? e.id`; `deploy/build/jsonld.mjs` inherits it.
- [ ] The glossary in `lib/server.mjs` and the `get_entity` description say an entity is taken by its id or by its address, where its page sits, and that an answer always gives the id. `docs/INTERFACE.md`'s hand-written definition of an id stops giving a path as its example.
- [ ] `scripts/interface.mjs` and every test listed in the consumer map that names an entity by a literal path resolve it off the served snapshot, as `lib/contract.mjs`'s `sampleCalls` does; `test/model.test.mjs`'s `startsWith(owner + "/")` assertions test `address`. Add tests with a fixture whose pages carry ids: an owner's address and its id give the same `list_entities` answer, every answer's `id` is the stable id, `image_url` ends in `<address>.<ext>`.
- [ ] Regenerate `docs/INTERFACE.md` with `npm run interface`, run `npm test`, and commit.

The release that follows is a minor.

### Task 4: chat-server stops naming a literal id

**Repository:** companygraph/chat-server

**Files:** `lib/prompt.mjs`, `test/prompt.test.mjs`.

- [ ] Rule 4's "get_entity with the id identity first" becomes a sentence that holds under stable ids: the identity is taken by its address, `identity`, which every instance's identity page has, since the file is named for its type (R12), and which the MCP server accepts from Task 3's release on. Keep the rule's intent and the test's check that the rule is there, reworded to match.
- [ ] Run `npm test` and commit.

Dropped after a local measurement. Reworded to "get_entity for identity first", the model called `get_entity` with `type: "identity"` and took three calls where the old wording took one. The old sentence names the tool's argument, `id`, and Task 3's server resolves the address `identity` there, so it stays true under stable ids and chat-server needs no change or release.

### Task 5: the Obsidian plugin scopes owners by address and writes an id into a new page

**Repository:** companygraph/obsidian-plugin

**Files:** `package.json` and lock (meta-model pin to v0.65.1), `src/meta-model.d.ts`, `src/scope.ts`, `src/scaffold.ts`, `src/newentity.ts`, the tests.

- [ ] Re-pin meta-model to v0.65.1 and fetch fixtures. `meta-model.d.ts` declares `address` on `Entity` and the `companygraph-meta-model/ids` module.
- [ ] `Named` carries `address`, from `e.address`, and `namedOf` passes it, so `resolveRow`/`rowScope` read an owner's folder from it.
- [ ] `scaffoldOf` writes `id: <uuidv7()>` as the first frontmatter line of every page it makes, when the instance's `model/identifier.md` declares `uuidv7` or the instance has no identifier file and its vendored core declares `id`; under a declared `pattern` it writes `id: ` for the author to fill, and the new-entity notice says so. A test pins that a scaffolded page passes `checkInstance`'s R18 check.
- [ ] Tests with a fixture whose owner carries a stable id pin that an owned row still resolves. Run `npm test`, `npm run build`, and `npm run e2e` where Obsidian is available, and commit.

The release that follows is a minor.

### Task 6: the sites take wave A

**Repositories:** robertblust/robertblust.github.io, companygraph/companygraph.github.io, guestgraph/guestgraph.github.io. Starts after the owner has released Tasks 1 to 3.

- [ ] Each site re-pins design (the `npm run design` fence), meta-model (v0.65.1) and mcp-server, runs `npm ci`, rebuilds (`npm run model` or `npm run build`, then `npm run pages`, `npm run pictures` where pictures changed) and commits what the build writes; model.json gains `address` on every entity.
- [ ] blust.ch: `build/jsonld.mjs`'s `imageOf` reads `profile.address ?? profile.id` and its comment says so, with `build/renderers.test.mjs`'s fixture carrying an address and a second fixture without one; `timeline/index.html`'s `stem()` slices the address, and its `goLink` builds the stage href from `byId[id].address ?? id`, so a skill link on the timeline stays `#skills/…`; `verify/check.mjs`'s ledger checks (`stem`, the `endsWith` matches, the `#skills/` regex, the `sameTab` fixture) read the address.
- [ ] Run each site's `npm run test:build`, its `*:check` steps and `npm run verify`, and commit. Each site is its own pull request.

### Task 7: the MCP deployments take wave A

**Repositories:** robertblust/mcp-blust-ch, companygraph/mcp-companygraph-io, guestgraph/mcp-guestgraph-io. Starts after the owner has released Tasks 2 to 4.

- [ ] Each re-pins mcp-server and design as its `package.json` files name them, rebuilds its snapshot, and runs its tests. mcp-blust-ch's `test/instance.test.mjs` takes its ids off the snapshot, and its JSON-LD image assertion builds from the address.
- [ ] Deploying is the owner's word, as it always is.

---

## After wave B

Step 2: each instance re-pins core with `companygraph upgrade`, runs `companygraph ids --backfill` in a full clone, and commits; then each site's `source.json` and each deployment's `source.json` move to the backfilled commit, the site no later than its deployment: a chat cite carrying a UUID into a `model.json` whose ids are still paths finds nothing and opens the root, while a path cite into a backfilled `model.json` still resolves through the address. The spec's `/id/<uuid>` redirect and a JSON-LD `@id` per entity are not built here: no site emits a per-entity JSON-LD node today, so nothing breaks without them, and they are their own change.
