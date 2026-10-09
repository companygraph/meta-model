# The landscape pack

A company that runs more than a laptop has systems: the applications it buys and builds, the devices they run on and in, the platforms under them and the networks between them. Core says what the company ships, in `product` and `feature`, and the feature schema draws the line below which core does not go: "a feature nobody can name the user of is a component and belongs in neither this type nor this folder". A retailer the owner keeps a confidential instance for has that layer in an ArchiMate model: 422 application components, 187 interfaces, 254 technology elements, kept in Enterprise Architect and read into Markdown by a generator the owner wrote. Its maturity report names what that model cannot answer, which systems carry which process, what each runs on, who owns it, which system masters an article or a customer, because the layers are modeled apart and the elements carry no governing property. This spec adds the third pack, `landscape`, with one type, `system`, and two tables on it, so that a company's systems stand in the same graph as the features they realize, the processes they serve, the seats that own them and the concepts they hold, and so that what the pack holds maps element for element onto ArchiMate 4.

Status: decided by the owner on October 9, 2026, one question at a time. A pack and not core, because core drew the line at the component on purpose and the software pack proved the level 1 route end to end; named `landscape`, the word the practice and the retailer's own model use for this inventory, which `software` already means something else by and `applications` would be too narrow for a payment terminal; one type `system` across the application and technology layers, its `kind` a four-token enum rather than a kind entity, because the layers are ArchiMate's and mean the same in every instance; integrations as a table on the system and not a type; an interface's name kept on the row so the round trip holds; access to a concept kept as ArchiMate keeps it, with the master marked; and a mapping table to ArchiMate 4 in the pack's README as the contract a generator reads in either direction. The product kind, which the same instance asked for and which says that an IT product is a product opened by staff, shipped first and on its own. Amended the same day, after the build merged: the kind is a type, `system-kind`, carrying a required `element`, one of ArchiMate's six internal active structure elements, because a kind that carries a definition and a fact a reader or a generator reads is a type by the family's own rule, the one the organization pack's kind was decided by, and a company names what its systems are in its own words, `SaaS`, `Store device`; the four-token enum on the system is superseded. Amended once more the same day, read against the ArchiMate 4 Specification (The Open Group, 2026): the kind is the standard's own profile-based specialization, §14.2, so a kind takes its element's notation and its name as the stereotype and no shape of its own; `element` is one of the six internal active structure elements of the Application and Technology Domains, collaborations having merged into the Common Domain's Collaboration; and the mapping speaks the Common Domain's words, Service, Process and Role, where 3.2 had one per layer. Amended once more the same day: ArchiMate keeps the data a system holds apart from the business object it stands for, and the service a system exposes apart from the feature the business sees, and the pack folded both; the pack gains `data-object`, which realizes a concept, and `service`, which realizes a feature and is provided by systems, each reached from a system's table through a qualifier with a declared join, so the collapsed edges stay where nothing finer is modeled and the finer ones hold where it is.

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
| `kind` | Yes | ref → system-kind | What sort of system this is, the H1 of a file in `system-kinds/`; its `element` says which ArchiMate element a system of this kind is |
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

`## Connects to` has the columns `System`, Yes, `ref → system`, the system the data comes from; `As`, No, `string`, the interface the connection goes through, by its own name, `Payment network – Tillpay`, required where two rows name the same system (R16); `Carries`, No, `qualifier → concept`, what the connection carries, by the concept's canonical name; and `Via`, No, `string`, how it is carried, a protocol, a file, a message queue. `## Holds` has the columns `Concept`, Yes, `ref → concept`, and `Access`, Yes, enum, `master`, `writes` or `reads`: the one system whose copy leads, a system that writes a copy, or one that only reads (ArchiMate 4, access relationship). `## References` is the What and URL table every type carries.

Purpose, as the schema will say it: a system answers "what does this run on, what does it carry, who owns it and what breaks when it stops?" for whoever plans a replacement, answers for an outage or asks which system masters a customer record. It is the layer below the feature: what IT buys, builds, runs and retires, whatever it is made of. It is not a product, which is what somebody uses on its own, and not a feature, which is what they do with it; a system that gives people something to do realizes a feature, and the feature says what.

Writing rules:

- The H1 names the system as staff name it, `POS Kassensystem`, `Filialsystem`, and never by its vendor or its product name alone; the vendor goes to `vendor`. An architecture tool's habit of writing both into one name, `Kassensystem – Tillworks Retail`, splits into the H1 and the field.
- The tagline says what the system does and for whom, and claims nothing about how well.
- `kind` names what sort of system it is, what it is made of and who runs it, not what it is for: a payment terminal is of a kind whose `element` is `device` whatever it runs, and the software on it, where that is a system of its own, is of an application kind and `part-of` the terminal.
- `realizes` names features of the products staff and customers open, in the words of those features; a system that gives nobody anything to do, a network, a camera, realizes nothing and names its `domain`, or the processes it `serves`, instead.
- `## Connects to` is written on the system that takes the data. An exchange both ways is two rows, one on each page.
- `## Holds` names concepts, not tables or files, and one system holds a concept as `master`: the one whose copy the others are copies of.
- `## Holds` names a concept once per data object the system keeps of it, and once where it keeps none, each at its strongest access: a system that writes a concept reads it too, and a row for each would draw one edge twice.
- The page states no cost, no license count and no version. Those move, and a contract register or a configuration database holds them.

## The kind

`system-kind` is owned by nothing, so its files sit in the container, `model/system-kinds/*.md`, beside `systems/`, as `product-kinds/` sits beside `products/`. Its frontmatter is `id`, `source`, `source-id`, `rank` (Yes, number, spaced in tens, for wherever systems are drawn grouped) and `element` (Yes, enum): `application-component`, `node`, `system-software`, `device`, `equipment` or `communication-network`, the ArchiMate 4 element a system of this kind is, an internal active structure element of the Application or Technology Domain (chapters 9 and 10), read by a generator in either direction; the kind is the element's profile-based specialization (§14.2), with the element's notation and its own name as the stereotype. Its sections are `# [Label]`, `> [Summary]`, `## What it means` (Yes: what a system of this kind is made of, who runs or holds it, and which systems are not of it) and `## References`. Its purpose: a kind answers "what sort of system is this?" in the company's words, `SaaS`, `Store device`, `Cloud platform`, and carries once the one fact a tool needs, which element it is, so the system page says what staff say and the element comes back exact. A kind no system names is vocabulary nobody uses, once the instance holds a system. Writing rules: `## What it means` says what a system of this kind is made of and who runs it, and what the kind excludes; the H1 names what the system is, `SaaS`, never the element, `Application component`; the page writes names and prose in the model's language (R14).

## Data objects and services

Core's `concept` is the business object, one word the company means something exact by, and core's `feature` is the business service, one thing a product lets someone do. ArchiMate keeps a layer below each: the data object, "data structured for automated processing", which realizes the business object, and the application or technology service, the behavior a component exposes, which realizes the business service and serves processes. The software pack already shows the family's shape for such a refinement, `concept-design` refining `concept`, and the pack takes it twice.

`data-object` is owned by nothing, so its files sit in the container, `model/data-objects/*.md`: several systems hold one. Its frontmatter is `id`, `source`, `source-id` and `realizes` (Yes, `ref → concept`): the concept whose data this is; data whose meaning nobody can name has no page, as a function nobody uses has none. Its sections are `# [Data object]`, named as the people who keep it name it, `> [What it holds]`, one paragraph saying what it holds and in what form, and `## References`. Its purpose: a data object answers "in what form, and where, does the company keep this?" for whoever maps a concept to the systems that hold it, migrates one of them or answers for a record. A field list is left for later.

`service` is owned by nothing, `model/services/*.md`. Its frontmatter is `id`, `source`, `source-id`, `provided-by` (Yes, `array of ref → system`): the systems that expose it, several where several realize one, written here so a connection row can be held to it; `realizes` (No, `array of ref → feature`): the features it gives people, through the products that carry them; and `serves` (No, `array of ref → process`). Its sections are `# [Service]`, `> [What it exposes]`, one paragraph saying what it exposes and to whom, and `## References`. ArchiMate 4's application and technology services are both specializations of the Common Domain's Service, so one type and no kind. Its purpose: a service answers "what does this system offer the others, and who depends on it?", the question an outage or a replacement asks first. A system's own `realizes` and `serves` stay for an instance that models no services: the collapsed edge where nothing finer exists, the finer one where it does.

The system's two tables reach them through a qualifier each, with the join R9 lets a qualifier declare. `## Holds` gains `Data object` (No, `qualifier → data-object`) between `Concept` and `Access`, declaring `` `realizes` lists `Concept` ``: the representation this system keeps of the concept, and the checker refuses one whose `realizes` does not name the row's concept. The row still draws its one edge to the concept, so the one-master check is untouched. A system that keeps a concept in two data objects, a record and an archive, writes two rows, one per data object, and one row where it keeps none. `## Connects to` gains `Service` (No, `qualifier → service`) between `As` and `Carries`, declaring `` `provided-by` lists `System` ``: the service of the source system the connection calls, and the checker refuses one that system does not provide. The interface in `As` and the service beside it are ArchiMate's assignment of an interface to a service, in one row.

The example takes an *Invoice record*, realizing *Invoice* and held by the Billing service as master and by the Invoice mailer as reader, and an *Invoice feed*, provided by the Billing service, realizing *Invoice download*, which the mailer's connection row calls.

## The checks it owes

Three norms span pages, so each is an instance check shipped with the pack, not a writing rule:

- `part-of` forms no cycle, as a group's does in the organization pack and by the same check.
- A concept is held as `master` by at most one system across the instance. Two masters is the question the maturity report could not answer; the check answers it with a failure naming both.
- A kind is named by at least one system, by the `gathers` check a product kind already uses.

What a single page says is held by the grammar: `element`, `lifecycle`, `criticality` and `Access` by R8's enum check, `kind` and every other reference by R4, `As` on repeated systems by R16, and a pack naming only core's types and its own by R20. Which pairs of elements a `part-of` may join is not held: a node holds the system software and applications on it, a device the node it is, and a `part-of` between two kinds whose elements ArchiMate does not relate is left for later, with the export that would meet it.

## The mapping to ArchiMate 4

The pack's README carries this table, one line per element type, relationship and enum token, and it is the contract a generator reads: from an architecture tool's export into pack pages, with the element GUID as `source-id`, and from pack pages back into the Open Exchange Format. What never comes back is exactly what the table says is dropped. The element is exact in both directions; the kind travels as a specialization where the tool carries one, and two kinds sharing an element are told apart only there.

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

Measured against the retailer's export of October 8, 2026, the dropped lines hold 101 elements out of 1,238 in the Application and Technology Domains and the untyped associations, and every element there carries the tool's defaults, `Proposed` and `1.0`, so nothing that carries information is lost.

## The decisions, and why

- **A pack, named `landscape`.** A company of one has no landscape to govern, and core's feature schema drew the line at the component on purpose; the software pack showed that level 1 over level 0 reaches the parser, the server, the plugin and the sites without a core change. The name is the practice's word for this inventory and the retailer's own model's, reads the same in German, and still fits when location and the technology services arrive; `software` means how one piece of software is designed, `applications` leaves out a payment terminal and `architecture` would claim the business layer core already holds.
- **One type across two ArchiMate domains.** In a store the line between application and technology blurs: the retailer's model has the payment terminal as an application component and the scale as a node. A reader asking what the store runs on wants one list, so `system` is one type and `kind` tells the layers apart.
- **`kind` is a type, `system-kind`, and the kind carries `element`.** First decided as a four-token enum on the system, because ArchiMate's layers mean the same in every instance; superseded the same day, because the family's rule is that a kind carrying a definition and a fact a reader reads is a type, and both halves are here: the definition is the company's, `SaaS`, `Store device`, `Cloud platform`, and the fact is the ArchiMate element, written once on the kind as a closed list of six, so a generator maps element type to kind by reading the kinds and the system page carries a word staff use. A kind is named by at least one system, as a product kind is by a product. Read against ArchiMate 4, this is the standard's own mechanism: a kind is a profile assigned to one concrete element, named, inheriting the element's relationships, drawn as the element with the kind as stereotype.
- **The word is `system`, not `component`.** It is what people say, `Kassensystem`, `Filialsystem`, "which systems does the store run on"; ArchiMate avoided it for being vague, and here one word for the whole thing, with `kind` doing the telling apart, is the point.
- **Integrations are rows, not a type.** An integration has nothing of its own to say beyond its two sides, what it carries and how; a row draws the edge and the rest qualify it, the form core already has. Written on the side that takes the data, so a one-way flow is one row and an exchange is two, and no `oneSided` rule applies, since two systems naming each other is two flows. The interface's own name sits in `As`, because R16 makes that column what tells two rows naming one system apart, and two interfaces to one system is the common case.
- **Access as ArchiMate has it, with the master marked.** `master`, `writes`, `reads` keep the access mode the tool records and add the one claim the report wanted: which copy leads. A check holds it to one per concept.
- **Owner and operator are seats.** The report asks for a business and an IT responsible; core's seat is a responsibility the company needs filled, held by whichever profile lists it, and two optional references from the pack's side keep core untouched (R20).
- **The vendor is a string, the processor a reference.** Most vendors are a name on an invoice; one that processes personal data is already a core `data-processor` with a contract, and the system names it rather than repeating what that page holds.
- **Lifecycle and criticality are enums, and license and cost are left out.** The first two are the governing properties the report finds missing and they change seldom; the last two are numbers that move, which the model does not carry.

The grammar needs no change.

## Where this departs from its sources

1. **One type where ArchiMate has six** internal active structure elements across its Application and Technology Domains, and two interfaces that become rows; the kind's `element` names which of the six a system is, so the element is exact on the way back, and the kind where the tool carries a profile.
2. **An interface is a row, not an element.** Its name survives in `As`; its own composition into components and its appearance in views do not.
3. **Behavior nobody uses is dropped.** Functions and artifacts have no page, because core's rule that a thing nobody can name a user of is not a feature is applied once more one level down.
4. **Capabilities and business services are not pack types.** They are features of the products staff open, which is where the retailer's Store capabilities already land once the product kind says that an IT product is a product; an application or technology service is, as `service`, and realizes them.
5. **Access is three tokens, not four.** ArchiMate's `readwrite` is `writes` here, since a writer reads, and `master` is a claim ArchiMate does not make.
6. **Lifecycle has four stages,** where LeanIX has five; its phase-in and active are one `active` here, since the model says what is, not when it will be.
7. **Criticality is three tokens,** `high`, `medium`, `low`, where LeanIX names four by business impact; an instance that needs the finer scale asks for it.
8. **Triggering comes back as Flow.** A connection row says what is carried and how, not whether it starts something.
9. **A kind is a profile and takes no shape of its own.** ArchiMate 4 lets a specialization define a notation (§14.2); the pack leaves that to a drawing, which shows the element's notation and the kind as its stereotype, so a generic editor needs the standard's shapes and nothing per kind.

## What was left out

An artifact realizing a data object, one level further down, with the physical elements. A field list on a data object. A check that a `part-of` joins two kinds whose elements ArchiMate relates. Location, a type that would hold the retailer's 33 locations and the devices in them, which waits for the first instance that writes one and arrives as a second type of this pack. An integration type, for an instance whose integrations need an owner, a lifecycle or references of their own; the rows move to it then. Functions, should an instance want internal behavior named. License and cost. A generator from an architecture tool's export, which is the instance's own and reads the mapping table. Views and diagrams, which a consumer draws from the graph as the design decided for concepts. A collaboration, ArchiMate 4's Common-Domain element for several systems working together. A notation on the kind, the icon or colour a profile may define.

## Out of scope

Rendering the landscape on a site or in the plugin. Importing the retailer's model, which is its owner's work in its own repository. A core change of any kind.

## What it costs

A third folder under `packs/` with a manifest, a README carrying the mapping table, and four schemas, released with core under one tag; `init --pack landscape` and `upgrade --pack`, which the software pack built. Three instance checks, two reused, one new, each with a fixture that breaks it. The example takes the pack with three systems, so the edges to a feature, a process, a seat, a processor and a concept are proven on content: the service behind the Billing Console, the platform it runs on and the mail gateway that takes its invoices out. No change to core and none to any instance that does not take the pack, so it is a minor release; an instance that takes it adds one folder and declares the pack in its manifest.
