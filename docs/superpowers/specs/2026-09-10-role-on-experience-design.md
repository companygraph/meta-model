# `role` on experience — design

> An experience names a period and says who it was for, and nothing says what part the subject
> played in it. Where the H1 is a position that is no loss; where the H1 is a delivery or an
> event it is the whole question, and instances have been answering it in prose. One optional
> field, and a rule that keeps it from duplicating the H1.

## 1. The finding

The reference instance produces a network profile from its model, and one of that surface's
rules reads the part played out of an experience's tagline. The taglines carry it by convention:
eleven of twelve deliveries open `<employer> · <role> — <description>`, one opens with a verb
phrase, and one runs a role title straight into a description. A producer following the rule
judged by reading English, said so, and was right to.

That is a structured fact wearing prose, which is the shape this model exists to end. It is also
invisible to everything: no check can find it, no second surface can read it, and a rename
breaks it silently.

The question is uniform even where the answer is not. Every experience has a part the subject
played in it. Where the H1 is a position the H1 is that answer and nothing is missing. Where the
H1 is a delivery — named for what it delivered — or an event, the H1 answers a different question
and the part is recorded nowhere.

Both shapes are in front of us. The reference instance names a `Role` for the position and a
`Project` for the delivery. The example names a `Role` for the work it did: `Rebuilding the order
pipeline`, four years at one employer, with the position stated nowhere. Neither is wrong, and
that is the point — the convention is the instance's, and the field has to work under both.

## 2. The change

`experience` gains one optional frontmatter field:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `role` | No | string | The part the subject played, where the H1 does not already name it |

And two writing rules, the first of which is the change and the second of which prevents the
obvious misreading:

> `role` is filled where the H1 does not already name the part the subject played, and left
> absent where it does. An entry named for what it delivered, or for the event it happened at,
> does not say who the subject was on it. An entry named for a position does, and repeating it
> in the field would be the same fact twice. Which of those an instance writes is the instance's
> own convention and no rule here fixes it; the field is what carries the part when the H1 does
> not.

> `role` is the part, not the employer and not the client. Who the work was done for is
> `organization`. Who it was done through is not a field at all: it is the period that contains
> this one, and an instance that wants it stated reads it from there.

## 3. Why optional, and why no kind decides it

**Optional, because required would mean a duplicate on every position.** An instance that names
its roles for the position would write the H1 twice on every one of them, and a field that is
usually a copy is a field a reader learns to skip.

**No kind decides it**, and an earlier draft of this had one. Writing "a `Role` names the
position, so it needs no `role`" reads as a rule about kinds and is really a rule about one
instance's naming, which the example disproves in the same repository. Experience kinds are the
instance's own entities; core cannot reach inside them and should not pretend to. So the rule
keys on what the H1 says, which any reader can check against the entry in front of them.

**A string and not a reference.** A part played is not an entity of this model: it has no page,
nothing references it, and two instances would spell the same part differently on purpose. R16
would make a `ref` draw an edge to nothing.

## 4. What the field is not

**Not the employer.** A delivery done for a client through an employer has the client in
`organization`, per the kind's own definition, and the employer nowhere. It does not need to be
anywhere: the employer is the period that contains the delivery, which the model already holds
as a separate experience with its own dates. A field for it would be a second copy of a fact
that is already derivable, and the derivation is what a surface should use.

**Not a seniority.** "Lead" in `Lead Architect` is part of what the part was called, not a level
this model ranks. Proficiency is the ladder and it is a different axis.

## 5. The example

Two example entries gain the field, because both are cases the rule is about and neither could
answer the question before. `Rebuilding the order pipeline` is a `Role` whose H1 is the work, so
it takes `role: Backend engineer`. `Conference talk — the speed-up nobody asked for` is a
`Community` entry named for the event, so it takes `role: Speaker`.

The other three example entries keep no `role`, which is the rule's other half shown rather than
stated: their H1s answer the question already, or the entry is one where the part is not in
doubt.

## 6. Version

Core goes to **0.19.0**, a minor. The field is optional and nothing else changes, so every
instance on 0.18.x conforms untouched, and an instance takes it by re-vendoring `core/` and
recomputing its manifest hashes. The parser reads a `string` field as a fact and draws no edge
from it, so nothing about a parsed instance changes shape.

## 7. What no check reaches

**Whether the H1 already names the part.** That is the whole rule and it is a reading. Nothing
mechanical can tell `Co-Founder & CTO` from `Rebuilding the order pipeline` as titles, and an
agent holding the entry can. It is the same class as every other writing rule here.

**Whether a filled `role` is true.** Nothing verifies a part any more than it verifies an
achievement. The instance's own sources are the answer, as they are everywhere else.
