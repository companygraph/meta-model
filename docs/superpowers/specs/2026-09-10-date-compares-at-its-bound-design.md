# A date compares at the bound its field names — design

> R9 makes a coarse date an interval and then compares every interval at its first instant. That
> is right for a `start` and wrong for an `end`: it says a period that ended sometime in 2002
> ended before one that ended that March. One clause fixes it, and the fix is a minor because no
> instance stops conforming.

## 1. The finding

R9 has said, since dates were given a lexical form, that a shorter date is an interval rather
than a point, and that a comparison takes its earliest instant. The example it gives is a
`start`, and there the rule is right: a period beginning `2002` began no earlier than the first
of January, and ordering it before one beginning `2002-03` claims nothing the model does not
hold.

An `end` is the same sentence read backwards. A period ending `2002` ended somewhere in that
year, and the rule places it on the first of January — before a period that ended in March. The
model does not know that. It knows the period ended somewhere in 2002, which is on average later
than March, and a reader who sees `end: 2002` takes it as the year the thing finished rather
than the instant the year began.

It surfaced in the reference instance while a surface was produced from it. Two entries had to be
ordered, one ending `2026-09` and one ending `2026-09-06`, and the producer read the coarse value
as its last instant — reasonably, and against R9. Reading it as R9 states put a career break that
ran to the end of September below a podcast published on the sixth of it. Neither reading is
wrong on its face, which is the problem: the rule decided, and it decided the direction that
loses.

## 2. The change

One sentence in R9's paragraph on `date`, replacing the comparison clause:

> A comparison takes the bound the field names — a `start` the interval's first instant, an `end`
> its last — so a period starting `2002` orders before one starting `2002-03`, and a period ending
> `2002` orders after one ending `2002-03`. One rule for both fields reads an end as its first
> instant, which says a period that ended sometime in 2002 ended before one that ended that
> March. The model does not know that, and it is the opposite of what a reader takes from the
> value.

Everything else about `date` is untouched: the three lexical forms, writing at the precision the
source states and never at more, and an interval being an interval.

## 3. Why the bound and not the width

Two other rules would give a total order. Comparing every interval at its midpoint is defensible
and unreadable: nothing in an instance is written at a midpoint, so a reader cannot check an
ordering by looking at the values. Comparing by the interval's start throughout is what R9 says
today, and its virtue is that one sentence covers both fields.

The bound rule costs a clause and buys the property that matters: **an ordering can be checked
against the values a page carries.** A reader holding two entries can see why one precedes the
other, because the instant each was compared at is the end of the interval its own field names.
A rule nobody can check by reading is a rule that gets quietly violated by every tool that
implements it differently.

It also keeps the two fields symmetric, which is what a reader already assumes. `start` and `end`
mark opposite ends of a period, and a comparison rule that treats them alike is the asymmetry.

## 4. What breaks

Nothing conforms less. The change is to how two values compare, not to what a value may be, so
every instance legal under 0.17.x is legal here and no page is edited to take the release.

What can move is an ordering, and only where a coarse `end` meets a finer one in the same year.
In the reference instance that is one pair. Anything sorting by `start` alone — which is what the
timeline on `blust.ch` does — is unaffected, since the rule for a `start` is what it always was.

An implementation that hard-codes the old reading keeps working and quietly disagrees. There is
no check for this: `npm run verify` holds shapes and references, and nothing here compares two
dates. The agent pass is what catches an ordering that reads an end as its first instant, and it
catches it by reading the rule and the values, which is what this change makes possible.

## 5. Version

Core goes to **0.18.0**, a minor. An instance takes it by re-vendoring `core/` and recomputing
its manifest hashes. The parser is unchanged: it does not order anything.
