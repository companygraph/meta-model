---
source: Local
requires:
  - Java Programming
  - Domain-Driven Design
---

# Backend Engineer

> The seat that owns the services other teams build on, and is the one called when they stop.

## What it takes

A bounded context with a name, the invoices the service has to get right, and the two teams
whose work sits on top of it. A change request that says what is wrong for a customer, not
which class to edit.

## What it produces

A service that stays up, with the seam to the next context held where the domain puts it,
and a pull request small enough that the reviewer reads it in one sitting.

## What it never does

- Never merges its own pull request.
- Never moves a seam between contexts without the product seat in the room.
- Never ships a change the invoice tests do not cover.
