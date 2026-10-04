# CompanyGraph — the software pack

> Vocabulary for a company that builds software: how it designs what it builds, in the words of domain-driven design. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack software`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `bounded-context` | The boundary within which one model and one language hold | nothing |
| `concept-design` | A term of a context's language, an entity or a value object | its bounded context |
| `aggregate` | A cluster of concept designs kept consistent as one unit | its bounded context |
| `domain-event` | Something that happened that other parts of the domain care about | its bounded context |
| `feature-design` | How a feature is built across the contexts it touches | nothing |

## Sources

| What | URL |
| --- | --- |
| Eric Evans, Domain-Driven Design Reference | https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf |
| Vaughn Vernon, Domain-Driven Design Distilled | https://www.oreilly.com/library/view/domain-driven-design-distilled/9780134434964/ |
| DDD Crew, Bounded Context Canvas | https://github.com/ddd-crew/bounded-context-canvas |
| DDD Crew, Aggregate Design Canvas | https://github.com/ddd-crew/aggregate-design-canvas |
| DDD Crew, Context Mapping | https://github.com/ddd-crew/context-mapping |
| Daniel Jackson, The Essence of Software | https://essenceofsoftware.com/ |
| Cucumber, Gherkin reference | https://cucumber.io/docs/gherkin/reference/ |

## Where it departs from its sources

- The strategic classification sits on the bounded context, as the Bounded Context Canvas puts it, and not on the subdomain as Evans does, so core's `domain` stays untouched.
- A domain event is a type and a command a row, because other contexts name an event and nothing outside its aggregate names a command.
- An architecture decision is core's `decision`, which the pack's types name; there is no type of its own.
- An attribute's or a payload value's type is written in one of two columns, `Term` for a term of the context and `Type` for a plain type from a closed list, because a term is a reference and a plain type names nothing.

## Left for later

Services, repositories, factories and modules; C4's system, container and component; a type for a relationship between contexts; commands as a type; a subdomain type; a `level` field. Read models and policies as types, from Event Modeling: a policy is the `Reaction` on a Consumes row, and a read model waits for an instance that writes one.
