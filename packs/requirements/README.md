# CompanyGraph — the requirements pack

> Vocabulary for a company that says what its products must do before it builds them: the goals people bring to a system, and the statements a product is held to. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack requirements`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `use-case` | All the ways of using a system to achieve one goal for one actor, fully dressed: its stakeholders and their interests, its steps and extensions, and what is guaranteed | nothing |
| `requirement` | One statement a product is held to, functional, quality or constraint, with the measure that shows it met | nothing |
| `requirement-realization` | One level of how far a requirement is realized, in the instance's own scale, with the evidence a requirement at it must show | nothing |
| `use-case-realization` | One level of how far a use case is realized, in the instance's own scale, with the evidence a use case at it must show | nothing |

A use case names the features it asks something of and the subordinate use cases its steps call; its primary actor, its stakeholders and the actor of each step are seats where the company has them and names otherwise. A requirement applies to features, products or use cases, and names the company rules it carries into the product. The software pack's feature design refines the same features, so a company taking both packs reads the trace from a use case and its requirements, through the feature, to the designs that build it, and neither pack names the other.

A requirement and a use case may name the level they have reached in `realization`, say in `## Realization` what is realized and what is missing, and list in `## Evidence` what shows it, each row a permalink at a commit that satisfies or verifies. Realization is how far a build realizes the requirement or use case against its fit criterion or its scenario, held to its evidence. It isn't a status, and how far the specification answers a requirement is derived from the decisions and questions that name it. An instance defines its levels, one file each; one that defines none writes neither field nor section.

Which to write: a use case where the question is what someone wants from the system and what must hold when they get it or do not; a requirement where it is one statement a product can be shown to meet or to miss, with the measure that shows it; and the software pack's feature design where it is how a feature is built, the terms and events it reads and writes. The first two say what is wanted and are written before the design; the third says how and is written after them.

## Sources

| What | URL |
| --- | --- |
| Alistair Cockburn and Ivar Jacobson, Use-Case Foundation | https://alistaircockburn.com/Use%20Case%20Foundation.pdf |
| Alistair Cockburn, Basic use case template | https://www.cs.otago.ac.nz/coursework/cosc461/uctempla.htm |
| Alistair Cockburn, Structuring use cases with goals | https://cs.otago.ac.nz/coursework/cosc461/usecases.htm |
| OMG, UML 2.5.1, clause 18 | https://www.omg.org/spec/UML/2.5.1/PDF |
| Ivar Jacobson, Ian Spence and Kurt Bittner, Use-Case 2.0 | https://www.ivarjacobson.com/publications/white-papers/use-case-20-e-book |
| ISO/IEC/IEEE 29148:2018 | https://www.iso.org/standard/72089.html |
| IREB, CPRE glossary | https://cockpit-v1.ireb.org/media/pages/downloads/cpre-glossary/510f672cfd-1760005471/ireb_cpre_glossary_en_2.2.pdf |
| Volere, requirement snow card | https://www.volere.org/wp-content/uploads/2018/12/snowcard.pdf |
| RFC 2119, key words for requirement levels | https://www.rfc-editor.org/rfc/rfc2119 |
| ArchiMate 3, realization relationship | https://pubs.opengroup.org/architecture/archimate30-doc/chap05.html |
| SysML 1.7, clause 16, requirement relationships | https://en.wikipedia.org/wiki/Requirement_diagram |
| OpenUP, requirement attributes | https://www.ida.liu.se/~TDDC88/openup/core.tech.common.extend_supp/guidances/concepts/requirement_attributes_4AC73153.html |
| NASA, technology readiness level definitions | https://www.nasa.gov/wp-content/uploads/2017/12/458490main_trl_definitions.pdf |
| GitHub spec-kit, specification template | https://github.com/github/spec-kit/blob/main/templates/spec-template.md |

## Where it departs from its sources

- A requirement's modality is RFC 2119's `must`, `should` and `may`, not core's rule's `must`, `must not` and `may`: a requirement has a should, and must not is a negated must written in the statement.
- Cockburn's minimal and success guarantees are two bulleted sections under his own two headings, not one table with a kind column.
- Design scope drops Cockburn's black-box and white-box split; the steps show how much of the inside a scenario reaches.
- Goal levels are Cockburn's words, not his icons, and his fifth level, too low, is left out, since his advice for a goal that low is not to write it.
- A step's actor resolves, and the subordinate use case it calls is drawn from `includes` and named in the step's Action, where Cockburn underlines the step.
- A requirement carries no priority, customer satisfaction, conflicts or history, which Volere's card does; each moves or judges one requirement against another.
- A measurable success criterion of the spec-kit kind is a requirement, of kind `quality` where it measures a quality, with its measure as the fit criterion.
- SysML draws satisfy and verify as relationships from a design element or a test case to the requirement; here they are a column on a row of the requirement's own page, because the code and the tests are outside the model and have no page to draw from.
- Practice keeps implementation status and verification status as two attributes; here they are one ordered level whose evidence decides which it is.
- OpenUP's status is a degree of completeness with fixed values; here the values are the instance's own.

## Left for later

Cockburn's technology and data variations; secondary actors as a field; extend as a relation between use cases; user stories and use-case slices as types, which are backlog items and move; goals in KAOS's or iStar's sense; a stakeholder type beyond the seat; SysML's derive; a requirement's originator.
