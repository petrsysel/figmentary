# FigmentFell — Conceptual Data Model

This is a conceptual schema, not a required SQL schema. Implementation may normalize/partition data differently while preserving semantics and stable IDs.

## Story

- id
- formatVersion
- title
- createdAt
- updatedAt
- lastOpenedAt
- coverDefinition
- appearance/theme configuration
- workspace layout
- documents
- bookmarks
- drawings/assets
- widget instances
- story metadata

## CoverDefinition

- texture/material ID
- border/outer color
- inner color
- text color
- decoration style ID
- decoration color

Shelf thickness is derived from content metrics and is not authoritative user data.

## WorkspaceLayout

- leftDocumentPanel width/collapsed
- rightDocumentPanel width/collapsed
- toolsPanel width/collapsed
- left tab IDs/order/active tab
- right tab IDs/order/active tab
- widget order

## Document

Common:

- id
- type: markdown | pdf | image
- title
- createdAt
- updatedAt
- asset/content reference

Markdown documents store one durable Markdown source and open in one continuous Milkdown/ProseMirror editor instance. Derived indexes for headings, full-document search and content metrics are rebuildable from authoritative Markdown content. PDF/image documents reference self-contained story assets.

## Bookmark

- id
- documentId
- label
- color
- location

Markdown location should use a resilient document anchor, such as a structural context plus local text/offset/affinity, rather than only a raw character offset. It must survive unrelated edits where feasible. PDF location contains page and positional information.

## Long-document guidance state

Per Markdown document:

- last guidance threshold shown or dismissed
- optional word-count snapshot at dismissal

This state prevents the continuation guidance from reappearing on every subsequent edit. It does not impose a maximum size or alter document content.

## Drawing

- id
- rendered asset reference
- editable stroke/vector source
- dimensions
- createdAt
- updatedAt

## WidgetInstance

Common:

- id
- type
- title
- order
- collapsed
- optional height
- type-specific config/state

### Tracker

- name
- icon
- optional color
- value
- optional min
- optional max
- defaultValue

### Inventory

- name
- ordered item IDs

Inventory item:

- id
- name
- quantity >= 0
- optional description

### DiceTray

- ordered dice instances
- each die type in: d4, d6, d8, d10, d12, d20, d100
- latest result where relevant

### DeckInstance

- deck definition/snapshot
- selected back
- runtime draw pile: ordered card-instance IDs
- runtime discard pile: ordered card-instance IDs
- runtime table entries with position/z-order/orientation as needed
- table height

## DeckDefinition

- id
- name
- formatVersion
- card definitions
- composition/copy counts
- default back/style
- default/reset behavior

Card definition:

- id
- name
- optional description
- optional front asset/design
- style metadata where required

A runtime card instance has its own stable identity so duplicate copies can be tracked independently.

## Theme

- formatVersion
- id/name
- semantic color tokens
- texture ID + intensity
- ornament ID + relevant settings
- UI font ID
- document font ID

Only known/validated values and curated resource IDs are accepted.

## Template

A `.fftemplate` represents selected reusable portions of a story. It contains explicit inclusion metadata plus copied/default forms of selected documents, tools, appearance and layout.

It must not accidentally include runtime play state merely because that state exists in the source story.

## Locale JSON

Conceptual shape:

```json
{
  "meta": {
    "locale": "cs-CZ",
    "name": "Čeština",
    "englishName": "Czech",
    "authors": ["Contributor Name"],
    "community": true
  },
  "translations": {
    "story.new": "Nový příběh"
  }
}
```

Built-in locales may set `community` to false.

## Application settings

Global settings are separate from story data. Categories include:

- selected global theme
- language
- UI scale
- reduce motion
- sound master/category volumes and mute
- typewriter enabled
- editor preferences
- managed directory locations
- keyboard shortcut map

Do not store global sound settings per story.

## Portable file extensions

- `.ffstory` — complete story/save
- `.fftemplate` — reusable story template
- `.fftheme` — structured theme
- `.ffdeck` — deck definition/assets
- `*.json` — community locale

Every proprietary format must include an explicit `formatVersion` and support migrations. Unknown newer versions must fail safely with a useful message rather than attempting destructive writes.
