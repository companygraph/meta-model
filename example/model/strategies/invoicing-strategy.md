---
source: Local
adopted: 2026-01
serves:
  - Support stops explaining invoices
upholds:
  - Craftsmanship
---

# Invoicing Strategy

> The invoice is rendered from the pricing rules themselves, so its explanation is generated rather than written.

## The approach

We keep the pricing rules as data the billing run reads, rather than code it executes: one rule
per pricing term, named in the words the contract uses, versioned with the contract it belongs
to. A line on an invoice carries the id of the rule that produced it, and the explanation a
customer reads is rendered from that rule and the inputs it saw. One run produces both the
number and the sentence about the number, which is what keeps them from drifting apart.

Where a rule cannot express a term, we renegotiate the term or we grow the rule language.
Neither is quick, and choosing that over a manual adjustment is the whole of this strategy.

## What it rules out

We never add a manual adjustment line. An invoice that anyone can add a number to is an invoice
that cannot explain itself, and every exception granted teaches the next team to ask for one. We
never write the explanation by hand after the fact, however well written it would be: a sentence
maintained beside a number is a second copy of a rule, and it goes stale on the first pricing
change nobody remembers to follow. And we keep no per-customer pricing code, which is the fast
way to win one deal and the slow way to lose the ability to explain anything.

## What would show it is working

We watch the share of invoice lines whose rule id is missing, which is countable on every run and
should fall to nothing. Then the share of explanation tickets in support's queue, which moves
later and is read monthly. The first number moves within a sprint of any pricing change, which is
what makes it worth watching — by the time the second one moves, the change that broke it is
months old.
