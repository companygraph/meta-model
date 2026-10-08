# A role is a seat

Core's `role` has always been a seat. Its schema calls it "a seat the company needs filled", every core schema that references it says "the seat", a process names one per phase, and the family's commits are authored by the seat that did the work. The word on the type is the one thing that says otherwise, and the organization pack showed what that costs: the standards it draws on use "role" and "job" for what a person is employed as, and the pack had to explain three times that core's role is neither. This spec renames the type to `seat` everywhere core declares it, carries every instance across with `upgrade`, and renames the sites' Team page to Processes, which is what that page draws: the seats each process names. A Team page returns later, drawn from the organization pack's groups.

Status: decided by the owner on October 8, 2026: no declaration of `role` remains in what core and the packs declare, the type, its folder and schema, the profile's field, every `ref → role`, the `Type` token, and experience's string field, which becomes `capacity`; instance content that happens to use the word, such as an experience kind named Role, and the conventions' prose about the roles that make a text, are not declarations and stay; `upgrade` migrates an instance's content, as it migrated the localization page before; the Team page becomes Processes at `/processes/`, plural as the model's own folder is, and stands after Principles in the navigation; `/team/` is removed rather than redirected, and the one link to it, in the blust.ch talk, moves to `/processes/` in the same change.

## What core declares after it

| Before | After |
| --- | --- |
| type `role`, schema `core/role-schema.md`, folder `model/roles/` | type `seat`, schema `core/seat-schema.md`, folder `model/seats/` |
| profile field `roles: array of ref → role` | profile field `seats: array of ref → seat` |
| `ref → role` in `process`, `phase`, `kpi`, `risk`, `decision`, `control` | `ref → seat`, the same fields under the same names |
| `role` as a value of the `Type` column in `rule`'s and `control`'s `## Applies to` | `seat` |
| experience field `role: string`, "the part the subject played" | experience field `capacity: string`, the same meaning |
| organization pack, job field `seats: array of ref → role` | `seats: array of ref → seat` |

The schema keeps its id (R18), so a consumer that holds the schema by id follows it. Every entity keeps its id and its H1, so every reference keeps its value: a phase's `owner: Reviewer` still names the Reviewer seat, now in `seats/`. Only a field whose key was `roles` or `role` changes its key, and only a `Type` cell holding `role` changes its value. Descriptions that say "the H1 of a file in `roles/`" say `seats/`, and the seat schema's own prose drops the word role. A schema that used "role" in its ordinary English sense, a brand's color role or a concept's `As` column ("the role the target plays"), keeps it, since it declares nothing.

`capacity` covers what the field holds today: job titles, Lead Architect or Trainee, and parts that are no job, Speaker, Author or Board member. It is a string, and stays one: a capacity at another company names nothing in this model.

## What the code says

`TYPES` in `lib/checks.mjs` names `seat` at `seats`; the profile's `claims` reads `seats`; the judge's seat check in `lib/known.mjs` reads a profile's `seats` and resolves a `seat`. The parser's join kind for R16's `As` rule, published in its constraints as `kind: "roles"`, is renamed `kind: "as"`, after the column it is about; it has nothing to do with seats, but a consumer reading the old string would otherwise carry the word on, and the MCP server reads it. Agent skills shipped under `agents/` that tell an agent to read `model/roles/` or fill `roles:` say `seats`, and the validate skill's gap line names a seat.

## How an instance gets across

`companygraph upgrade` to the release that carries the rename migrates an instance's content before it moves the vendored core, as the localization migration does:

1. `model/roles/` moves to `model/seats/`, every page with its id, and the folder's README is rewritten for the new type.
2. In every page of type `profile`, the frontmatter key `roles:` becomes `seats:`, its values untouched.
3. In every page of type `experience`, the key `role:` becomes `capacity:`.
4. In every `## Applies to` table, and any other table whose `Type` column holds a type's name, a cell holding `role` becomes `seat`.

`upgrade` refuses and writes nothing where the migration cannot be clean: `model/seats/` already exists, or a page carries both keys. It reports what it moved and rewrote, file by file, so the commit that records the upgrade can be read. An instance not yet upgraded is checked against the core it vendored and passes as before; the checker of the new release refuses it by its pin, as for any release.

Each of the three instances holds a dozen or more seats, the profiles that hold them, several hundred references to seats and dozens of `Type` cells holding `role`, and robertblust's holds most of its experiences with a `role:` key: enough that a migration by hand would be its own source of faults. The release is proved by upgrading a clone of each at its main commit and running `check`.

## The Team page becomes Processes

The page every site draws from its instance's processes, one board per process and the seats in it, is renamed Processes. It moves from `/team/` to `/processes/`, and `/team/` answers 404 until the organization pack's Team page takes the address. In robertblust/design, the renderer `render/team` becomes `render/processes`, its markers, block CSS, fence and version name follow, the attribute `data-role` on a seat becomes `data-seat`, and the shared nav order names Processes directly after Principles, where it named Team before Principles. Each site's page, sitemap entry, canonical and share card move with it, and the blust.ch talk "Deciding well" links to `/processes/`. Its German label is made by the translator from the reviewed English and settled in `GLOSSARY.md`, where a row for the noun is added beside the existing one for the verb.

## The order it ships in

1. meta-model: the rename, the migration, the example and the skills, released as 0.87.0 with core 0.63.0. By the family's practice a release that breaks every instance in 0.x is the next minor, as 0.69.0 was for the localization page; the notes say it breaks every instance and that `upgrade` carries it.
2. robertblust/design: `render/processes`, `data-seat` and the nav order, released with a minor.
3. companygraph/mcp-server and companygraph/obsidian-plugin: their tests and fixtures, which name the type, the folder and the field, and the MCP server's interface document; released after meta-model.
4. The family resync moves the instances, which `upgrade` migrates, the sites, which move to `/processes/` and regenerate their artifacts, and the MCP deployments, which re-pin. The owner starts it.

robertblust/conventions needs no code change: its seat check reads a commit's author, not the folder. A glossary row for the German page label rides with the sites' change.

## What was left out

A Team page drawn from the organization pack's groups, which is its own change once an instance writes groups. Moving to 1.0.0, a statement about stability that is its own decision. Renaming the word where it is not a declaration: an experience kind an instance named Role, a brand's color role, and the conventions' writer, translator, editor and back-reader, which they call the roles that make a text. A redirect from `/team/`.

## What it costs

One release that breaks every instance, carried by one `upgrade` per instance; a migration in `upgrade` with tests that break it; the renames in core, the pack, the code, the example and the skills; and a wave through design, the three sites, the MCP server and the Obsidian plugin, each with its own pull request, before the resync.
