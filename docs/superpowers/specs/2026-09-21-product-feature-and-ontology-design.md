# `product`, `feature`, `domain` and `concept` — design

> Core says what a company believes, where it is going, who is in it and how the work runs,
> then stops at the edge of what the company sells and what its words mean. A company that
> builds something can be described in every type core has and still not name the thing it
> builds, and the vocabulary its own people argue in is held nowhere a file can cite. Four
> types close that, and the last of them turns a glossary into an ontology.

Status: proposed. Decided on 2026-09-21 against this repository at `60414f3`. The multi-person instance `likemagic-tech/magic-mental-model` was read that day for `features/`, `concepts/` and the two schemas in its own `meta/` that govern them; every count below was taken from that reading and is a fact about that repository on that date, not a number this design maintains.

---

## 1. The gap

At 0.34.0 core holds seventeen types. It can say that a company has a vision, values and a strategy, that people hold roles and claim skills, and that work runs down the tracks of a process. It cannot say what the company ships. `skill-schema.md` already carries the hole as a writing rule — "Products and tools appear only in a closing clause of the form `Typical tools: …`" — which names a product only to forbid it from being one.

The same absence swallows the company's vocabulary. Every instance argues about a handful of words that mean something exact inside the building and something else outside it, and the first design said so: `concept` is "always present, always the company's own vocabulary". It never shipped, so the only place a definition can live is prose in a page nothing can reference.

The multi-person instance shows what the absence costs at scale. Seventy-one features and twelve domains of business concepts are its two largest content folders after customers, both governed by schemas it wrote for itself because core had none. **The two folders a product company fills first are the two core has no types for.**

## 2. What travels from the multi-person instance, and what does not

`features-schema.md` and `concepts-schema.md` there are the evidence, not the design. Three things travel and three do not.

What travels: a feature is one file with a name, a tagline and a description; a concept has a definition; the business vocabulary is grouped into domains a reader navigates by, and the grouping is stable enough that twelve of them have held.

What does not travel is the shape of a concept. A domain file there holds a class diagram and a glossary of `### ` headings, eighty-six of them across twelve files. That breaks the rule the whole model rests on: a heading has no canonical name, so no feature, role or process can cite the concept it operates on, which is most of the reason to write the concepts down. Of those eighty-six entries, fifty-nine are distinct and twenty-seven are `See Domain …` stubs — the same concept restated in a second domain's glossary because there was no other way to mention it. Promoting the concept to an entity deletes those stubs and keeps every fact.

The feature hierarchy does not travel either. Twenty-five of the seventy-one features carry a `parent:` pointing at another feature, and the largest group is ten lock vendors under Digital Door Access. That is a grouping by what a feature *is*, wearing the shape of composition. With `product` above it the hierarchy has a level it was standing in for, and a second self-referential one earns nothing. §10 says what dropping it exposes.

And the class diagrams do not travel. Once a relation is a row a check can resolve, a hand-drawn diagram of the same relations is a second statement of them, free to disagree, with nothing able to notice. The graph is the tables; a consumer draws it, the way a site draws a stage from the model rather than storing a picture of one.

## 3. A feature is assembled into many products

The first shape tried was nesting: a product owns its features, `products/<product>/features/`, the way a profile owns its experiences. The instance refuses it.

`concepts/platform.md` there defines Platform as "Our LikeMagic product" and hangs six applications off it — Guest Journey, Guest Journey Monitoring, Operations Platform, Self-Service Kiosk, Second Screen and a public API. The same six appear in `features/` as sub-features of a feature called End User Application. So the repository already holds each of them twice, as a product in one folder and a feature in the other, which is the signal that one of the two readings is wrong rather than that both are partial.

Reading each application as a product is what makes the type a collection rather than a singleton, which §4 of the first design forbids outright. It also settles the edge, because the moment there are six products the features stop dividing among them: Multi Language Support, Payment Integration and Notification Management are not one application's, and nesting would force a false choice on each. **A feature is assembled into many products, so the edge is a reference and the feature is the side that declares it.**

Ownership was rejected on that alone. It was attractive for the reason ownership is always attractive — an orphan becomes unrepresentable rather than merely detectable — and it is not worth a model that cannot say a feature ships in two places.

## 4. The ontology, not the glossary

A glossary is a list of definitions. What the multi-person instance keeps is not that: its twelve diagrams carry a hundred and twenty relations between concepts, and the definitions are the smaller half of what is written down. A concept type that holds only a definition would drop the larger half on the floor.

The relations are uniform enough to be a schema rather than a drawing. All hundred and twenty are directed associations; no diagram uses inheritance or composition anywhere. Every label decomposes into a cardinality and an optional role name — `one userProfile`, `many secondaryGuests`, `one booker` — and the cardinality vocabulary is four words wide: `one`, `maybe one`, `many` and `one to many`. One label in the hundred and twenty is a verb rather than a cardinality, `Platform --> PublicApi : expose`, and it is rewritten rather than accommodated.

The role name is load-bearing, not decoration. Fourteen pairs of concepts carry two relations at once, distinguished by nothing else: `Reservation --> ServiceOrder` runs twice, as `includedServices` and as `additionalServices`, and `Reservation --> UnitGroup` as the booked one and the upgraded one. So the role name is required exactly where the pair repeats, which is a rule a check can hold rather than a convention a writer has to remember.

Cardinality is an enum and not an entity. `proficiency-level` set the test when it was promoted: a token whose members carry a definition of their own belongs in a file, and a closed set of bare tokens belongs in the schema under R8. `one` and `many` define nothing; they are the tokens.

## 5. A concept names its domain, and is not owned by it

A concept belongs to one domain, and the instance already says which one in prose. The twenty-seven `See Domain …` stubs are exactly that statement: this concept's home is elsewhere, and what you are reading is a pointer. The first shape this design took made the pointer structural — `domains/<domain>/concepts/`, a domain owning its concepts as a process owns its phases — and the model refused it.

It was refused by a rule decided on 2026-09-19, that a name of an owned type is unique within its owner and the parser resolves an owned name inside the owner it is written in. Nested, a concept in one domain cannot name a concept in another, and the checker says so: "concept entities are named only within the domain that owns them (R5)". That was run against a prototype of the nested shape before this section was rewritten. It makes the ontology one disconnected island per domain, and cross-domain relation is what the twenty-seven stubs *are*, so the shape that best preserved them was the shape that made them unwritable.

So a concept is flat, in `model/concepts/`, and names its domain in a required field. A domain is then a file rather than a folder, because it owns nothing. The argument nesting was chosen for does not survive the comparison either: an orphan concept is impossible either way, since a required `domain` reference must resolve under R4, and the only thing lost is that deleting a domain leaves its concepts naming a missing one — which is a loud error rather than silent garbage.

The cost is real and is the one to weigh. A concept's name is now unique across the whole instance, so two domains cannot each keep a `Status`. That is R2 doing what it does everywhere else, and a company whose two domains mean different things by one word has found something worth a conversation rather than two files.

`Platform` is both a domain and a concept in that repository, and `Company` likewise. Typed resolution handles it — a `ref → concept` and a `ref → domain` are different questions — and this design states that it does rather than leaving a reader to work it out.

## 6. One inverse rule, twice

Both directions of a relation are written today: `EndUser --> UserProfile : one userProfile` and `UserProfile --> EndUser : maybe one guest`. Two statements of one fact can disagree, and nothing stops `one` on one side facing `many` on the other.

**An edge is written on one side and read from both.** A concept declares what it points at; the concepts pointing back are found by scanning, the way `Owner: profile` is derived rather than stated on the owner too. The same rule then settles the product edge without being argued twice: a feature declares its products, and a product's features are what a consumer finds by looking for them.

The cost is a reverse edge with no label anyone wrote. `Booking` renders as referenced by User Profile as `bookings`, which reads backwards where the forward phrase reads forwards. An `Inverse as` column would fix it and is not added, because the reading has not been done yet and a column added against a guess is a column every file carries.

## 7. The schemas

Four files in `core/`, following R9's fixed shape. Every one carries `source` and `source-id` as every core type does; only the fields beyond those are given here.

`product-schema.md` — `model/products/*.md`, a file, owning nothing.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `audience` | No | string | Free-text grouping, e.g. `Staff`. Whether an audience becomes an entity of its own is deliberately open. |

Sections are the H1, a tagline saying what the product is and who uses it, and nothing else. It lists no features, because §6 derives them. The `audience` field copies `skill`'s `group` field including its openness: three values across six products is not the data that question needs.

`feature-schema.md` — `model/features/*.md`, a file, owning nothing.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `products` | Yes | array of ref → product | The products this feature is assembled into |
| `concepts` | No | array of ref → concept | The concepts the feature operates on |

Sections are the H1, a tagline carrying the business value in one line, and a required `## Description`. `products` is required because a feature nothing ships is a plan, and the type for a plan is not this one. `concepts` is the one join between the two halves of this design, and it is the field to watch: optional and unpopulated is how a field rots, and it is kept anyway because it is what makes "which features touch Folio?" a question the graph can answer at all.

`domain-schema.md` — `model/domains/*.md`, a file, owning nothing.

Sections are the H1 and a tagline stating what the domain covers and what it leaves to a neighbor. There is no concept table and no diagram: what a domain holds is what names it, derived as every other inverse here is. The H1 is the domain's name and not its type — `# Booking`, never `# Domain Booking` — because nothing else in the model prefixes a name with what it is.

`concept-schema.md` — `model/concepts/*.md`, a file, owned by nothing.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `domain` | Yes | ref → domain | The domain this concept belongs to |

Sections are the H1, a one-paragraph definition as the tagline, then two optional tables.

`## Also known as` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Term` | Yes | string | The other name |
| `Kind` | Yes | enum | `synonym`, `abbreviation`, `translation` or `deprecated` |

`## Relations` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept | What this concept points at |
| `Cardinality` | Yes | enum | `one`, `maybe one`, `many` or `one to many` |
| `As` | No | string | The role the target plays. Required where two rows name the same concept. |

The cardinality tokens are the instance's own four words and are not regularized. `maybe one` is nought or one, `many` is nought or more, `one to many` is one or more, and renaming them to something tidier would cost a migration and buy a reader nothing.

## 8. An alias is found, never resolved

A concept carries other names, and a reference never uses one. R3 says every reference is by canonical name, and an alias that resolved would be a second canonical name for one thing, which is what R2 exists to forbid. So `## Also known as` is there for a reader or an agent searching for the concept, and the checker resolves the H1 and nothing else. An agent that writes `Backoffice` where `Operations Platform` is meant still gets an R4 error, and now the error has an answer a search can reach.

The kinds are four because the instance has four cases and they behave differently. `Gästereise` is a translation, and the family's language rule means a translation may one day be rendered rather than merely recorded. `IBE` is an abbreviation, in a repository whose own rules forbid abbreviating a role name. `Backoffice` beside `Operations Platform` is a deprecated name, because two folders there call one application two things. A plain synonym is the fourth. A flat list would hold all four and be able to tell a dead name from a living one in none of them.

## 9. What ships

Four schema files in `core/`. Four entries in the `TYPES` list of `lib/checks.mjs`, all four flat, which is the shape `skill` and `value` already have. The instance checks gain the rule that `As` is required where a pair repeats. The README's type list gains the four. Core goes to 0.36.0 and the package with it, 0.35.0 having already gone out as a package-only release.

The parser needs no change. `products`, `concepts` and a relation's `Concept` cell are references it resolves by declared type, and the declared-columns table is the shape `phase` already writes.

One check does need one, and it is a rule already written rather than a new one. R9 says a column table is read "on the same terms as the frontmatter table except for the list types", and the R8 check reads frontmatter alone — it says so in its own comment, and adds that no column enum exists in core. `Cardinality` and `Kind` are the first two. So the check learns to read a column table, which holds every column enum written after these and can break nothing written before them, because there are none.

`example/` is where this runs before it is called done. The fictional company gains three products, six features across them including one feature assembled into two, two domains and eight concepts naming them — carrying at least one pair of parallel edges, one relation that crosses the domain boundary, one alias of each of the four kinds, and one concept with no relations at all, so both optional tables are exercised in both states.

This is a minor release and it breaks nothing: an instance that writes none of the four folders is as valid after it as before, which is the difference between a core type and a pack.

## 10. What a migration of the multi-person instance would find

No migration is in scope. These are recorded because each one is evidence that the shape above is right, and because the first person to attempt it should not rediscover them.

Twelve classes appear in the diagrams with no glossary entry anywhere — FBOrderItem, FBReservation, Venue, Order, PointOfSale, MessageParticipant, MessageContext, TaskType, Channel, Direction, MaintenanceSlot and SelfServiceKiosk. Under R4 each is an error on the first run, and each is a concept somebody has to define. The checker finding them is the point.

Twenty-seven glossary entries are `See Domain …` stubs and are deleted outright, which is a third of the glossary going away as duplication rather than as content.

One synonym is identical to the term it belongs to, `Self-Service Kiosk / Self-Service Kiosk`. The ` / ` convention cannot tell that from a real second name; a typed table can.

Dropping `parent:` unhomes ten lock vendors that sat under Digital Door Access, leaving them siblings of Guest Journey. That is the weakest consequence of any decision here, and it may be the finding rather than the cost: a vendor integration that is only ever reached through the feature it implements may not be a feature.

## 11. Not done here

`architecture-decision` and `roadmap`, the other two types the first design's product pack named, stay deferred. The pack mechanism stays unbuilt, because these four went into core and no second kind of company has asked for vocabulary core should not carry. Inheritance and composition between concepts are not modeled, because no diagram in the instance uses either. An `Inverse as` column is not added, for the reason §6 gives. No consumer renders any of this yet: the site, the server and the editor plugin take the release when there is something in an instance for them to draw.
