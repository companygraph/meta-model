---
source: Local
requires:
  - Java Programming
---

# Backend Engineer

> The seat that keeps the services the product runs on correct, and answers for them when they are not.

## What it takes

A bounded context with a name and the invoices it has to get right. A change request that says what is wrong for a customer, not which class to edit. A turn on the pager, because the seat answers for what it ships.

## What it produces

A service that stays up, and a change small enough that a reviewer reads it in one sitting, with the tests that show the invoice is still right.

## What it never does

- Never merges its own change.
- Never moves a seam between contexts on its own; where a seam sits is the domain's decision.
- Never ships a change the invoice tests do not cover.
