---
id: 01a12b01-39eb-7a27-a513-10b8e399cbc1
source: Local
level: subfunction
primary-actor: Payer
---

# Find an invoice

> A payer has the invoice of the billing period they pick in front of them.

## Stakeholders and interests

| Stakeholder | Interest |
| --- | --- |
| Payer | Only their own invoices, and the one for the period they picked |

## Main success scenario

| Step | Actor | Action |
| --- | --- | --- |
| 1 | Payer | Picks a billing period |
| 2 | System | Shows the invoice issued for that period |

## Minimal guarantees

- No payer sees another payer's invoice.

## Success guarantees

- The invoice of the period the payer picked is on the page.
