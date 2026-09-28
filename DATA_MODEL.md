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

Markdown documents are logically continuous but may store their Markdown source as an ordered sequence of independently persisted chunks rather than one giant value. PDF/image documents reference self-contained story assets.

### MarkdownChunk

Conceptual fields:

- id (stable)
- documentId
- order/key used to reconstruct the document
- Markdown source for this chunk
- optional structural/index metadata
- createdAt
- updatedAt

Chunk boundaries are internal implementation details and must occur at safe Markdown block boundaries. Rebalancing/splitting/merging chunks must preserve document order and update dependent anchors transactionally.

A document may maintain derived indexes for headings, full-document search and content metrics so these operations do not require mounting every chunk in the editor. Derived indexes must be rebuildable from authoritative Markdown content.

## Bookmark

- id
- documentId
- label
- color
- location

Markdown location should use a resilient anchor such as `chunkId` + stable block/anchor identity + local offset/affinity, rather than a document-wide raw character offset. Anchors must survive edits in unrelated chunks and support loading an unloaded target on demand. PDF location contains page and positional information.

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
