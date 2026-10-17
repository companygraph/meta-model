# A control names what covers its gap

A control often has a known gap, and another control holds it. In all three family instances, three controls already say so, but in prose: "what holds an agent's tag to the Owner's word is An agent's permissions refuse a merge it was not given". That name sits in a sentence, so nothing resolves it, and a rename of the covering control leaves three sentences stale in each instance without any check failing. This spec gives a control a field naming the controls that hold its gap, keeps the gap itself in the page's prose, and adds the instance check that holds the one norm the field carries across pages.

Status: decided by the owner on October 17, 2026, question by question: the field sits on the control with the gap and is named `compensated-by`; the page's prose states the gap and the field carries the name, so the name is written once; and the norm that a covering control answers to what the covered one is for is an instance check, not a writing rule.

## Where this comes from

Anthropic's AI-Native SDLC Playbook, read on October 16, 2026, separates an advisory control from the deterministic one behind it: "The skill makes violations rare and the hook makes them close to impossible." Read against it, the controls of the three instances showed that the split it draws, advisory or blocking, is already stated where it matters: 9 of the 21 controls in companygraph/mental-model, by the specifier's reading, say in their own prose who gets past them, an admin, anyone who gives a reason, `--force`, a commit trailer or an agent under the Owner's account. Those vary too much for an enum and read well as prose.

What does not read well as prose is one control naming another. In robertblust/mental-model, companygraph/mental-model and guestgraph/mental-model, the same three controls each close with the name of the control that holds their gap:

| Control | The gap it states | The control it names |
| --- | --- | --- |
| Only the owner's account changes main | an agent working under the Owner's account passes it | An agent's permissions refuse a merge it was not given |
| A release tag stays where the owner put it | an agent working under the Owner's account passes it | An agent's permissions refuse a merge it was not given |
| A registry entry waits for a release tag and the owner | a repository admin may bypass the review, which is the Owner's account | An agent's permissions refuse a merge it was not given |

All four of those controls enforce one rule in each instance, "The Owner's word merges".

## The field

The control schema gains one optional field, after `performed-by`:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `compensated-by` | No | array of ref → control | The controls that hold a gap this one is known to leave, each the H1 of a file in `controls/`. Absent where no other control holds one. |

The field holds a gap, not the whole control: one control can state several gaps and name a covering control for only one of them, as robertblust/mental-model's "Only the owner's account changes main" does, whose second gap, a collaborator the Owner invites, nothing covers.

The `## Purpose` section gains one sentence after its first: "Where another control holds a gap this one is known to leave, the page says what it lets through and names that control in `compensated-by`."

## Not a standard's term

The control schema cites COSO and ISO for `kind` and `mode`, and this field cites nothing. "Compensating control" is a term in several standards, and none read for this spec means what the field means. NIST's glossary, read on October 17, 2026, defines compensating controls as "the security and privacy controls implemented in lieu of the controls in the baselines described in NIST Special Publication 800-53 that provide equivalent or comparable protection" (SP 800-37 Rev. 2; SP 800-53 Rev. 5 says the same of the baselines in SP 800-53B): a replacement for a control not implemented, not a second control holding the gap of one that is. PCAOB AS 2201 is said to use it when an auditor weighs a deficiency already found, and PCI DSS for a requirement an entity cannot meet as stated; neither text could be read at source for this spec, pcaobus.org refusing the request, and neither could COSO's, which is sold. The name stays, because in plain English it says what the field does, and the description says the rest.

NIST's definition asks that the compensating control give "equivalent or comparable protection", which is to say that it serves the objective of the control it stands for. That condition, a risk or a rule the two share, is what the check below holds.

## Writing rules

Two rules join the control schema's writing rules, each judged from one page:

- `compensated-by` names a control only where `## How it is carried out` says which gap of this control the named control is to hold, and that sentence does not repeat the name the field holds.
- `compensated-by` never names the control itself.

The first leaves every other name in the prose alone: an instance that writes "the pull request and the checks are what Main takes a change only through a green, current pull request holds" names a control for a reason of its own, and keeps it. Whether the named control really holds the gap is the person's who approves the change; the share of objective is the check's.

## The check

A covering control holds a gap only toward what the covered control is for. Whether it does needs both pages, so by the settled rule it is a check and not a sentence.

**A control named in `compensated-by` shares a risk or a rule with the control that names it:** at least one entry of its `mitigates` is in the naming page's `mitigates`, or at least one entry of its `enforces` is in the naming page's `enforces`. It is found as the rule type's `binds` is, from a property on the type's row, so no type is named in the check's code:

```js
{ type: "control", folder: "controls", compensated: { field: "compensated-by", shares: ["mitigates", "enforces"] } },
```

`TypeEntry` gains the property in its JSDoc, and `types/` is built from it and committed. The check cites R16. A name in the field that resolves to nothing is R4's finding, and this check skips it. Its failure reads, for a page and a name: `` `compensated-by` names "<name>", which shares no risk in `mitigates` and no rule in `enforces` with this control; a control holds the gap of another only toward what that one is for (R16) ``.

A control naming itself shares everything with itself and passes the check; the writing rule refuses it. Two controls naming each other pass too, on purpose: two controls can each hold the other's gap, and an acyclic check would refuse that.

The September 30 spec says "Every arrow runs from the more specific page to the more general, and none runs back" and "Each relation once, on the more specific side". A control's `compensated-by` runs between two pages of one type, neither more specific than the other, and it is written on the side whose gap it is, once. The September 30 spec's paragraph on each relation gains one sentence saying so and naming this spec.

## The example

The example instance gets the edge, so the checks and the MCP server's tests see it.

"Main requires a review" gains, in `## How it is carried out`, the sentence that a repository admin can merge past the protection, which then holds nothing for that change, and `compensated-by: An unapproved merge is read before the next release`.

A new control, "An unapproved merge is read before the next release":

- `kind: detective`, `mode: manual`, `performed-by: Reviewer`.
- `mitigates: An unreviewed change reaches customers` and `enforces: A change is reviewed before it ships`, the risk and the rule "Main requires a review" names, so it shares both.
- `## How it is carried out`: before Release, the Reviewer lists the pull requests merged to the default branch without an approving review from someone other than their author, from the repository host's pull request reviews, and reads each against what was asked.
- `## Applies to`: the Release phase of Delivery.

Its name carries no stem of "review" on purpose. mcp-server's search test fixes the words-mode name tier for "Reviewer" to one control, one KPI, one rule and one seat; a second control whose name stems to "review" would turn that suite red when it re-pins this release, and the family resync would hold everything downstream of it.

Review Escapes keeps its `assesses`: its number counts the merges, not whether they were read afterward.

## The instances

Each instance takes the field after the owner's resync carries this release to it, in a pull request of its own, each entry put to the owner before it is committed. The move is not mechanical, and the spec says which controls move:

- "Only the owner's account changes main" moves in all three: its gap is an agent merging under the Owner's account, the covering control claims exactly that, and both enforce "The Owner's word merges". The control's prose keeps the gap and drops the name.
- "A release tag stays where the owner put it" and "A registry entry waits for a release tag and the owner" stay in prose for now. Their gaps are a tag and an environment approval, and the covering control claims a merge and records a refused merge only. Naming it in the field would claim what its page does not. They move once the covering control's page records the permission layer refusing such an action, observed and not inferred, and its H1 and tagline say the wider claim; the field then makes that rename resolve rather than leave a sentence behind.
- "Main takes a change only through a green, current pull request" states that a repository admin can bypass it and stays without the field: nothing holds that gap before the fact, and Merges Past Their Checks assesses it after.

## Release

The next minor of core and of the package. The field is optional and the check reads only pages that carry it, which no instance has before it takes this release, so nothing an instance holds breaks and taking it asks for a re-sync and nothing else. The notes name the field, the check and the two writing rules.

## Tests

In `verify/rule-risk-control.test.mjs`, beside the existing control tests:

- A control whose `compensated-by` names another control sharing a rule passes; one sharing only a risk passes.
- A control whose `compensated-by` names a control sharing neither fails once, with the check's message.
- A name in `compensated-by` that is a rule's H1, not a control's, fails R4 and not the new check.
- A control naming itself passes the mechanical checks; the writing rule refuses it.
- Two controls naming each other pass.

The example passes every instance check, `verify` holds the changed schema to its shape, the two writing rules open as the judge reads them, `npm run build:check` passes with the rebuilt `types/`, and every suite passes.

## Not part of this

- `mode` having no value for a control an agent carries out: in companygraph/mental-model 6 of the 21 controls rest on an agent's judgment, 3 marked manual and 3 automated. It is a change to an enum in core and a major, and it is the owner's to decide first.
- A `Hands to` column on a phase's `## If not met`, deferred by the September 27 spec and now with two cases in each instance.
- A field on the covering side, which would say the edge twice.
- Widening "An agent's permissions refuse a merge it was not given"; that is each instance's, on evidence.
