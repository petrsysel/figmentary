# FigmentFell — Implementation Roadmap

This roadmap is ordered to retire architectural risk early while keeping the product's intended polish in scope. It is not permission to permanently defer design, accessibility, localization or atmosphere.

## Phase 0 — Technical proofs

Before building broad UI, prove the riskiest assumptions:

1. Tauri 2 + React/TypeScript shell and native command boundary.
2. Rich Markdown editor proof with a very large synthetic journal (hundreds to thousands of pages). Prototype stable block-aware chunking, opening near the last position/end, incremental loading while scrolling, unloading/virtualizing distant content, cross-chunk editing behavior, Markdown round-trip and image/custom-node strategy. Explicitly determine whether Milkdown/ProseMirror can support the required continuous-document UX without mounting the whole journal; change the editor integration strategy if it cannot.
3. PDF.js proof with a large local PDF accessed through the intended native/container mechanism; validate search and efficient loading.
4. `.ffstory` persistence proof using SQLite/custom extension; validate independent chunk reads/writes and rebalancing while hundreds of MB of attachments exist. One keystroke must not rewrite the full Markdown document or unrelated chunks/assets.
5. Consistent backup/snapshot and recovery proof.

Exit gate: no architecture may require rewriting/loading an entire large story or entire long Markdown journal for ordinary text edits. Search/bookmarks/navigation/export must still operate across unloaded chunks, and the user-facing document must remain continuous.

## Phase 1 — Foundations

Establish:

- Tauri/React project structure
- typed native persistence API
- schema/version migration framework
- i18n infrastructure with English + Czech
- semantic design tokens/theme runtime
- global settings model
- command/shortcut registry
- error handling/logging local to the machine
- asset-license tracking

Do not hardcode visible strings or theme colors in feature components.

## Phase 2 — Library and story lifecycle

Build splash, Library Cover/Shelf views, generated books/spines, New Story, Import, Open, Rename, Duplicate, Export and Delete.

Implement managed Stories directory and story file association/import behavior.

Implement cover editor/parameters and logarithmic story-content thickness metric.

## Phase 3 — Workspace and documents

Build three-region resizable/collapsible workspace, generic document panels, tabs and cross-panel drag/drop.

Integrate Markdown, PDF and image tabs. Implement Ctrl+F behavior, bookmarks, outline and Alt+Left/Right navigation history.

Implement autosave, Ctrl+S flush feedback and visible save-failure state.

## Phase 4 — Core tools

Implement generic widget framework first, then:

- Trackers
- Inventories
- Dice tray

Validate reorder/collapse/resize persistence and keyboard accessibility.

## Phase 5 — Cards/decks

Implement deck definition/import/export, classic deck, built-in backs, deck instances and exact runtime state.

Implement freeform Table, draw/discard/return, shuffle, peek, Draw N, draw-pile search and Reset Deck.

Add restrained card motion and sound with Reduce Motion support.

## Phase 6 — Sketchbook

Implement stroke-based drawing model, core tools, pressure support where available, rendered asset generation and editable-source round-trip.

Integrate Insert Drawing/Edit Drawing with Markdown documents.

## Phase 7 — Themes, settings and polish

Complete theme editor, curated textures/ornaments/fonts and initial bundled themes. Complete settings sections, shortcut remapping/conflict handling, UI scaling, accessibility behavior and full sound controls/typewriter option.

This phase completes systems whose architecture began earlier; it must not introduce theme/i18n/accessibility as retrofits.

## Phase 8 — Templates and sharing

Implement Save as Template with explicit inclusion UI, template library/import/export and correct conversion of runtime state to defaults.

Complete `.fftheme` and `.ffdeck` sharing workflows and locale-folder discovery/validation.

## Phase 9 — PDF/book export

Implement selected-document ordering and high-quality paginated export with A4/A5/Letter, page numbers, cover, bookmark/TOC support, font selection and Themed/Clean/Ink Saver modes.

## Phase 10 — Recovery, migration and hardening

Exercise crash recovery, rotating history, restore-current-state protection, schema migrations, corrupted/imported-file handling, path traversal defenses and very large stories.

Test cleanly with telemetry/network disabled because the product must not depend on external services.

## Definition of done for first polished release

A release is not considered complete merely because text editing works. It should include the designed library, generic workspace, Markdown/PDF/images, bookmarks/navigation, all core widgets including cards, Sketchbook, themes, English/Czech localization, sound/motion controls, remappable shortcuts, autosave/recovery/history, templates/shareable formats and PDF export.

The application should be usable fully offline without an account and without any FigmentFell-operated infrastructure.
