---
source: Local
decided: 2022-01
kind: Architecture
status: Standing
by: Backend Engineer
upholds:
  - Craftsmanship
---

# Billing leaves the monolith

> We take billing out of the one service three teams edit and make it a service of its own, owned by one team, with the invoice as its boundary.

## The question

Three teams edited one service, and the second waited on the first to merge before the third could start. Invoice work queued behind pricing work that had nothing to do with it. The question was where to cut, and it had to be decided in January 2022 because the next quarter's invoice changes would otherwise be written into the same service and make the cut dearer.

## Alternatives

| Option | Why not |
| --- | --- |
| Keep one service and add a review rota | The wait moves from the merge to the review and stays a wait, and three teams still ship one thing. |
| Split by team rather than by domain | Three services that each hold part of billing would share the invoice, and every price change would cross all three. |

## Why

The invoice is where the teams already stopped understanding each other's code, so it is the boundary that costs the least to draw and the most to leave. A service owned by one team can be released when that team is ready, which is the whole of what the second team was waiting for.

## Consequences

Two services where there was one, each released by its own team, and a third split still owed to the third team. Every price change now crosses a boundary, which the pricing rules have to be written to survive. The call stays right as long as one team owns the whole invoice; the day two teams edit the billing service, the cut was in the wrong place.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | Splitting the billing domain | Mira Halvorsen | made it |
