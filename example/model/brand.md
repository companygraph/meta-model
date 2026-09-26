---
source: Local
---

# Beacon

> An invoice carrying this name can be read without calling us, and everything else we put the name on is held to the same test.

## Mark

The mark is a lit beacon, a bar with a flame above it, set in the accent color on the ground, and its master is `mark.svg` in the design repository; every render, on an invoice, on the console, on a tile a host is handed, is made from that file and never redrawn.

- The flame is never separated from the bar: the bar is what the light stands on.
- Clear space around the mark is the height of the bar on every side.
- The mark sits on the ground color or on white, and on nothing else.
- Where a render carries values other than the tokens', the tokens are the master and the render follows.

## Color

| Name | Means | Never |
| --- | --- | --- |
| `ground` | The page: what everything else sits on | A fill on anything that is not the page |
| `ink` | What is read: body text and the figures on an invoice | A decorative element |
| `accent` | What can be acted on: a link, a button, the mark | A figure, which would read as clickable |
| `signal` | Something the reader has to see before going on: a correction, a dispute | Emphasis on a sentence that is merely important |

## Typography

| Face | Job |
| --- | --- |
| Source Sans | Prose: the console and every page |
| Source Code | Figures: every amount on an invoice and every identifier, so a column lines up |

## Voice

| Trait | Means | Never |
| --- | --- | --- |
| Plain | We say what a charge is in the words the customer used when they agreed to it | A term the contract does not use |
| Shown | We claim what the invoice shows, and the invoice shows how each number was reached | A total with no line under it |
| Owned | We say what we got wrong before we say what we fixed | A correction written as if nothing had been wrong |
| Short | We write the sentence a customer reads on a phone at the end of a month | A paragraph where a line would do |

## References

| What | URL |
| --- | --- |
| Design tokens | https://github.example.invalid/beacon-systems/design/blob/main/tokens.json |
| Mark | https://github.example.invalid/beacon-systems/design/blob/main/mark.svg |
| Rulebook of the voice | https://github.example.invalid/beacon-systems/handbook/blob/main/writing.md |
