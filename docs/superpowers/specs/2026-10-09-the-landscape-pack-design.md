# The landscape pack

A company that runs more than a laptop has systems: the applications it buys and builds, the devices they run on and in, the platforms under them and the networks between them. Core says what the company ships, in `product` and `feature`, and the feature schema draws the line below which core does not go: "a feature nobody can name the user of is a component and belongs in neither this type nor this folder". A retailer the owner keeps a confidential instance for has that layer in an ArchiMate model: 422 application components, 187 interfaces, 254 technology elements, kept in Enterprise Architect and read into Markdown by a generator the owner wrote. Its maturity report names what that model cannot answer, which systems carry which process, what each runs on, who owns it, which system masters an article or a customer, because the layers are modeled apart and the elements carry no governing property. This spec adds the third pack, `landscape`, with one type, `system`, and two tables on it, so that a company's systems stand in the same graph as the features they realize, the processes they serve, the seats that own them and the concepts they hold, and so that what the pack holds maps element for element onto ArchiMate 3.

Status: decided by the owner on October 9, 2026, one question at a time. A pack and not core, because core drew the line at the component on purpose and the software pack proved the level 1 route end to end; named `landscape`, the word the practice and the retailer's own model use for this inventory, which `software` already means something else by and `applications` would be too narrow for a payment terminal; one type `system` across the application and technology layers, its `kind` a four-token enum rather than a kind entity, because the layers are ArchiMate's and mean the same in every instance; integrations as a table on the system and not a type; an interface's name kept on the row so the round trip holds; access to a concept kept as ArchiMate keeps it, with the master marked; and a mapping table to ArchiMate 3.2 in the pack's README as the contract a generator reads in either direction. The product kind, which the same instance asked for and which says that an IT product is a product opened by staff, shipped first and on its own.

## Where this comes from

The retailer's model has eight sub-models, and one of them, IT-Products, is organized the way an IT function thinks: a package per thing IT provides, Store, Online Shop, ERP, HR & Talent Management, Finance & Treasury, Franchise Management, Business Intelligence, Cyber & IT Security, Data Center Infrastructure, each bundling the capabilities it gives the business, the application components behind them, the devices and nodes they run on and the locations they stand in. The Store package alone names 26 application components, from the point-of-sale system and the branch system to the payment terminal, the scales, the electronic shelf labels and the footfall counter, 21 capabilities from checkout to stock-taking to price labeling, and a store location composed of a sales area, a stock area, a back office and the devices in them.

In core's words, each of those packages is a product of the IT product kind, opened by staff, and its capabilities are that product's features: one thing the product lets a person in a store do, in their words, naming no vendor. That much core holds since the product kind. What core does not hold is the component: the retailer's model has 422 of them and the maturity report finds 217 serving nothing, 19 connected to anything they run on, none with an owner, a lifecycle or a criticality. The pack is for them.

## The type

`system` is owned by nothing, so its files sit in the container, `model/systems/*.md`. A system is part of another by a field, never by nesting: a terminal moves from one node to another by editing a line, and a device that holds no application is a page like any other.

```markdown
# System Schema

> Required structure for system files.

## File Location

`model/systems/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, an element's GUID in an architecture tool. Absent when the source has none. |
| `kind` | Yes | enum | `application`, `device`, `platform` or `network`. Software somebody uses or that serves other software; a physical thing that computes, prints, weighs or pays; what applications run on, a node, system software, a cloud service; or what connects systems (ArchiMate 3.2, chapters 9 to 11). |
| `vendor` | No | string | Who makes it. A name, not a reference: a vendor is an entity only when it processes personal data, which `processor` says. |
| `lifecycle` | No | enum | `planned`, `active`, `retiring` or `retired`. The stage the system is in, not a date (LeanIX, application lifecycle). |
| `criticality` | No | enum | `high`, `medium` or `low`. What stops when it stops. |
| `owner` | No | ref → seat | The seat accountable for what the system does for the business, the H1 of a file in `seats/` |
| `operator` | No | ref → seat | The seat that runs it, the H1 of a file in `seats/` |
| `processor` | No | ref → data-processor | The party outside the company that runs it where it handles personal data, the H1 of a file in `data-processors/`; the contract sits on that page |
| `part-of` | No | ref → system | The system this one runs on or in, the H1 of another file in `systems/`: the device a terminal is, the node an application runs on. Written on the part; the whole lists nothing. |
| `domain` | No | ref → domain | The area of the company the system belongs to where it realizes no feature, the H1 of a file in `domains/` |
| `realizes` | No | array of ref → feature | The features this system gives, each the H1 of a file in `features/` |
| `serves` | No | array of ref → process | The processes this system carries where no feature names it yet, each the H1 of a process's own file |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [System]` | Yes | The canonical name of the system, as the people who use or run it name it |
| `> [What it does]` | Yes | One-paragraph statement of what the system does and for whom |
| `## Connects to` | No | Table. One row per integration this system takes data over, written on the side that takes it; its columns are declared below. |
| `## Holds` | No | Table. One row per concept this system keeps data of; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the system; its columns are declared below. |
```

`## Connects to` has the columns `System`, Yes, `ref → system`, the system the data comes from; `As`, No, `string`, the interface the connection goes through, by its own name, `Payment network – Tillpay`, required where two rows name the same system (R16); `Carries`, No, `qualifier → concept`, what the connection carries, by the concept's canonical name; and `Via`, No, `string`, how it is carried, a protocol, a file, a message queue. `## Holds` has the columns `Concept`, Yes, `ref → concept`, and `Access`, Yes, enum, `master`, `writes` or `reads`: the one system whose copy leads, a system that writes a copy, or one that only reads (ArchiMate 3.2, access relationship). `## References` is the What and URL table every type carries.

Purpose, as the schema will say it: a system answers "what does this run on, what does it carry, who owns it and what breaks when it stops?" for whoever plans a replacement, answers for an outage or asks which system masters a customer record. It is the layer below the feature: what IT buys, builds, runs and retires, whatever it is made of. It is not a product, which is what somebody uses on its own, and not a feature, which is what they do with it; a system that gives people something to do realizes a feature, and the feature says what.

Writing rules:

- The H1 names the system as staff name it, `POS Kassensystem`, `Filialsystem`, and never by its vendor or its product name alone; the vendor goes to `vendor`. An architecture tool's habit of writing both into one name, `Kassensystem – Tillworks Retail`, splits into the H1 and the field.
- The tagline says what the system does and for whom, and claims nothing about how well.
- `kind` is what the system is made of, not what it is for: a payment terminal is a `device` whatever it runs, and the software on it, where that is a system of its own, is an `application` that is `part-of` the terminal.
- `realizes` names features of the products staff and customers open, in the words of those features; a system that gives nobody anything to do, a network, a camera, realizes nothing and names its `domain`, or the processes it `serves`, instead.
- `## Connects to` is written on the system that takes the data. An exchange both ways is two rows, one on each page.
- `## Holds` names concepts, not tables or files, and one system holds a concept as `master`: the one whose copy the others are copies of.
- `## Holds` names each concept once, at its strongest access: a system that writes a concept reads it too, and a row for each would draw one edge twice.
- The page states no cost, no license count and no version. Those move, and a contract register or a configuration database holds them.

## The checks it owes

Two norms span pages, so each is an instance check shipped with the pack, not a writing rule:

- `part-of` forms no cycle, as a group's does in the organization pack and by the same check.
- A concept is held as `master` by at most one system across the instance. Two masters is the question the maturity report could not answer; the check answers it with a failure naming both.

What a single page says is held by the grammar: `kind`, `lifecycle`, `criticality` and `Access` by R8's enum check, every reference by R4, `As` on repeated systems by R16, and a pack naming only core's types and its own by R20.

## The mapping to ArchiMate 3.2

The pack's README carries this table, one line per element type, relationship and enum token, and it is the contract a generator reads: from an architecture tool's export into pack pages, with the element GUID as `source-id`, and from pack pages back into the Open Exchange Format. What never comes back is exactly what the table says is dropped.

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
| Composition, Aggregation, Assignment between systems | `part-of`, inverse derived |
| Flow between systems | a `## Connects to` row |
| Triggering between systems | a `## Connects to` row; it comes back as Flow |
| Access, with its mode | a `## Holds` row, `Access` as `writes` or `reads`, the leading writer `master` |
| Access with no mode | a `## Holds` row, `Access` as `reads` |
| ApplicationFunction, TechnologyService, TechnologyFunction, Artifact | dropped: internal behavior nobody can name a user of |
| Location | not yet; see below |
| Path, TechnologyCollaboration, Facility, DistributionNetwork | not yet, with Location |
| Association, untyped | dropped: an edge that says nothing |
| Views | not held; a consumer draws the graph |

Measured against the retailer's export of October 8, 2026, the dropped lines hold 101 elements out of 1,238 in the application and technology layers and the untyped associations, and every element there carries the tool's defaults, `Proposed` and `1.0`, so nothing that carries information is lost.

## The decisions, and why

- **A pack, named `landscape`.** A company of one has no landscape to govern, and core's feature schema drew the line at the component on purpose; the software pack showed that level 1 over level 0 reaches the parser, the server, the plugin and the sites without a core change. The name is the practice's word for this inventory and the retailer's own model's, reads the same in German, and still fits when location and the technology services arrive; `software` means how one piece of software is designed, `applications` leaves out a payment terminal and `architecture` would claim the business layer core already holds.
- **One type across two ArchiMate layers.** In a store the line between application and technology blurs: the retailer's model has the payment terminal as an application component and the scale as a node. A reader asking what the store runs on wants one list, so `system` is one type and `kind` tells the layers apart.
- **`kind` is an enum, not a kind entity.** A product's kinds are the company's own, so the product kind is an entity the company describes. A system's kinds are the field's, ArchiMate's layers, and should mean the same in every instance so that a drawing of the landscape or a question to the chat works across companies; R8 holds a closed list, as it holds a concept's `Kind`.
- **The word is `system`, not `component`.** It is what people say, `Kassensystem`, `Filialsystem`, "which systems does the store run on"; ArchiMate avoided it for being vague, and here one word for the whole thing, with `kind` doing the telling apart, is the point.
- **Integrations are rows, not a type.** An integration has nothing of its own to say beyond its two sides, what it carries and how; a row draws the edge and the rest qualify it, the form core already has. Written on the side that takes the data, so a one-way flow is one row and an exchange is two, and no `oneSided` rule applies, since two systems naming each other is two flows. The interface's own name sits in `As`, because R16 makes that column what tells two rows naming one system apart, and two interfaces to one system is the common case.
- **Access as ArchiMate has it, with the master marked.** `master`, `writes`, `reads` keep the access mode the tool records and add the one claim the report wanted: which copy leads. A check holds it to one per concept.
- **Owner and operator are seats.** The report asks for a business and an IT responsible; core's seat is a responsibility the company needs filled, held by whichever profile lists it, and two optional references from the pack's side keep core untouched (R20).
- **The vendor is a string, the processor a reference.** Most vendors are a name on an invoice; one that processes personal data is already a core `data-processor` with a contract, and the system names it rather than repeating what that page holds.
- **Lifecycle and criticality are enums, and license and cost are left out.** The first two are the governing properties the report finds missing and they change seldom; the last two are numbers that move, which the model does not carry.

The grammar needs no change.

## Where this departs from its sources

1. **One type where ArchiMate has seven** across its application, technology and physical layers, and two interfaces that become rows; the kind carries the layer.
2. **An interface is a row, not an element.** Its name survives in `As`; its own composition into components and its appearance in views do not.
3. **Behavior nobody uses is dropped.** Application functions, technology services and artifacts have no page, because core's rule that a thing nobody can name a user of is not a feature is applied once more one level down.
4. **Capabilities and business services are not pack types.** They are features of the products staff open, which is where the retailer's Store capabilities already land once the product kind says that an IT product is a product.
5. **Access is three tokens, not four.** ArchiMate's `readwrite` is `writes` here, since a writer reads, and `master` is a claim ArchiMate does not make.
6. **Lifecycle has four stages,** where LeanIX has five; its phase-in and active are one `active` here, since the model says what is, not when it will be.
7. **Criticality is three tokens,** `high`, `medium`, `low`, where LeanIX names four by business impact; an instance that needs the finer scale asks for it.
8. **Triggering comes back as Flow.** A connection row says what is carried and how, not whether it starts something.

## What was left out

Location, a type that would hold the retailer's 33 locations and the devices in them, which waits for the first instance that writes one and arrives as a second type of this pack. An integration type, for an instance whose integrations need an owner, a lifecycle or references of their own; the rows move to it then. Technology services and application functions, should an instance want internal behavior named. License and cost. A generator from an architecture tool's export, which is the instance's own and reads the mapping table. Views and diagrams, which a consumer draws from the graph as the design decided for concepts.

## Out of scope

Rendering the landscape on a site or in the plugin. Importing the retailer's model, which is its owner's work in its own repository. A core change of any kind.

## What it costs

A third folder under `packs/` with a manifest, a README carrying the mapping table, and one schema, released with core under one tag; `init --pack landscape` and `upgrade --pack`, which the software pack built. Two instance checks, one reused, one new, each with a fixture that breaks it. The example takes the pack with three systems, so the edges to a feature, a process, a seat, a processor and a concept are proven on content: the service behind the Billing Console, the platform it runs on and the mail gateway that takes its invoices out. No change to core and none to any instance that does not take the pack, so it is a minor release; an instance that takes it adds one folder and declares the pack in its manifest.
