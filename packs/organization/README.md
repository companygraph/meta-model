# CompanyGraph — the organization pack

> Vocabulary for a company of more than one person: its units, the teams it draws from them, and the two lines that run through them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack organization`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `group` | A unit of the company, or a team drawn from its units | nothing |
| `group-kind` | What kind of group a company has, and whether it stands in the disciplinary line | nothing |
| `job` | What a person is employed as, the same wherever they sit, and the seats a person in it usually holds | nothing |

A person sits in a unit in a job, in a row of the unit's `## People`, and the disciplinary line runs through those people: each answers to the person whose `Place` is `Lead`, and up through `part-of`. The professional line is a group's `guides`, which names jobs wherever the people who do them sit. A group says which positions it is looking to fill in its `## Openings`, a staff unit is a group of a kind with `staff: yes` and stands in the line beside the head it serves, and a group's `rank` is its place in the company's own order.

## Sources

| What | URL |
| --- | --- |
| W3C, The Organization Ontology | https://www.w3.org/TR/vocab-org/ |
| schema.org, department | https://schema.org/department |
| SAP, Organizational Management in SAP HCM | https://learning.sap.com/courses/organizational-management-in-sap-hcm-for-s-4hana/finding-object-relationships |
| SAP, Vacancy (infotype 1007) | https://help.sap.com/saphelp_em92/helpdata/en/4e/ebee1a11324e70e10000000a42189d/content.htm |
| SAP, Department/Staff (infotype 1003) | https://help.sap.com/saphelp_em92/helpdata/en/4e/ebef1a11394e6fe10000000a42189d/content.htm |
| SAP, Structure display ordering | https://help.sap.com/saphelp_470/helpdata/en/bb/bdba94575911d189240000e8323d3a/content.htm |
| HR-XML 3.1, ReportsToPositionType | https://schemas.liquid-technologies.com/HR-XML/3.1/reportstopositiontype.html |
| Gabler Wirtschaftslexikon, Einliniensystem | https://wirtschaftslexikon.gabler.de/definition/einliniensystem-32337 |
| Gabler Wirtschaftslexikon, Mehrliniensystem | https://wirtschaftslexikon.gabler.de/definition/mehrliniensystem-41223 |
| Gabler Wirtschaftslexikon, Stelle | https://wirtschaftslexikon.gabler.de/definition/stelle-42791 |
| Gabler Wirtschaftslexikon, Stab | https://wirtschaftslexikon.gabler.de/definition/stab-45274 |
| Kliemt, Der Betrieb in der Matrix-Struktur | https://kliemt.blog/2016/07/06/der-betrieb-in-der-matrix-struktur/ |
| Workday, Staffing models | https://doc.workday.com/admin-guide/en-us/human-capital-management/staffing/staffing-models/ivu1483299086459.html |
| Oracle, Reorder nodes with a custom order | https://docs.oracle.com/cloud/latest/enterprise-data-management-cloud/DMCAA/reorder_node_100x1d7f4feb.htm |

## Where it departs from its sources

- The two lines are named by the right each carries, disciplinary and professional, and the phrase "functional line", which practice uses for both, is used for neither.
- Two lines where the Organization Ontology has one `reportsTo`, as SAP, HR-XML and German practice keep the primary line apart from the one beside it.
- The lines run through the people a unit names and the units they sit in, and a person carries no field naming their superior.
- Core's seat is a responsibility in a process; the job is the pack's, because only a company of more than one person is structured around jobs. A position is a job in a group, and is a row of the group's `## People`, not a type.
- A temporary group has `start` and `end`, not a status.
- The type is `group` rather than organizational unit, because a team drawn across units is a group and not a unit; its kind tells the two apart.
- An open position is a row of `## Openings` while it is open, not a position object that outlives its holders as SAP's and Workday's do.
- The staff flag is on the group's kind, not on each unit as SAP sets it, and a staff person is one whose `Place` is `Staff`.
- Groups are ordered across the type, not among the children of one parent as SAP and Oracle order them.

## Left for later

Edges from a group to KPIs and processes; a transitive form of `part-of`; a check that a person in a job holds the seats the job names. An org chart is drawn by companygraph/mcp-server's `diagram` tool, shape `organization`.
