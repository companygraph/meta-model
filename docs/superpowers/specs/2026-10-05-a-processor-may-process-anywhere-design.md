# A processor may process anywhere

A data processor's `countries` names where it processes and stores the data, and one processor does not fit that: Anthropic runs a request in any geography it chooses unless the request names one, and stores what it keeps in the United States. The three instances that use it say so in its tagline, in prose, and its `countries` lists only the United States, so anything reading the field alone — the privacy page robertblust/design now draws from the model — shows the request as processed in one country. This spec adds one optional field, `processing`, so the model can say it.

Status: decided by the owner on October 5, 2026, as section 6 of robertblust/design's spec `2026-10-05-the-privacy-page-draws-the-model-design.md`, which the owner approved.

## The field

`processing`, optional, an enum: `fixed` or `any`. `fixed`, which an absent field means, says the processor processes the data where `countries` says. `any` says it may process a request in any country it chooses, and `countries` then names where it stores what it keeps. A writing rule holds `any` to what the processor's own terms say and asks the tagline to say it in words.

## Why a field and not the tagline

The privacy page is generated, and a generator that reads "any country" out of a tagline guesses at prose; a field is read the same way by every reader, the checks among them. An enum rather than a boolean leaves room for a third reading, a set of regions a request may run in, without renaming the field.

## What it costs

A core minor: the schema gains one row and one writing rule, and nothing else in core changes. An instance that takes it and leaves the field out reads as before. The three instances set `processing: any` on Anthropic, each in an entry of its own after their re-pin.

## Out of scope

A field for the regions a processor's request may run in; no processor in the family offers a choice between more than one country and any.
