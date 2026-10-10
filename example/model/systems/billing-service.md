---
id: 01a12190-1c1b-7fa5-a0ec-c93888e10d73
source: Local
kind: Service
lifecycle: active
criticality: high
owner: Backend Engineer
part-of: Beacon cluster
realizes:
  - Billing run
  - Pricing rules
  - Credit notes
  - Charge explanation
---

# Billing service

> The service that runs every billing run, prices each customer's usage against its contract, and writes the invoices and credit notes the Billing Console and the Invoice Page show.

## Holds

| Concept | Access |
| --- | --- |
| Invoice | master |
| Invoice line | master |
| Credit note | master |
| Pricing rule | master |
| Customer | reads |
| Usage record | reads |
