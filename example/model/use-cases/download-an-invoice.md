---
id: 01a12b01-39b2-7ea6-994a-d246d4ab6825
source: Local
level: user goal
scope: system
primary-actor: Payer
features:
  - Invoice download
includes:
  - Find an invoice
---

# Download an invoice

> A payer keeps a copy of an invoice in their own books, exactly as it was issued.

## Stakeholders and interests

| Stakeholder | Interest |
| --- | --- |
| Payer | A copy that matches the invoice they were sent, line for line |
| Backend Engineer | A copy made from the issued invoice and never computed again |

## Trigger

The payer's bookkeeping asks for the invoice of a closed billing period.

## Main success scenario

| Step | Actor | Action |
| --- | --- | --- |
| 1 | Payer | Finds the invoice on the Invoice Page, as Find an invoice says |
| 2 | Payer | Asks for a copy |
| 3 | System | Hands over the invoice as it was issued, every line and its explanation |

## Extensions

| Step | Condition | Handling |
| --- | --- | --- |
| 1a | The billing period is still open, so no invoice is issued yet | The page says when the period closes, and the payer comes back then, so the use case ends without a copy |
| 3a | A credit note has been issued against the invoice since | The copy is still the invoice as issued, and the page names the credit note beside it |

## Minimal guarantees

- No copy differs from the invoice as it was issued.

## Success guarantees

- The payer holds a copy that matches what the Invoice Page showed on the day the invoice was issued.
