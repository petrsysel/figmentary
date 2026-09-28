# FigmentFell — Product Specification

## Product vision

FigmentFell is a polished offline desktop workspace for solo journaling role-playing games. It should feel less like an IDE or database and more like a quiet, luxurious digital writing desk.

The core problem is speed: physical journaling RPGs can be atmospheric, but handwriting and managing physical components can lag behind the player's imagination. FigmentFell keeps the tactile atmosphere while making writing, lookup and game-state management fast.

## Product principles

1. **Local and private.** No accounts, cloud backend, telemetry, analytics or crash reporting. User data stays on the user's machine.
2. **System-agnostic.** Do not ship an Apothecaria-specific or other game-specific preset. Users build/import templates.
3. **Atmosphere matters.** Texture, typography, sound, animation, cards, dice and book presentation are functional parts of the experience.
4. **Fast writing first.** The journal/editor must never feel slower than the player's thoughts.
5. **User-owned files.** Stories, templates, themes and decks are portable files that can be shared manually.
6. **Flexible workspace.** Do not impose semantic concepts such as “rules pane” and “journal pane” when generic document panes solve the problem.
7. **Polished constraints over infinite customization.** Prefer curated textures, ornaments, fonts, card backs and tools over arbitrary CSS or editor-like complexity.
8. **Design features are first-class.** Theme, localization, accessibility and keyboard workflows are architecture requirements, not post-MVP cleanup.

## Library

On launch, show a short splash (roughly 1–1.5 s) with a slowly appearing FigmentFell identity on a muted dark-blue subtly textured background. Avoid a spinner unless startup genuinely requires waiting.

The library supports two views from the beginning:

- Cover View
- Shelf View

Each story is represented as a generated book. Cover appearance is parameterized by material/texture, border color, inner color, text color and decoration style/color. Shelf spines derive from the same parameters.

Book thickness in Shelf View reflects the amount of user-created story content, not raw file size. Use a dampened/logarithmic mapping. Markdown and drawings count strongly; attached reference PDFs count little or not at all.

Library actions: open, rename, duplicate, export portable story file and delete. Import is a separate action. Sort primarily by last opened.

## Stories and templates

New Story offers Blank Story plus installed user templates. With no templates installed, Blank Story remains sufficient.

Any open story can be saved as a template from the story menu. The user explicitly chooses which content is included:

- documents/tabs (Markdown, PDF, images)
- tools and their definitions/defaults
- appearance/theme
- workspace layout

A template stores configuration/default state, not played state. Decks store their definition/default composition, not current draw/discard/table state. Trackers may define a chosen default value.

Templates are portable `.fftemplate` files.

## Main workspace

The primary layout is three resizable vertical regions:

`Document Panel | Document Panel | Tools Panel`

All regions can collapse. Split sizes and collapsed state persist per story.

Both document panels are identical. Each supports multiple tabs containing Markdown, PDF or images. Tabs can be reordered and dragged between panels. FigmentFell must not impose “rules” versus “journal” semantics.

The Tools panel is one vertically scrollable workspace containing user-arranged widget instances. Widgets can be added, removed, collapsed and reordered; relevant widgets can also have persistent custom heights.

## Markdown documents

The intended journal model is a long Markdown document, although users may create multiple documents/tabs.

Editing should feel Notion-like: Markdown syntax produces rich rendered structure and markup characters do not need to remain visually exposed. Markdown remains the durable textual storage format wherever practical.

Required capabilities include rich Markdown editing, headings/outline, current-document search, arbitrary bookmarks, images, drawings, undo/redo and keyboard-first commands.

Hundreds of pages of Markdown must remain responsive. Do not implement an editor architecture that serializes/re-renders the entire document on every keystroke.

## PDF and image documents

PDF tabs support viewing, zoom, search with next/previous and result count, and arbitrary bookmarks. PDF bookmark positions include page and position.

Image tabs provide a clean viewer appropriate to reference maps, illustrations and similar material.

Imported attachments are copied into the story container so the story remains portable and self-contained.

## Bookmarks and navigation

Bookmarks are independent from Markdown headings. A bookmark has a name/tag and color and appears as a colored edge marker. Hover reveals its label; click jumps to the location.

Maintain browser-like navigation history for jumps within documents. Default shortcut: Alt+Left / Alt+Right.

## Trackers

Tracker properties:

- name
- icon
- optional color
- current numeric value
- optional minimum/maximum
- configurable default value for templates

Provide +/- controls and direct numeric editing. Respect range bounds. An unbounded tracker permits arbitrary numeric values.

For small ranges (approximately 15 steps or fewer), visually represent progress with discrete markers; direct numeric editing must remain available.

## Inventories

A story can contain multiple named inventory widgets such as Backpack, Horse or Household.

Inventory item properties: name, quantity and optional long description. Show name prominently, quantity clearly, and a single-line italic description preview with full text available on hover/focus.

Quantity can be changed via +/- or direct entry and cannot fall below zero. At zero the item remains and becomes visually subdued; never auto-delete it.

Support manual reordering, drag/drop between visible inventories, and `Move to…` for other inventories. Context actions include Edit, Move to…, Duplicate and Delete. Sorting is an explicit action only; never silently reorder items.

## Dice

Provide a polished fixed classic set: d4, d6, d8, d10, d12, d20 and d100.

The Dice widget is a tray where any number of these dice can be added. Roll all, or click an individual die to reroll it. Show individual results and total. Use brief physical movement/rotation and a dice-on-wood sound.

Do not prioritize arbitrary dN dice; visual quality of known shapes is preferred.

## Decks and cards

Ship a classic 52-card deck plus jokers as a default option. Support multiple independent deck instances per story and user-created/imported decks.

A deck definition contains cards, copy counts, default configuration and a chosen card back. Provide several polished built-in backs. Custom cards have a name, description and optional front image/design; without an image, render an elegant text card based on deck styling.

Decks are portable `.ffdeck` files.

Persistent runtime deck state has three conceptual areas:

`Draw pile -> Table -> Discard pile`

There is no Hand concept. Table is a freeform surface where cards can be positioned and overlapped. Its height is adjustable and persistent.

Support draw, drag/drop, discard, return to deck, shuffle draw pile, peek top card, draw N, search the current draw pile, and explicit Reset Deck. Searching/selecting a card from the draw pile actually removes it from the pile and places it on the table.

Deck state must reopen exactly as left.

## Sketchbook

Drawing happens in a dedicated canvas opened via Insert Drawing or command palette, not directly over a document.

Keep it a sketchbook, not an image editor. Required tools:

- round pen
- directional calligraphic nib
- textured pencil
- organic ink pen
- eraser
- color
- stroke width
- undo/redo

Use pressure input when available while remaining usable with a mouse. No layers, fill, selection, text or transformations are required.

On completion, insert the drawing into Markdown as an image while retaining editable source/stroke data so it can be reopened and edited later.

## Themes

Themes are arbitrary appearance definitions; do not encode a dark/light binary.

There is a global default theme and an optional per-story custom theme/override. Themes are portable `.fftheme` files.

Theme controls include workspace background, panel background, document background, toolbar/menu, primary and secondary text, accent, borders/decorations, selection/highlight, curated texture and texture intensity, and ornament style.

Drawing colors are independent of the theme.

Ship several cohesive themes from the beginning, including a muted dark-blue fabric-like default, plus lighter and warmer alternatives.

## Localization

Internationalization is required from the first commit. Do not hardcode user-facing strings in components.

Ship complete English and Czech initially. English is the fallback locale.

Community locale JSON files can be placed in the Locales directory. Metadata includes locale code, native name, English name, authors and whether it is a community translation. Credits automatically surface locale contributors.

Use Unicode throughout.

## Settings

Settings areas:

- General
- Appearance
- Sound
- Editor
- Files
- Language
- Shortcuts
- About & Credits

Keyboard shortcuts are remappable and resettable. Core defaults include Ctrl+F, Ctrl+S, Ctrl+Shift+P, Ctrl+Z and conventional platform equivalents where appropriate.

Accessibility includes Reduce Motion, mute controls, UI scale and high-contrast support. Theme editing should warn about problematic contrast rather than silently preventing customization.

UI scale is independent of document/PDF zoom. Target roughly 80–150% UI scaling.

Sound settings are global. Typewriter sounds are optional and OFF by default; do not create a special per-story sound-settings concept solely for this feature.

## Sound

Sound is part of the product identity but must remain subtle. Examples:

- tab switch: soft paper rustle
- tracker +/-: gentle mechanical click
- dice: dice on wood
- draw card: sliding card/paper
- shuffle: card shuffle
- open story: subtle book-opening sound

No typing sound by default. Optional Typewriter Sounds may use multiple varied key samples plus an Enter/carriage-return sound.

Provide master volume/mute and sensible category controls such as UI Sounds, Cards & Dice and Typewriter Sounds.

## Command palette

Ctrl+Shift+P opens a command palette. It is a primary mechanism for keeping the interface visually quiet while retaining discoverability.

Commands may include Add Bookmark, Insert Image, Open Drawing Canvas, Add Tracker, Edit Theme, Draw Card and similar actions. Show associated keyboard shortcuts.

## Saving, recovery and history

Autosave continuously. Ctrl+S forces an immediate flush and briefly confirms `Saved`. Do not display a permanent `Saved ✓` status. Save failures must be prominent.

Automatic history is not a manual version-control feature. Create recovery/history points around meaningful boundaries: before first change after opening, periodically during long changed sessions, on clean close if changed, and before destructive operations. Use rotating retention.

Before restoring an older snapshot, snapshot the current state.

Crash recovery is distinct from history. Detect unclean shutdown and offer recovery. Normal autosave should limit potential loss to seconds, not minutes.

## Files and directories

Managed user directories:

- Stories
- Templates
- Themes
- Decks
- Locales
- Backups

Settings can reveal/open these folders and change their locations.

Opening/importing a FigmentFell story from elsewhere copies/imports it into the managed Stories library rather than editing the external source in place.

## PDF export

Export selected Markdown documents as a properly typeset PDF/book. The user chooses documents and order.

Options include A4/A5/Letter, page numbers, cover page, bookmarks as table of contents, font selection and related print settings.

Modes:

- Themed — subtle theme colors, ornamentation and paper texture
- Clean — white paper, strong typography and restrained color
- Ink Saver — white background, black/gray text and no decorative backgrounds/color blocks

Ink Saver may optionally preserve color images or convert them to grayscale. Drawings remain included.

## Explicit non-goals

Do not add accounts, collaboration, cloud sync, telemetry, analytics, crash reporting, a backend service, a game-specific rules engine, arbitrary CSS themes, a Photoshop-like drawing editor or an Electron runtime.
