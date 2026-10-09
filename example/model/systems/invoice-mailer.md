---
id: 01a12190-1c8c-7467-b70b-0c658281c7b8
source: Local
kind: application
vendor: Lantern Mail
lifecycle: active
criticality: medium
processor: Lantern Mail
domain: Invoicing
---

# Invoice mailer

> The hosted mailer that takes each finished invoice from the Billing service and delivers it to the customer's address.

## Connects to

| System | As | Carries | Via |
| --- | --- | --- | --- |
| Billing service | Invoice feed | Invoice | REST |

## Holds

| Concept | Access |
| --- | --- |
| Invoice | reads |
| Customer | reads |
