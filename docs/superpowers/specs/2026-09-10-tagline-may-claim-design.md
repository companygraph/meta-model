# A tagline may state a claim — design

> `profile` declares its tagline a summary of the person, and its writing rule asks for what
> they do and what runs through it. A person is often known for a claim before a title, and the
> schema had no room for one. It gains that room, and with it the rule that keeps a claim from
> being a slogan: what the tagline asserts is something the model holds elsewhere.

## 1. The finding

The reference instance publishes a network profile whose first line is a claim about software
rather than a description of a person. The surface that produces it read that line from
`blust.ch`, which is itself built from this model — so the profile's own headline was derived
from a thing made from the model rather than from the model, which is exactly what R17 forbids:
a fact that lives only on something made from the model is a fact no reader of the model can
find, and the next rebuild deletes it.

Moving the line into the model was the obvious repair and the schema refused it. `profile`
declares the tagline a "single-line summary of the person", and its writing rule asks that the
tagline and the summary say "what they do and what runs through it". A claim about how software
gets built says neither, so a conforming instance could not hold the one line its own surface
leads with.

The refusal is the finding. The schema was written for a person described by their work, and it
did not admit a person known for an argument — which is a common enough shape that the instance
that found it is a company of one whose whole thesis is a sentence.

## 2. The change

The sections table's tagline row gains the second reading:

| Section | Required | Description |
| --- | --- | --- |
| `> [Tagline]` | Yes | Single-line summary of the person: what they do, or the claim their work makes |

And the writing rules gain one, directly beneath the rule it qualifies:

> A tagline may state the claim the person's work makes rather than describe the work. Then the
> claim is one the model holds elsewhere — a value, or the thread the summary names — and a
> reader can follow it there. A line with nothing behind it is a slogan, and nothing on the page
> tells one from the other except what backs it.

The existing rule is untouched. A tagline is still the person's own words and still neither an
employer's description of a role nor a job advertisement.

## 3. Why the second sentence is the change

The first sentence alone is a loosening, and a loosening of the one field a reader meets first.
Without the second, `profile` would admit any line at all, since every slogan describes itself
as a claim.

The second sentence is what a writing rule has to be, which R9 states plainly: checkable by an
agent reading an entity. An agent holding a profile can ask what the tagline asserts and look
for it among the instance's values and in the summary's own thread, and either find it or not.
That is the same test the family applies everywhere else — claim only what is measured or
verifiable — arriving in the one place a person is described.

It also decides the case that motivated the change without naming it. The reference instance's
tagline asserts that deciding well is the constraint, and the instance holds `Decide well over
build fast` as a value, so a reader can follow it. A tagline asserting something with no value
and no thread behind it fails, and fails for a reason a person can state.

## 4. What no check reaches

**Whether a tagline's claim is really backed.** Nothing mechanical resolves a sentence to a
value: a tagline is prose and the thing it points at is prose. `npm run verify` holds the schema
to R9's shape and the example to what the schemas declare, and neither reads a description. The
agent pass is what checks this rule, which is what the rule was written to be checkable by.

**Whether a description is a description.** The existing rule against an employer's words and a
job advertisement is equally unreachable and always was. Nothing here changes that.

## 5. The example

Both example profiles carry descriptive taglines and both still conform, since the change adds a
reading rather than replacing one. Neither is rewritten: an example that showed only the new
form would suggest the old one had gone, and an example that showed both would put two shapes of
one field in front of a reader who has to choose. What the schema says is the place to learn the
second reading.

## 6. Version

Core goes to **0.17.0**, a minor. No instance on 0.16.x is made non-conforming: every tagline
that was legal remains legal, and the change is what a schema may now admit rather than what it
requires. An instance takes it by re-vendoring `core/` and recomputing its manifest hashes. The
parser is unchanged.
