---
id: 01a12190-1c8c-7467-b70b-0c658281c7b8
source: Local
kind: SaaS
vendor: Lantern Mail
lifecycle: active
criticality: medium
processor: Lantern Mail
domain: Invoicing
---

# Invoice mailer

> The hosted mailer that takes each finished invoice from the Billing service and delivers it to the customer's address.

## Connects to

| System | As | Service | Carries | Via |
| --- | --- | --- | --- | --- |
| Billing service | Feed endpoint | Invoice feed | Invoice | REST |

## Holds

| Concept | Data object | Access |
| --- | --- | --- |
| Invoice | Invoice record | reads |
| Customer | | reads |
