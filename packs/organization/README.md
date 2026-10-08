# CompanyGraph — the organization pack

> Vocabulary for a company of more than one person: its units, the teams it draws from them, and the two lines that run through them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack organization`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `group` | A unit of the company, or a team drawn from its units | nothing |
| `group-kind` | What kind of group a company has, and whether it stands in the disciplinary line | nothing |
| `job` | What a person is employed as, the same wherever they sit, and the seats a person in it usually holds | nothing |

A person sits in a unit in a job, in a row of the unit's `## People`, and the disciplinary line runs through those people: each answers to the person whose `Place` is `Lead`, and up through `part-of`. The professional line is a group's `guides`, which names jobs wherever the people who do them sit.

## Sources

| What | URL |
| --- | --- |
| W3C, The Organization Ontology | https://www.w3.org/TR/vocab-org/ |
| schema.org, department | https://schema.org/department |
| SAP, Organizational Management in SAP HCM | https://learning.sap.com/courses/organizational-management-in-sap-hcm-for-s-4hana/finding-object-relationships |
| HR-XML 3.1, ReportsToPositionType | https://schemas.liquid-technologies.com/HR-XML/3.1/reportstopositiontype.html |
| Gabler Wirtschaftslexikon, Einliniensystem | https://wirtschaftslexikon.gabler.de/definition/einliniensystem-32337 |
| Gabler Wirtschaftslexikon, Mehrliniensystem | https://wirtschaftslexikon.gabler.de/definition/mehrliniensystem-41223 |
| Gabler Wirtschaftslexikon, Stelle | https://wirtschaftslexikon.gabler.de/definition/stelle-42791 |
| Kliemt, Der Betrieb in der Matrix-Struktur | https://kliemt.blog/2016/07/06/der-betrieb-in-der-matrix-struktur/ |

## Where it departs from its sources

- The two lines are named by the right each carries, disciplinary and professional, and the phrase "functional line", which practice uses for both, is used for neither.
- Two lines where the Organization Ontology has one `reportsTo`, as SAP, HR-XML and German practice keep the primary line apart from the one beside it.
- The lines run through the people a unit names and the units they sit in, and a person carries no field naming their superior.
- Core's role is a seat, a responsibility in a process; the job is the pack's, because only a company of more than one person is structured around jobs. A position is a job in a group, and is a row of the group's `## People`, not a type.
- A temporary group has `start` and `end`, not a status.
- The type is `group` rather than organizational unit, because a team drawn across units is a group and not a unit; its kind tells the two apart.

## Left for later

Renaming core's `role` to `seat`, a separate and breaking change; a position type, and with it a vacant position; staff units beside a line; edges from a group to KPIs and processes; a transitive form of `part-of`; a rendered org chart.
