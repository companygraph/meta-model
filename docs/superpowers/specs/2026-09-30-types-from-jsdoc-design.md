# The types are the JSDoc's

A TypeScript consumer of this package has had to write its own declarations of what it imports, and a copy kept by hand in another repository drifts from the code without a sound. The package's types are JSDoc in the JavaScript that runs, and the declarations a TypeScript consumer reads are generated from that JSDoc and committed. A consumer gets types that match the code and still installs and builds nothing, and the JavaScript in `lib/` and `bin/` stays the one source.

Status: decided by the owner on September 30, 2026: the JavaScript stays the source, its types are JSDoc, the declarations are generated into `types/` and committed, and pull request #193's route is not taken.

## Where this comes from

[Issue #192](https://github.com/companygraph/meta-model/issues/192) reports the drift. The Obsidian plugin, a TypeScript consumer, keeps its own declarations of what it imports from this package in `src/meta-model.d.ts`, and they had fallen behind: a graph's edges and types were `unknown[]`, and nothing said the graph names its core.

[Pull request #193](https://github.com/companygraph/meta-model/pull/193), an outside contribution, answers it by writing the code in TypeScript in `src/` and committing the JavaScript the compiler writes to `lib/` and `bin/`, with a `.d.mts` beside each module and a check that the committed JavaScript is what `src/` compiles to. It was verified to preserve behavior, and it gives consumers the types #192 asks for. What it costs is the reason this note exists: git carries two copies of the code, every line of `lib/` and `bin/` is rewritten once, so the history and blame of what runs start over, and two earlier specs' promise of zero dependencies and no install step is reversed. The contributor's goal stands; this note keeps it and takes a route that costs less of what the repository already has.

## The decision

The JavaScript stays the source. `lib/*.mjs` and `bin/*.mjs` carry their types as JSDoc — `@typedef`, `@param`, `@returns`, `@type` casts, `@overload` and `@import` — and the compiler reads them with `allowJs`, `checkJs`, `strict` and `exactOptionalPropertyTypes`, as `tsconfig.json` sets them. It emits declarations only: `npm run build` writes `types/lib/<name>.d.mts` and `types/bin/<name>.d.mts`, and they are committed, because a consumer takes the package from a tag and a tag carries only what git holds. `package.json` gives each subpath of `exports` a `types` condition pointing at `types/lib/<name>.d.mts`, and `files` ships `types/lib`.

**The JavaScript that runs does not change.** On this branch the syntax tree of every module is identical to `main`'s once comments are set aside, every existing comment is kept, and the only edits outside comments are the parentheses a JSDoc cast needs around its expression. The suite passes as on `main` — `verify`, every test script and `node --test verify/*.test.mjs` — and `companygraph --help` prints the same bytes.

The declarations say what the code does where #193's did not. `parseInstance` and `imagesOf` refuse to run without `schemas` (R16); #193 declared `schemas` optional, and here an `@overload` declares it required. The emitted JavaScript is not touched by that.

The consumer that reported the drift was tried against it. The Obsidian plugin, with the packed branch installed and its `src/meta-model.d.ts` deleted, passes its typecheck, with `skipLibCheck` off as well as on, and a probe confirmed the types are enforced.

`tools/build-check.mjs`, run as `npm run build:check`, compiles into a temporary folder and fails on a declaration in `types/` that differs from what the JSDoc declares, or that no module writes any more. It never writes over the committed files, because CI never writes what the repository commits. CI's `verify` and `windows` jobs run `npm ci` and then `npm run build:check` before their suites.

## What must stay true

Nothing a consumer installs or runs has a dependency. TypeScript and Node's types are devDependencies, pinned exactly with a lockfile; there is no runtime dependency and no `prepare` script, so a git install pulls neither and builds nothing. `instance-check.yml`, the workflow an instance calls, still installs nothing.

The JavaScript is the one copy of the code. A declaration in `types/` is written by the build and held to it by `build:check`, never edited by hand.

## What it amends

It amends `2026-09-02-instance-parser-design.md`, whose decisions stand where this note does not speak: its “CI here has no install step … That stays true” and its success criterion “This repository still has zero dependencies”. It amends `2026-09-10-instance-checks-design.md` the same way, where the checker needs no install “the same reason the CI here has no install step”. What changes is only this repository's own CI, which now installs the compiler to check the declarations. What those specs protected stays: nothing a consumer installs or runs has a dependency, and the workflow an instance calls installs nothing.

## What was left out

TypeScript source with the compiled JavaScript committed, #193's route. It gives the same types, at the cost of two copies of the code in git and a history of what runs that starts over.

Publishing to npm with a build at release. The family has no publish step; the tag is the release, as `WORKING.md` says. The types would then exist only in the published package, so every consumer would have to move from the tag to the registry to get them.

A `prepare` script that builds at install. Every consumer — the MCP server, the chat, the plugin and every `npx` run of the command — would install the compiler and build before anything ran.

Each consumer keeping its own declarations. That is the drift #192 reports.

## The known limit

The compiler, at the major `package.json` pins, prints a typedef's description as a loose comment block in the declaration, not attached to the type, so an editor's hover shows less than an interface's comment would. The types themselves are the same; only the prose beside them is harder to reach from an editor.
