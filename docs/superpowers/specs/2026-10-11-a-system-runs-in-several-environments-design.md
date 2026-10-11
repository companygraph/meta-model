# A system runs in several environments — design

> The landscape pack has the software and the node, `system` and `part-of`, and no way to say that the API in production, the API in test and the API on a laptop are copies of one thing. The practice separates the software from its running copies, in ArchiMate as an artifact on a node, in UML as an instance-level deployment, in C4 as a container instance in a deployment environment, and so does every company that runs the same code in more than one place. This design adds the copy to the pack as a field on `system`, `instance-of`, and the environment as a type of its own, `environment`, that a system names; adds `domain` to `service`; and records two answers that need no change: where operational details live, and that a holder need not be a master.

Status: proposed. Decided with the owner on 2026-10-11 against this repository at `8089733` (v0.92.0, core 0.67.0, landscape 0.67.0), from four questions Mischa Ramseyer asked after reading the pack to model beacon.build's platform, so that their agents look the landscape up instead of guessing which server, which database, which logs and what runs locally. The owner chose, from the practice surveyed in §2, that a running copy is a system and not a type of its own, because a copy has connections, a platform, an owner and an operator of its own, and every tool that answers for a system must answer for it the same way; and, the same day, that the environment is a type and not an enum, by the rule the system's kind was decided by: a kind that carries a definition and a fact a reader reads is a type, and a company names its environments in its own words.

---

## 1. The four questions

**The same software in several environments.** The API runs in production, in test and locally, and each copy reaches other databases, so one page per copy is the honest model: `beacon-api (production)` `part-of` its production platform, and so on. The pack cannot say that the three are the same software.

**Operational details.** Ports, start and stop commands, and where a copy's logs are read: whether these belong under `## References` or are the integration type the README leaves for later.

**A holder that is not the master.** Redis keeps only queue jobs, and the database masters the data; whether a `## Holds` row with `writes` or `reads` alone is right when the master stands on another system.

**A service per bounded context.** One `service` that bundles what a context offers outward, API routes, an SDK client, MCP tools, grouped by the context; a service knows `realizes` and `serves`, and `domain` sits on `system` only.

The first and the fourth ask for the pack to change. The second and the third are answered by the pack as it is, and §5 says how, so that the answer is written down once.

## 2. What the practice does

No standard has an element for an environment or an instance; each separates the software from its running copies and names the copy's environment beside it.

ArchiMate, in 3.2 and in 4, models the software as an Application Component, the deployable at a version as an Artifact that realizes it, and the place it runs as the Node the artifact is assigned to; environments are drawn as Nodes, Groupings or Locations, and the Implementation and Deployment viewpoint shows the artifact on its node. The pack dropped Artifact, as internal behavior nobody can name a user of, and left Location for later, which is exactly where the gap sits. UML 2 draws deployment at two levels: a specification-level diagram puts an artifact on a node type, an instance-level diagram puts a particular copy on a particular node, which is how development, staging and production are told apart, with a Deployment Specification for the parameters of one deployment. C4 defines a container once in the static model and places container instances on nested deployment nodes inside a deployment environment, Production, Staging, Development, one deployment view per environment; Structurizr's language names them `deploymentEnvironment`, `deploymentNode` and `containerInstance`. OpenTelemetry carries the same split at runtime as `deployment.environment.name` on every signal.

Three facts belong to the copy in every one of them: what it is a copy of, where it runs, and in which environment. A fourth, the version or the commit deployed, is what the artifact carries in ArchiMate and UML, and it is the one the family does not write on a page: a number that moves is not written down, and each of the family's own deployments pins the commit it serves in its own source file, where the pin is editorial, and says nothing about it on a page.

## 3. The shape

**A running copy is a `system`.** It has what a system has, its kind, its platform through `part-of`, its owner and operator, its connections, because a copy in production reaches other systems than a copy in test, and the chat, the pictures and the checks answer for it as for any system. Two optional fields say what makes it a copy.

`instance-of` (No, ref → system): the system this one is a running copy of, the H1 of another file in `systems/`, written on the copy; the software page names nothing. The field is one level deep: a page `instance-of` names leaves `instance-of` empty, so a copy is never a copy of a copy, and the chain never returns to a page already on it.

`environment` (No, ref → environment): where the system runs, in the path from a developer's machine to the customer, the H1 of a file in `environments/`. Written on a copy, and allowed on a system that has no `instance-of`, since a platform is in production too.

**An environment is a type.** `environment` is owned by nothing, so its files sit in the container, `model/environments/*.md`, beside `systems/` as `system-kinds/` does. Its frontmatter is `id`, `source`, `source-id` and `rank` (Yes, number): the environment's place on the path from a developer's machine to the customer, spaced in tens so one can be added without renumbering the others. Its sections are `# [Environment]`, the canonical name as the people who deploy to it say it, `Production`, `UAT`, `Northflank Test`; `> [Summary]`, one paragraph on what runs there and for whom; `## What it means` (Yes): what is deployed there, who may deploy to it, what data it holds, real customers' or synthetic, and which environments are not it; and `## References`, a table of `What` and `URL` for the console, the runbook or the pipeline that deploys to it. Its purpose: an environment answers "where does this copy stand, and what may it touch?" in the company's words, and carries once the order every drawing and every list of copies sorts by. An environment no system names is vocabulary nobody uses, and leaves, once the instance holds a system. Writing rules: `## What it means` says what data the environment holds and who may deploy, since that is what an agent asks before it acts; the H1 names the environment as its deployers say it, never its rank; the page writes names and prose in the model's language (R14). A field for the data an environment holds, real or synthetic, is left out: `## What it means` carries it as a sentence until an instance needs it as a fact with a check.

**Writing rules on the system page.**

- The software page carries what is the same wherever it runs: its kind, its owner, what it holds and the master's row among it, the services it provides and the features it realizes. A copy carries what differs where it runs: its platform, its operator, its environment and the connections it takes there. A copy repeats nothing the software page says.
- `## Holds` is the software page's. A copy writes no `## Holds` row, since the data it keeps is the software's, and a copy that claimed `master` beside the software's row would be refused by the one-master rule in any case.
- `## Connects to` on a copy names what that copy takes data from, by its canonical name: in production the production database, locally the one on the laptop. A connection the software takes everywhere is written on the software page once.
- The commit or version a copy runs is not written on the page. It moves, and the place that pins it, a deployment's own source file, is linked from `## References`.
- A copy's H1 names the software and its environment as the people who run it say it, `Beacon API (production)`, so the two are told apart in every list; the environment page is what the parenthesis resolves to.
- A database, a queue or a cache is a system too, and its copies follow the same pattern: `Billing database (production)` is `instance-of` `Billing database`, and a copy of the service connects to the copy of the database in its own environment.

**Checks.** `instance-of` is acyclic, as `part-of` is. A new rule, `flat`, holds a field naming an entity of the page's own type to one level: the entity named carries the field empty, and a page that names an entity carrying it is reported with both pages, `model/systems/beacon-api-test.md names "Beacon API (production)" in instance-of, which is itself instance-of "Beacon API"; a copy is a copy of the software, never of another copy (R16)`. `environment` is a reference, so a name no page resolves is R4's. Nothing holds a copy to an empty `## Holds`: the master rule refuses the one row that would mislead, and a `reads` row on a copy is harmless and the writing rule's to discourage.

**`domain` on a service** (No, ref → domain): the area of the company the service belongs to where it realizes no feature, the H1 of a file in `domains/`, in the words the system schema uses for its own. A service cannot name a bounded context, since R20 lets a pack name only core's types and its own, and `domain` is core; a context realizes domains in the software pack, so a service in a domain stands beside the context of that domain without the two packs naming each other. One writing rule: an API, an SDK client and a set of MCP tools that consumers call apart are three services provided by the same system, each named as its consumers call it, and a domain is what groups them, not one service that bundles them.

## 4. The mapping to ArchiMate 4

The README's table gains and changes rows.

| ArchiMate 4 | Here |
| --- | --- |
| Artifact assigned to a Node, realizing an Application Component | a `system` whose `instance-of` names the component's system and whose `part-of` names the node; a copy exports as an artifact assigned to its node and realizing the software's component |
| Grouping (Common Domain) of what runs in one environment | an `environment`, named by the page's H1, aggregating every system whose `environment` names it |
| Artifact that no node is assigned to, and Function | dropped: a file nobody deploys, and internal behavior nobody can name a user of |

The departures list gains one line: a running copy is a system, not an artifact, because a copy has connections, an operator and an owner of its own that an artifact does not carry, and the element comes back exact on export. The README's paragraph on what a system is gains the sentence that a system that runs in several environments is one page for the software and one per running copy, each `instance-of` the software and `part-of` its platform.

## 5. The two answers that need no change

**Operational details stay out of the page and go in `## References`.** A port, a start or stop command and where the logs are read are runbook facts that move, as a version does, and the schema already refuses what moves for that reason. The system schema's rule on cost, license count and version gains them, and says where they go: one `## References` row per thing an agent should open, the runbook, the log console, the repository whose README carries the commands. An agent reading a copy's page then finds where to look, which is what the question asks for, and nothing on the page goes stale. The integration type the README leaves for later is about a connection that needs an owner or a lifecycle of its own, and is not this.

**A holder need not be a master.** The check holds a concept to at most one `master` across the instance and requires none, so a `## Holds` row with `writes` or `reads` on one system and the `master` row on another is the form the pack intends. Where the queue jobs are a concept of their own that only Redis keeps, Redis is their master. The system schema's writing rule on `## Holds` says so in one sentence, since the question will be asked again.

## 6. Consumers

The parser reads the new type, the two fields and the service's `domain` from the schemas as it reads every type and field, and the server, the plugin and the sites take them with the release: `list_types` shows `environment`, `get_entity` returns the fields, `list_references` draws the edges `instance-of`, `environment` and `domain`, the plugin's completion offers the environments' names, and the server's `system` shape draws nothing new; its box could later carry the environment as a second stereotype, which is a change of its own. Drawing the copies of a software, or a landscape per environment, is a later shape of `diagram` and its own design. The example company gains no copy: its three systems run in one place each, and the fixtures of §7 hold the rules.

## 7. Tests

`verify/landscape.test.mjs`, against the pack's fixture: two environment pages in rank order, a software page and two copies, each `instance-of` it, `part-of` its own platform, naming its own `environment` and with its own `## Connects to`, pass; an environment no system names is reported as the kinds are; a copy `instance-of` another copy fails once naming both pages; `instance-of` running in a circle fails as `part-of` does; a copy whose `## Holds` row claims `master` beside the software's fails once under the existing rule; an `environment` no page resolves is R4's; a service with `domain` resolves and one naming no domain page is R4's. `verify/instance-checks.test.mjs` holds the new `flat` rule against the typed vocabulary. The pack's own documentation tests, where they read the schemas' field lists, take the new rows.

## 8. Files

`packs/landscape/environment-schema.md`, the new type; `packs/landscape/system-schema.md`, the two fields and the writing rules; `packs/landscape/service-schema.md`, `domain` and its rule; `packs/landscape/README.md`, the type's row, the paragraph, the mapping rows and the departure; `packs/landscape/manifest.json` and the pack's folder table the checks read, `environments`; `lib/checks.mjs`, `flat` beside `acyclic`, and the system's row taking both for `instance-of`; `verify/landscape.test.mjs`; `types/` by `npm run build`.

## 9. Release

A minor of the meta-model, carrying the landscape pack at its next minor: a type and two fields added are additive, and an instance that writes none of them changes nothing. The instances that take the pack re-vendor it at their next re-pin, on the owner's word, as every release goes. The partner's instance takes it when it exists.

## 10. Out of scope

A `deployment` type of its own, which would carry a system's tables again; the artifact as a page; Location, which is a place and not an environment, and stays for later; a field on `environment` for the data it holds; the version or commit of a copy on its page; ports, commands and log paths as fields; a picture of a software's copies per environment; a check that a copy's kind matches the software's.

## Decisions

Taken by the owner on 2026-10-11: a running copy is a system with `instance-of` and `environment`, not a type; the environment is a type, `environment`, not an enum, by the rule the system's kind was decided by; `domain` joins `service`; operational details go to `## References`; a holder without the master stays as the pack has it. The one-level rule on `instance-of`, the environment's `rank` and sections, and the writing rules above are the Specifier's, for the owner's review on the branch.
