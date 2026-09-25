# A KPI is defined, not measured

A company says what it measures in a spreadsheet, a dashboard or a slide, and the definition behind each number is written nowhere a reader or an agent can find it: what counts as a deployment, which failures count, whether down is good. Core gains a type `kpi`: one file per key performance indicator, holding its stable definition, the seat accountable for it, the process it measures and the indicators it has to be read beside. Targets and measured values stay out of the model, where the numbers that move belong, and a reference row says where they are kept. The first KPIs are the five software delivery metrics DORA defines, seeded in all three instances.

Status: decided by the owner on September 25, 2026, one question at a time. The KPI file is the definition alone, with neither a target nor a measured value, as ISO 22400-2 and DORA define a metric, rather than a target in the file or both. Ownership is frontmatter references, as a process has them, rather than a table of owner, governance and consumer seats; the governance and consumer seats are left out until an instance has a second seat that needs them. The DORA set is the current five under the names dora.dev uses today, not the classic four. A KPI is a file owned by nothing, rather than owned by the process it measures or a table on that process. All three instances carry the five.

## Where this comes from

The multi-person instance this meta-model was extracted from keeps a thin KPI file per indicator: a category, a unit and a direction, a table of owner, governance and consumer seats, and a link to the sheet that holds the targets. The shape held up; the free-text seat names and the category did not carry over, because this meta-model has a `role` type to reference and a process to name.

What the file should hold was checked against published templates. ISO 22400-2:2014 describes a KPI by name, description, scope, formula, unit, range and trend, its word for the direction of improvement, and gives it no target and no owner. Bernard Marr's template and the KPI Institute's documentation form both add a data source, an owner, targets and thresholds, and Marr adds the unintended consequences of the indicator and how it will not be used. The Balanced Scorecard keeps a measure and its target as separate elements. DORA defines its metrics with no target at all and warns against setting a metric as a goal, which is Goodhart's law: a measure that becomes a target stops measuring. Two things follow for the schema. The definition is what stays still, so it is what the model holds. And an indicator read alone can be moved without moving what it stands for, so the file says how, and names what it is read beside.

## The type

`kpi` is owned by nothing, so its files sit in the container, `model/kpis/*.md`, as a strategic objective's do. A KPI may name the process it measures, but many measure no process — revenue, an adoption rate — and would otherwise have to invent an owner.

```markdown
# KPI Schema

> Required structure for KPI files.

## File Location

`model/kpis/*.md`

One file per key performance indicator. Nothing owns a KPI and a KPI owns nothing, as with `strategic-objective`: it may name the process it measures, and many measure none.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for improving it, the H1 of a file in `roles/` |
| `measures` | No | ref → process | The process whose performance it measures, the H1 of a process file. Absent where it measures none. |
| `serves` | No | array of ref → strategic-objective | The objectives it indicates progress toward, the H1 of a file in `strategic-objectives/` |
| `unit` | Yes | string | What one value is counted in, with its period where it has one: `hours`, `deployments per week`, `percent of deployments` |
| `direction` | Yes | enum | `lower`, `higher` or `target`. Which way is better: down, up, or toward a band, where too high and too low are both worse. |
| `read-with` | No | array of ref → kpi | The KPIs it is read beside, because each can be moved alone at the other's cost — the H1 of a file in `kpis/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [KPI]` | Yes | The canonical name of the quantity. Everything references the KPI by this exact string. |
| `> [Definition]` | Yes | One sentence of what it measures |
| `## How it is measured` | Yes | The calculation, what counts as the event it counts, the window it is taken over, and where the data comes from |
| `## What it can hide` | Yes | How it can move while what it stands for does not, and what reading it beside `read-with` catches |
| `## References` | No | Table. Where the definition comes from, and where its targets and values are kept; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard's definition, a dashboard, a sheet of targets |
| `URL` | Yes | string | Where it is |
```

Purpose, as the schema will say it: a KPI is a quantity the company has chosen to watch, defined once so that everyone who reads the number means the same thing by it. It answers "what exactly does this number count, who answers for it, and what could make it lie?" for someone reading a value, setting a target or deciding whether to trust either. It is not the value and not the target, which move and are kept where the References row points, and it is not a strategy's `## What would show it is working`, which says what to watch for one route; a KPI is watched whichever route is taken.

Writing rules:

- No target, threshold, baseline or measured value, ever. Each moves, and a number that moves goes stale in the model without a sound; a References row says where they are kept.
- Named for the quantity, not for the dashboard or tool that shows it: `Change Lead Time`, not `the lead-time chart`.
- Person-neutral, as a role is: the definition names seats and never who holds them.
- `## How it is measured` says what counts as the event in this company's terms — what a deployment is here, what a failure is — concretely enough that two people counting would get the same number. A definition that leaves the event open lets every reader count a different thing under one name.
- `## What it can hide` names a specific way the number improves while the work does not. "It can be misread" hides nothing a reader can check.
- `read-with` names a KPI that moves against this one when this one is gamed, not every KPI of the same process.
- `direction: target` is written only where both too high and too low are worse; an indicator that is better lower down to some floor is `lower`.
- `unit` names the period wherever the value is a rate: `deployments per week`, not `count`.
- `serves` names an objective only where the KPI moving would actually tell whether that objective holds. A KPI that indicates no objective has none, and is still a KPI the company watches.
- A KPI that nothing measures yet is a valid definition. It carries no References row for values until one exists, and it gains no invented one.
- Names and prose are American English (R14).

`## What it can hide` is required, because the research agrees on little beyond this: an indicator read alone gets moved alone. A KPI file with no answer to it is a definition that has not been thought about as a target, and every KPI becomes one the day someone sets it.

## What was left out

Governance and consumer seats: the source instance names one seat that sets targets and others that watch, and in every instance here the same seat would fill all three. They return as optional fields when an instance has a second seat to name.

Category: `measures` and `serves` already group KPIs, by the process and by the objective, and a free label beside them would be a third grouping stated independently of the other two.

Cadence, how often it is measured: nothing measures these yet, so a cadence would be a claim nothing shows. It is added when an instance measures one on a schedule.

Targets, thresholds and baselines: kept where the values are, for the reason the first writing rule gives.

## The tooling

Every field is written in vocabulary that exists — `ref`, `array of ref`, `enum`, `string` and a What and URL table — so the parser, the checker's rules, the Obsidian plugin, the MCP server and the chat read the type from its schema and need no source change; the plugin still adopts it, as its own section says. `array of ref → kpi` is a type referencing its own, as a phase's `gate-to` does.

The one list that names the types is `TYPES` in `lib/checks.mjs`, which states each type's folder rather than deriving it; it gains `{ type: "kpi", folder: "kpis", noun: "KPI" }`. The noun is new: `init` writes each folder's README from the folder's name, which would head this one "Kpis" and call its files "kpi", and an abbreviation is spelled the way it is read. A row without a noun reads as today. A search of the plugin, mcp-server, chat-server and design for type names found no other list: the site renderers select the few types they draw a page for, and none draws a KPI.

`core/kpi-schema.md` is new and `core/manifest.json` moves by a minor. `verify/` gains a test with one fixture per failure the type can make — a `direction` outside its three tokens, a missing `owner`, a `read-with` naming no KPI, a missing `## What it can hide` — and one clean instance. `verify/check.mjs` holds the new schema to the fixed shape as it holds the others.

The example instance under `example/` gains two KPIs of its Delivery process, owned by the seat that owns it, each naming the other in `read-with`, so the instance checks exercise the self-reference on a real tree as well as on the fixtures.

## The Obsidian plugin

The plugin is where a KPI is written, so it adopts the type rather than only waiting for it. It takes its types and their folders from the package's `TYPES` and every enum's values from the schema, so re-pinning `companygraph-meta-model` to this release is what makes New entity offer `kpi` and create it in `kpis/`, completion offer `lower`, `higher` and `target` for `direction`, the roles for `owner`, the processes for `measures` and the KPIs for `read-with`, and the references pane list a KPI under its owner, its process and each KPI it is read with. No source change is expected; if the re-pin shows one is needed, it is made in the plugin's own plan.

What the re-pin has to prove is proved in the e2e suite, driven over the DevTools protocol against a scratch vault of the reference instance at a pinned commit, whose own core is what the plugin reads: New entity creates a KPI with its required sections, `direction` completes to its three tokens and marks a fourth as outside them, `read-with` completes to the vault's KPIs, and a `read-with` naming a KPI that does not exist is marked. The README gains a paragraph on the type, as it has for a question. So the reference instance upgrades and is seeded first, and the plugin's fixture moves to that commit. The plugin takes a minor release, and its plan is written in its own repository once this release is tagged, because it builds on the package; the release is installed in the vault through the CLI's `obsidian` command.

## The instances

Each instance upgrades its core and seeds the five in the same pull request: Change Lead Time, Deployment Frequency, Failed Deployment Recovery Time, Change Fail Rate and Deployment Rework Rate. Each names `owner: Owner` and `measures: Delivery`, and carries a References row to its definition on dora.dev.

- The definitions follow dora.dev's wording today. Failed deployment recovery time replaced mean time to recovery in 2023 and counts only recovery from a failure a deployment caused; deployment rework rate was added in 2024. The names are the ones dora.dev uses, with the H1 in title case.
- `read-with` pairs throughput with instability, as DORA does: Deployment Frequency and Change Lead Time are read with Change Fail Rate, Failed Deployment Recovery Time with Change Fail Rate, and the two instability metrics with Deployment Frequency.
- `serves` is absent. No objective in any of the three instances is about delivery speed, and a citation that would not really hold is the kind the writing rules forbid.
- `## How it is measured` is written for each instance, because what reaches production differs: a merge to `main` that a site publishes, a re-pin that deploys a host. The five files are alike across the instances and not copies.
- No References row for values, because nothing measures them yet.

Each pull request passes the instance checks with the new core.

## Out of scope

A page on any site that draws the KPIs; a chat index of them; governance and consumer seats; targets, values, cadence and category; measuring the five. Each is a change of its own once something asks for it.

## What it costs

A release of meta-model that every consumer re-pins, as any new type asks, though no consumer's code changes. The order is meta-model's release; then the reference instance upgrades its core and is seeded, because the plugin's e2e vault is that instance; then the plugin re-pins, proves the type in its e2e suite and is released; then the other two instances upgrade and are seeded, written with it; then the sites and the MCP hosts re-pin to the seeded commits as they do for any model change. companygraph.io's `/model/` page lists the core vocabulary term by term and gains a `kpi` row in that re-pin.

Verification at the end is the instance checks green on all three instances with the five seeded, and `get_entity` on one KPI from each MCP host returning its `owner`, `measures` and `read-with` edges.
