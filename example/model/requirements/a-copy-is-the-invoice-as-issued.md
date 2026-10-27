---
id: 01a12b01-3a22-74e6-b405-dd48a35f2da8
source: Local
kind: functional
modality: must
realization: Built
---

# A copy is the invoice as issued

> A downloaded invoice holds every line and its explanation exactly as they were on the day the invoice was issued.

## Why

A payer files the copy in their own books, and a copy that changes after the fact makes their books disagree with the company's without either side noticing.

## Fit criterion

An invoice downloaded on the day it is issued, and again after a credit note against it is issued, gives two copies identical to each other and to the invoice as issued.

## Applies to

| Type | Entity |
| --- | --- |
| use-case | Download an invoice |

## Realization

A downloaded copy is rendered from the stored issued invoice, so it does not follow later changes to the invoice's lines. No test yet downloads a copy again after a credit note.

## Evidence

| What | Shows | URL |
| --- | --- | --- |
| Invoice rendering from the stored issue | satisfies | https://example.org/billing-service/blob/3f2a9c1/src/invoices/render.ts |
