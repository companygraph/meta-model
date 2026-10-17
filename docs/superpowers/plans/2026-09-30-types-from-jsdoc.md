# Types written as JSDoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The package ships declarations a TypeScript consumer can import in place of its own, generated from JSDoc in the JavaScript that runs, committed under `types/` and held to that JSDoc in CI, released as the package's next minor, and taken by the Obsidian plugin, which drops its hand-kept copy.

**Architecture:** `lib/*.mjs` and `bin/*.mjs` stay the source. The compiler runs with `allowJs`, `checkJs` and `emitDeclarationOnly` and writes `types/lib/<name>.d.mts` and `types/bin/<name>.d.mts`. `package.json` points each export's `types` condition at `types/lib/`. `tools/build-check.mjs` compiles into a temporary folder and compares. The type shapes are pull request #193's, carried over from its `src/*.mts` into JSDoc.

**Tech Stack:** TypeScript and `@types/node` as exact devDependencies with a lockfile, Node's own test runner, `acorn` in a scratch folder for the syntax-tree comparison.

**Spec:** `docs/superpowers/specs/2026-09-30-types-from-jsdoc-design.md`

## Global Constraints

- The JavaScript that runs does not change. For every module in `lib/` and `bin/`, the syntax tree parsed with `acorn` (positions dropped) equals `main`'s, and every `//` comment `main` has is still there, in order. The only non-comment edit allowed is the parentheses a `/** @type {T} */ (expr)` cast needs.
- A type #193 declared keeps its name and shape. A type alias where #193 had an interface is allowed; any other difference is written down in the task's report.
- `parseInstance` and `imagesOf` declare `schemas` required, through an `@overload` above the lenient implementation signature.
- No runtime dependency and no `prepare` script. `instance-check.yml` installs nothing.
- The package moves 0.64.0 → 0.65.0 in `package.json`, and `.github/workflows/instance-check.yml`'s `ref:` moves to `v0.65.0` in the same commit. Core does not move.
- Every commit is authored by the seat that did the work, with trailers `Process: Delivery`, `Phase` and `Track` and the `Co-Authored-By` line; the code commit also names the contributor of #193, whose type shapes it carries. Each message ends with a `Verified:` line naming the commands actually run.
- Nothing is merged, tagged or released without the owner's word. Tasks 5 to 8 start only after it.

## Review Focus

- A cast that changes what runs. Held by the syntax-tree comparison, not by reading.
- A declaration looser than the code: `schemas` optional, or `type` optional on a row entity. Held by a probe in the plugin that calls `parseInstance` without `schemas` and expects a type error.
- A stale declaration. Held by `build:check` failing on a changed, missing or orphaned file under `types/`.
- A Windows checkout reading the declarations with CRLF. Held by `newLine: lf` and `.gitattributes`, and by the `windows` job running `build:check`.

## Task 1: The types, as JSDoc

**Files:** `tsconfig.json`, `package.json`, `package-lock.json`, `lib/*.mjs`, `bin/*.mjs`, `types/**`

- [ ] `tsconfig.json`: `allowJs`, `checkJs`, `declaration`, `emitDeclarationOnly`, `rootDir: "."`, `outDir: "types"`, `strict`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noEmitOnError`, `newLine: "lf"`, `skipLibCheck: false`, include `lib` and `bin`.
- [ ] `package.json`: each export gains `"types": "./types/lib/<name>.d.mts"` first; `files` gains `types/lib`; scripts `build` (`tsc`), `build:check`, `typecheck` (`tsc --noEmit`); devDependencies `typescript` and `@types/node`, exact. `npm install` writes the lockfile.
- [ ] JSDoc per module, in four parallel briefs that each own their files: `lib/instance.mjs` (it exports the shared types, so it goes first where a brief waits); `lib/checks.mjs`; `bin/`; the other eight modules in `lib/`.
- [ ] `npm run build`, and commit what it writes under `types/`.
- [ ] Verify: the syntax-tree comparison passes for every module; `npm run typecheck` exits 0; `npm run verify` and `node --test verify/*.test.mjs` pass as on `main`; `node bin/companygraph.mjs --help` prints the same bytes as on `main`.

## Task 2: The declarations are held to the JSDoc

**Files:** `tools/build-check.mjs`, `.github/workflows/ci.yml`, `.github/dependabot.yml`

- [ ] `tools/build-check.mjs` builds into a temporary folder, compares every file under `types/` byte for byte, fails on one that differs, is missing or that no module writes, and removes the folder on every path, a refused compile included.
- [ ] `ci.yml`: `verify` and `windows` run `npm ci` and `npm run build:check` before their suites. Job ids stay as the ruleset requires them.
- [ ] `dependabot.yml`: an npm block, grouped, holding `@types/node` to the major `engines` names.
- [ ] Verify: `npm run build:check` passes; with one declaration edited, one deleted and one stray file added, it names each and exits 1; after a refused compile no `meta-model-build-*` folder is left.

## Task 3: The prose says where the types are

**Files:** `AGENTS.md`, `README.md`

- [ ] `AGENTS.md`, under `## Checks`, after its first paragraph: a type is changed in the JSDoc, built and committed; `types/` is never edited by hand; what `build:check` fails on; no consumer installs the devDependencies.
- [ ] `README.md`: a `types/` line in the file tree, the `tools/build-check.mjs` line, and a sentence in the paragraph on what a consumer imports.
- [ ] Verify: `sh conventions/conventions-check` and `sh conventions/conventions-format` pass.

## Task 4: The package at 0.65.0

**Files:** `package.json`, `.github/workflows/instance-check.yml`

- [ ] `version` 0.64.0 → 0.65.0 and `instance-check.yml`'s `ref:` → `v0.65.0`, one commit. A minor: the package adds declarations and asks a consumer for nothing beyond a re-pin.
- [ ] Verify: `npm run verify` passes.

## Task 5: The release (after the owner's merge)

- [ ] Tag `v0.65.0` on the merge commit and publish the GitHub Release. The notes say what a consumer gains (declarations for every export), that nothing breaks, and how to take it: re-pin, and a TypeScript consumer deletes the declarations it kept of its own.

## Task 6: The plugin takes its types from the package

**Repository:** companygraph/obsidian-plugin

- [ ] Re-pin `companygraph-meta-model` to `v0.65.0`, delete `src/meta-model.d.ts`, and run its typecheck and suite.

## Task 7: The decision stands in CompanyGraph's model

**Repository:** companygraph/mental-model

- [ ] Commit `model/decisions/2026-types-from-jsdoc.md` with `status: Standing`, citing this spec once it is on `main`, and open its pull request.

## Task 8: The contribution is answered

- [ ] The owner closes #193 with thanks, a link to this spec and to the pull request that carries its types.
