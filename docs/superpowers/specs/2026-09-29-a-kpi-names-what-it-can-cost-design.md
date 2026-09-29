# A KPI names what it can cost

A KPI already guards its number against other numbers: `read-with` names the KPI that moves the other way when this one is gamed, and `## What it can hide` names how the number improves while the work does not. Nothing links it to what the company holds that is not a number. A critique of the published schemas said so on September 29, 2026: the definitions are precise about the mechanics and leave the values a push on the number can wear down to prose. Now that agents write and work in automated runs, an agent asked to move a number reads what the model links to it, and a value it can only find by reading every page's prose is one it will miss. A KPI gains an optional field, `can-cost`, naming the values that pushing it can wear down.

Status: decided by the owner on September 29, 2026: the field, its name, that it is optional, that it names values only, and that the instances fill it entry by entry after the release.

## Where this comes from

robertblust/mental-model holds the value "Decide well over build fast" and the KPIs Deployment Frequency and Change Lead Time. Each KPI's `## What it can hide` already says how a push wears the value down: Deployment Frequency "rises when … something ships that did not need to" and "A rise bought with rushed changes", Change Lead Time "shortens when … review gets thinner". The model cannot say which value that is, so a reader or an agent looking at the value sees no number that threatens it, and one looking at the number sees no value it threatens. That instance is the company nobody could describe without the field, and it is written against it first.

## The field

`core/kpi-schema.md` gains one row in `## Frontmatter`, after `read-with`:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `can-cost` | No | array of ref → value | The values that pushing this number can wear down, each the H1 of a file in `values/` |

It is an array of references, so each name draws an edge and resolves under R16 as `serves` and `read-with` do. It is optional because most KPIs cost no value a company has written down, and a KPI that costs none has no field rather than an invented entry.

Writing rules the schema gains:

- `can-cost` names a value only where `## What it can hide` says how pushing the number wears it down. The field is the edge; the section is the reason, and a name with no reason under it is a claim nothing backs.
- A value any KPI could cost tells a reader nothing, and is not named.

The Purpose paragraph is left as it is.

## What was left out

A reference to a brand trait from `## What it can hide`, the critique's second suggestion. The brand holds how a company looks and sounds, not what it stands for; what a push on a number wears down is a value, and a value is where the model already says what the company holds to.

A required field. Most KPIs cost no written value, and a required field would be filled to pass.

A `risk` type, or a link to one. Risks, controls, incidents and measures are one piece of vocabulary the owner has kept for later, and this field does not start it.

## The tooling

Nothing in `lib/` names `read-with` or `serves` for a KPI; the parser, the checks, the MCP server and the Obsidian plugin read the field from the schema. The edge appears in `describe_relations`, in `get_entity` on both ends and in the plugin's reference completion without a code change, and the release is checked for that rather than assumed.

`example/` gains the field where its own prose already says how: Change Lead Time, whose `## What it can hide` says it "shortens when … review gets thinner", names Craftsmanship.

## The instances

Each instance takes the release with a re-pin, which re-vendors the KPI schema; no page has to change. The field is then filled entry by entry, each shown to the owner before it is written: in robertblust/mental-model, Deployment Frequency and Change Lead Time naming "Decide well over build fast" is the first proposal. companygraph and guestgraph are read for a case, and gain none where their KPIs' prose names no value.

## Out of scope

A view of a value listing every KPI that can cost it. The edge makes one possible; building one is for a surface to decide.

## What it costs

Core moves a minor, 0.47.0 to 0.48.0, because a type gains an optional field and no page loses anything; the package moves a minor with it. Three instance re-pins follow, then the entries.
