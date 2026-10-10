# CompanyGraph — the landscape pack

> Vocabulary for a company that runs systems: the applications it buys and builds, the devices they run on and in, the platforms under them and the networks between them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack landscape`. Every edge from these types to core's is optional, and no core type names it (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `system` | What IT buys, builds, runs and retires, whatever it is made of: an application, a device, a platform or a network, told apart by its kind, whose `element` names the ArchiMate element it is | nothing |
| `system-kind` | What sort of system a company has, in its own words, and which ArchiMate element a system of that kind is | nothing |
| `data-object` | Data a system keeps, realizing the concept it stands for | nothing |
| `service` | What a system exposes to others, realizing the feature the business sees, provided by the systems that expose it | nothing |

A system names its kind, a page in the company's words that carries the ArchiMate element once. A system realizes the features of the products staff and customers open, serves a process where no feature names it yet, runs on or in another system through `part-of`, is owned by one seat and run by another, and names the data processor behind it where it handles personal data. It takes data over the rows of its `## Connects to`, written on the side that takes it with the interface's name in `As`, and keeps concepts in `## Holds`, one system holding each concept as `master`.

A system holds data objects through the `Data object` qualifier of its `## Holds` rows and calls services through the `Service` qualifier of its `## Connects to` rows; each join is held by the checker.

## Sources

| What | URL |
| --- | --- |
| The Open Group, ArchiMate 4 Specification | https://pubs.opengroup.org/architecture/archimate4-doc/ |
| The Open Group, ArchiMate Model Exchange File Format | https://www.opengroup.org/xsd/archimate/ |
| LeanIX, Application lifecycle | https://docs-eam.leanix.net/ |

## Mapping to ArchiMate 4

The contract a generator reads in either direction: from an architecture tool's export into pages, with the element's GUID as `source-id`, and from pages back into the exchange format. What never comes back is exactly what this table says is dropped. The element is exact in both directions; the kind travels as a specialization where the tool carries one, and two kinds sharing an element are told apart only there.

| ArchiMate 4 | Here |
| --- | --- |
| Application Component, Node, System Software, Device, Equipment, Communication Network (chapters 9 and 10) | a `system` whose kind's `element` names the one it is; system software is `part-of` its node |
| A specialization of one of those, a profile (§14.2) | a `system-kind`: its name the profile's, its `element` the element specialized; where a tool carries no profile, a kind comes back as its element alone |
| ApplicationInterface, TechnologyInterface | the `As` of a `## Connects to` row |
| Service (Common Domain) aggregated by a Product, and Capability | core `feature` |
| Service, realized by a system and aggregated by no Product | `service`, realizing the feature the business sees where there is one |
| Business Object | core `concept` |
| Data Object | `data-object`, realizing its business object |
| Process | core `process` |
| Role | core `seat`: the responsibility, held by whoever holds it; a role assigned to an application component is a seat held by an agent |
| Business Actor | an Individual is a core `profile`, an Organizational Unit the organization pack's `group`, the Organization core `identity` (the three example specializations of §14.2.2) |
| Realization, system to service | the service's `provided-by`; `realizes` on the system where no service is modeled |
| Realization, service to business service; Serving, service to process | the service's `realizes` and `serves` |
| Assignment, interface to service | the `As` and the `Service` of one `## Connects to` row |
| Serving, service to system | a `## Connects to` row on the served system, the service in `Service`; a row with a service exports as this and the interface's assignment, a row without one as Flow |
| Serving, system to process | `serves` |
| Serving or Realization, node or system software to application | `part-of`: the application is part of what it runs on |
| Serving, application to application | a `## Connects to` row on the served side |
| Composition, Aggregation, Assignment between systems | `part-of`, inverse derived |
| Flow between systems | a `## Connects to` row |
| Triggering between systems | a `## Connects to` row; it comes back as Flow |
| Access, with its mode | a `## Holds` row, `Access` as `writes` or `reads`, the leading writer `master`, the data object as the row's qualifier |
| Realization, data object to business object | the data object's `realizes` |
| Data Object realizing no Business Object, and Access to it | dropped: data whose meaning nobody can name |
| Access with no mode | a `## Holds` row, `Access` as `reads` |
| Function (Common Domain), Artifact | dropped: internal behavior nobody can name a user of |
| Location | not yet; see below |
| Collaboration (Common Domain), Path, Facility, Distribution Network | not yet; a collaboration is several systems working together, with Location and the physical elements |
| Association, untyped | dropped: an edge that says nothing |
| Views | not held; a consumer draws the graph |

## Where it departs from its sources

- One type where ArchiMate has six internal active structure elements across its Application and Technology Domains, and two interfaces that become rows; the kind's `element` names which of the six a system is, so the element is exact on the way back, and the kind where the tool carries a profile.
- Triggering comes back as Flow: a connection row says what is carried and how, not whether it starts something.
- An interface is a row, not an element. Its name survives in `As`; its own composition into components and its appearance in views do not.
- Behavior nobody uses is dropped: functions and artifacts have no page, because core's rule that a thing nobody can name a user of is not a feature is applied once more one level down.
- Capabilities and business services are not pack types; they are features of the products staff open; an application or technology service is, as `service`, and realizes them.
- Access is three tokens, not four: ArchiMate's `readwrite` is `writes`, since a writer reads, and `master` is a claim ArchiMate does not make.
- Lifecycle has four stages where LeanIX has five; its phase-in and active are one `active`, since the model says what is, not when it will be.
- Criticality is three tokens where LeanIX names four by business impact.
- A kind is a profile and takes no shape of its own: ArchiMate 4 lets a specialization define a notation (§14.2); the pack leaves that to a drawing, which shows the element's notation and the kind as its stereotype, so a generic editor needs the standard's shapes and nothing per kind.

## Left for later

Location, as a third type of this pack, for the first instance that writes one; an integration type, for an instance whose integrations need an owner, a lifecycle or references of their own; functions; license and cost; a collaboration, ArchiMate 4's element for several systems working together; a notation on the kind; an artifact realizing a data object; a field list on a data object; a generator from an architecture tool's export, which is an instance's own.
