# CompanyGraph — the landscape pack

> Vocabulary for a company that runs systems: the applications it buys and builds, the devices they run on and in, the platforms under them and the networks between them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack landscape`. Every edge from this type to core's is optional, and no core type names it (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `system` | What IT buys, builds, runs and retires, whatever it is made of: an application, a device, a platform or a network, told apart by its `kind` | nothing |

A system realizes the features of the products staff and customers open, serves a process where no feature names it yet, runs on or in another system through `part-of`, is owned by one seat and run by another, and names the data processor behind it where it handles personal data. It takes data over the rows of its `## Connects to`, written on the side that takes it with the interface's name in `As`, and keeps concepts in `## Holds`, one system holding each concept as `master`.

## Sources

| What | URL |
| --- | --- |
| The Open Group, ArchiMate 3.2 Specification | https://pubs.opengroup.org/architecture/archimate32-doc/ |
| The Open Group, ArchiMate Model Exchange File Format | https://www.opengroup.org/xsd/archimate/ |
| LeanIX, Application lifecycle | https://docs-eam.leanix.net/ |

## Mapping to ArchiMate 3.2

The contract a generator reads in either direction: from an architecture tool's export into pages, with the element's GUID as `source-id`, and from pages back into the exchange format. What never comes back is exactly what this table says is dropped.

| ArchiMate 3.2 | Here |
| --- | --- |
| ApplicationComponent, ApplicationCollaboration | `system`, kind `application` |
| Node, SystemSoftware | `system`, kind `platform`; system software is `part-of` its node |
| Device, Equipment | `system`, kind `device` |
| CommunicationNetwork | `system`, kind `network` |
| ApplicationInterface, TechnologyInterface | the `As` of a `## Connects to` row |
| ApplicationService, BusinessService, Capability | core `feature`, where somebody uses it |
| DataObject, BusinessObject | core `concept` |
| BusinessProcess, BusinessRole, BusinessActor | core `process`, `seat`, `profile` |
| Realization, system to service | `realizes` |
| Serving, system to process | `serves` |
| Serving or Realization, node or system software to application | `part-of`: the application is part of what it runs on |
| Serving, application to application | a `## Connects to` row on the served side |
| Triggering between systems | a `## Connects to` row; it comes back as Flow |
| Access with no mode | a `## Holds` row, `Access` as `reads` |
| Composition, Aggregation, Assignment between systems | `part-of`, inverse derived |
| Flow between systems | a `## Connects to` row |
| Access, with its mode | a `## Holds` row, `Access` as `writes` or `reads`, the leading writer `master` |
| ApplicationFunction, TechnologyService, TechnologyFunction, Artifact | dropped: internal behavior nobody can name a user of |
| Location | not yet |
| Path, TechnologyCollaboration, Facility, DistributionNetwork | not yet, with Location |
| Association, untyped | dropped: an edge that says nothing |
| Views | not held; a consumer draws the graph |

## Where it departs from its sources

- One type where ArchiMate has seven across its application, technology and physical layers, and two interfaces that become rows; the kind carries the layer.
- Triggering comes back as Flow: a connection row says what is carried and how, not whether it starts something.
- An interface is a row, not an element. Its name survives in `As`; its own composition into components and its appearance in views do not.
- Behavior nobody uses is dropped: application functions, technology services and artifacts have no page, because core's rule that a thing nobody can name a user of is not a feature is applied once more one level down.
- Capabilities and business services are not pack types; they are features of the products staff open.
- Access is three tokens, not four: ArchiMate's `readwrite` is `writes`, since a writer reads, and `master` is a claim ArchiMate does not make.
- Lifecycle has four stages where LeanIX has five; its phase-in and active are one `active`, since the model says what is, not when it will be.
- Criticality is three tokens where LeanIX names four by business impact.

## Left for later

Location, as a second type of this pack, for the first instance that writes one; an integration type, for an instance whose integrations need an owner, a lifecycle or references of their own; technology services and application functions; license and cost; a generator from an architecture tool's export, which is an instance's own.
