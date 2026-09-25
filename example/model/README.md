# Example instance

> A fictional company, described in CompanyGraph. Nothing here is real.

Northwind Atelier and Beacon Systems do not exist, and neither do Mira Halvorsen, Tomas Reyes and the agent that holds the Reviewer seat. The content is invented so the shape can be read end to end without anyone's actual client or revenue data being published.

It uses every core type — `identity`, `vision`, `profile`, `experience`, `experience-kind`, `achievement-kind`, `skill`, `proficiency-level`, `value`, `source`, `surface`, `strategic-objective`, `strategy`, `kpi`, `role`, `process`, `phase`, `track`, `product`, `feature`, `domain`, `concept`, `question` — and declares no packs. That is what core ships, not a claim that these types describe a company.

```
identity.md                      Beacon Systems — the company all of this is about
vision.md                        billing nobody has to explain
strategic-objectives/            support-stops-explaining-invoices.md
strategies/                      invoicing-strategy.md
kpis/                            change-lead-time.md, change-fail-rate.md
roles/                           backend-engineer.md, reviewer.md
products/                        billing-console.md, invoice-page.md, usage-api.md
features/                        billing-run.md, charge-explanation.md, credit-notes.md,
                                 invoice-download.md, pricing-rules.md, usage-reporting.md
domains/                         pricing.md, invoicing.md
concepts/                        contract.md, customer.md, pricing-rule.md, usage-record.md,
                                 invoice.md, invoice-line.md, credit-note.md, billing-period.md
questions/                       how-do-i-find-out-why-a-line-is-on-my-invoice.md,
                                 who-split-billing-out-of-the-monolith.md,
                                 does-beacon-systems-publish-its-revenue.md
processes/delivery/              delivery.md
  phases/                        specify.md, build.md, release.md
  tracks/                        code.md, docs.md
values/                          say-the-hard-thing.md, craftsmanship.md
sources/                         local.md, google-workspace.md
surfaces/                        partner-directory.md, beacon-systems-website.md
skills/                          java-programming.md, domain-driven-design.md,
                                 product-discovery.md
proficiency-levels/              familiar.md, competent.md, proficient.md, expert.md
experience-kinds/                community.md, education.md, project.md, role.md
achievement-kinds/               decisions.md, delivery.md, sharing.md, results.md
profiles/mira-halvorsen/         mira-halvorsen.md
  experiences/                   2018-northwind-atelier.md, 2022-beacon-systems.md
profiles/tomas-reyes/            tomas-reyes.md
  experiences/                   2019-northwind-atelier.md, 2021-orbit-conference.md,
                                 2022-beacon-systems.md
profiles/ai-agent/               ai-agent.md — an agent, holding the Reviewer seat
  experiences/                   empty
```

`profiles/` is a folder of folders because a profile owns its experiences. `skills/` is a folder of files because nothing owns a skill. `identity.md` and `vision.md` are files directly in the container because a company has one of each: the filesystem carries the cardinality, so no rule has to state it (R6, R13).

Everything here sits under `model/`. What an instance keeps beside it — the vendored `meta/`, its tooling, its working documents — is not content and is never walked as content.

There are no schemas here. This instance is read beside `core/` and is written against the schemas there — one copy, which cannot drift from a second. An adopter who takes `core/` away has no such neighbor and keeps a copy; where is theirs to decide, so long as it is not inside a folder named for a type.
