# A profile carries an image

A card that names a person shows their name and their tagline and nothing a reader recognizes them by. A profile gains an optional image, a JPEG or PNG beside the profile's own file, named from its frontmatter; the card draws it as an avatar, blust.ch gives it to search engines as the person's image, both MCP servers return where it is served and the Obsidian plugin shows it and holds it to its limits.

Status: decided by the owner on September 21, 2026, one question at a time. Of three approaches — a new member of the type vocabulary with its form fixed in the conventions, a type whose bounds each field declares, or a plain string checked by a profile-specific rule — the owner chose the first. The second is generality nothing asks for yet, and the third is a check that names a type, which the checker has stopped doing.

## The type

R9's closed vocabulary gains `image`, and CONVENTIONS states its form where it states the form of `date`, because a member whose meaning lived in the Description of whichever field used it would not be closed.

An `image` value is a file name with no path: the file sits in the same folder as the page that names it. For a profile that folder is `profiles/<profile>/`, which R6 already makes a folder because the profile owns its experiences, so the image is removed with the person in the same one operation. A name with a `/` in it is an error, because a path reaching into another entity's folder is a reference by location, and R3 references by name.

The file is `.jpg`, `.jpeg` or `.png`, lowercase, and its first bytes are the signature of what the extension says: `FF D8 FF` for JPEG, `89 50 4E 47 0D 0A 1A 0A` for PNG. A renamed file is caught here rather than by a browser that shows nothing.

**The image is square, between 256 and 1024 pixels on a side, and at most 300 KB (307,200 bytes).** Square because every place that draws it draws a circle, and a circle cut from a rectangle cuts whichever face is off-center. The floor is what a high-density screen needs for an avatar drawn at 64 CSS pixels with room to spare; the ceiling and the byte cap keep a page that inlines nothing from loading a photograph. 512 by 512 is the size recommended, and the profile schema's Description says so; a larger image inside the bounds, the owner's own at 1000 by 1000 and 156 KB among them, passes as it is.

`image` is a frontmatter type. A column typed `image` is an error in the schema, because a row of a table is a fact about the things it joins and has no folder of its own for a file to sit in.

By R16 an `image` field draws no edge and resolves to nothing; its value is a fact, a file name, and reaches a reader as one.

An image file in the model container that no `image` field names is an error. The container holds pages and what pages name, and a file nothing names is one no build copies and no reader reaches, left for the next person to wonder about.

## The profile schema

One row in the frontmatter table, after `location`:

```markdown
| `image` | No | image | The person's picture, a file in this profile's folder — square, 512×512 recommended, 256–1024 pixels on a side, at most 300 KB |
```

A writing rule: the image is the person, recognizably, as the tagline is their own voice — not a logo, not a team, not an illustration standing in for them. A profile whose nature is `agent` may carry one; what the picture shows is still what holds the profile, and the rule on claims does not reach it.

## Reading bytes

The checker, the parser and every site read an instance as a map of path to text, and today they read every file under `model/` as UTF-8. An image read that way is corrupted before any check sees it. So a reader keys on the extension: a `.jpg`, `.jpeg` or `.png` file is read as bytes, everything else as text as now. The checker's command reads from disk; a site's `build/read.mjs` reads from disk or from GitHub, and on GitHub fetches the raw file as an array buffer. The parser skips every file that is not Markdown already and is unchanged in that respect.

The image check reads width and height from the header: a PNG's IHDR chunk, a JPEG's first start-of-frame marker. No dependency is added for it, because both are a few bytes at known places and the family's tooling has none it does not need.

## From the model to a page

The parser passes `image` through in `fields` like any other fact and adds nothing, so `model.json` is still exactly what the pinned commit parses to. The package gains one export beside `parseInstance`, `imagesOf(files, data, { sub, schemas })`, returning for each entity that names an image its id, the field, the path it was read from, where a site puts it and the bytes. It finds image fields in the schemas it is given, as R16 has every field's meaning read, and throws on a named file that is missing or was read as text, because a build that went on would publish a page pointing at nothing. Every consumer already depends on the package, so the one place that knows how a field's value becomes a file is the parser's repository, as R16 wants.

A site copies each image into `images/<entity-id>.<ext>` at `npm run model` — `images/profiles/robert-blust.jpg`, since an id carries its type's folder — and `npm run model:check` fails when a copy differs from what the pin holds or when a copy stands that no entity names. The site serves the file itself: the image is pinned exactly as the model is, and a visitor's browser asks no third party for it, so the privacy page stays true without a new sentence. The entity id and not the file name is the published name, because ids are unique across the model and file names are unique only within a folder. The folder is `images/` and not `avatars/` because the type is `image`: a later type that carries one lands beside the profiles without a folder that misnames it.

## The card

`rbCard.render` draws the avatar when the entity has `fields.image` and the page passed `images`, the base the site's `images/` folder sits at, in the options it already passes. The avatar is an `img` in a head row with the name, round, 64 CSS pixels, `alt` the entity's name, `loading="lazy"`, width and height set so nothing shifts when it arrives. `image` joins `source` and `skills` as a field the card does not list, because a file name drawn under the picture it names says nothing. A page that passes no `images` draws the card as today, which is what lets a re-pin land before a site has its copy step.

## Beyond the card

blust.ch writes `image` on the `#person` node of its JSON-LD, the absolute address of its copy, from the model and on every page that carries the node. The node is identical wherever its `@id` appears, and writing the field from the one generator every page already uses keeps it so. mcp-blust-ch's own `jsonld.json` carries the same field on its node.

Both MCP servers return an `image_url` beside the fields of an entity that names an image: the site's address, `https://<site>/images/<entity-id>.<ext>`. Each deployment's `deployment.json` gains a `site` field giving its origin, because a server serves one model and the site that publishes that model's images is a fact about the deployment, not the model.

The Obsidian plugin shows the avatar at the head of a profile's view, read from the vault, and its meta-model compliance checks report an image outside its bounds as the checker does, by reading the vault's bytes through the same check.

## What it costs

`shape` stays 3. The vocabulary is held only by this repository's own `verify`, on its own core; the parser reads a Type cell it does not know as a fact, and no instance check, server or plugin holds a vendored schema to the list, so tooling that reads 0.37.0 reads this. An instance that uses the field has to take the new checker anyway, because the old one fails an image in a profile's folder as a file the profile does not own. The release is a minor for every consumer, because re-pinning is all it asks of them — a site that re-pins and has no copy step passes no `images`, and the card is the card it was. The copy step, the JSON-LD field, the servers' `image_url` and the plugin's avatar are each their own pull request after the release.

A test holds the type both ways on the example: an image beside a profile that is square and in bounds passes, and one each of a rectangle, a PNG named `.jpg`, a file under 256 pixels, one over 300 KB, a name with a slash, a column typed `image` and an unreferenced image fails with the rule it breaks. The example profile carries a small image, so that the example shows the field it declares.

## The order

meta-model first: the vocabulary, the profile schema, the byte reader, the check, `imagesOf`, the example and the tests, released as a minor. Then mental-model upgrades to the release and its profile gains the image and the field. Then design's card and its `images` option. Then the three sites re-pin and blust.ch adds its copy step and the JSON-LD field; companygraph.io and guestgraph.io add the copy step only when a profile of theirs carries an image. Then mcp-server's `image_url` and the two deployments' `site` field. Then the plugin. Each is its own pull request, and each waits for the owner's word to merge.
