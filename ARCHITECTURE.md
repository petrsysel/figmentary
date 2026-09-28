# FigmentFell — Architecture Specification

## Proposed stack

Baseline implementation direction:

- Tauri 2 desktop shell
- Rust for native filesystem/persistence/import-export/backup integration
- React + TypeScript frontend
- Vite build tooling
- Milkdown/ProseMirror-based rich Markdown editing; Phase 0 performance findings define the intended document-size guidance
- Mozilla PDF.js for PDF rendering/search/navigation

Do not use Electron, Next.js or a backend server.

Library choices are implementation details and may change after proof-of-concept, but changes must preserve the requirements in `PRODUCT.md` and should be documented.

## Architectural boundaries

### Native/Rust layer

Own responsibilities that require durable/native access:

- managed directories
- file associations/import/export
- `.ffstory` persistence
- `.fftemplate`, `.fftheme`, `.ffdeck` import/export
- attachment streaming/access
- backups/snapshots/recovery
- safe/atomic persistence operations
- OS dialogs and opening folders

### Frontend

Own presentation and interaction:

- Library
- Workspace layout
- document tabs/panels
- Markdown editor integration
- PDF/image viewers
- tool widgets
- Sketchbook
- theme editor/runtime
- settings
- command palette
- localization

Keep persistence behind a typed service/API boundary rather than allowing arbitrary React components to manipulate story files directly.

## State strategy

Do not introduce a large global state framework by default. Start with React state/context plus focused stores/services where persistent cross-cutting state genuinely requires them. If a dedicated store library becomes useful, adopt it deliberately rather than preemptively.

Separate:

- transient UI state
- per-story persisted workspace state
- durable content state
- global application settings

## Story persistence

Preferred design direction: `.ffstory` is a single portable SQLite-backed container using a custom extension.

Reasons:

- incremental writes rather than rebuilding a large archive
- transactional consistency
- natural structured state
- one portable user-facing file
- snapshot/backup options

This decision requires an early proof-of-concept before being treated as irreversible.

### Large attachment constraint

A story may contain hundreds of megabytes of PDFs/images. Editing one character must not rewrite/copy all attachments or load them into memory.

Prototype and measure SQLite BLOB access/streaming with large PDFs. If direct BLOB storage creates unacceptable renderer/streaming behavior, retain the one-file user experience with an alternative container strategy that supports random/incremental access. Do not silently fall back to rewriting ZIP archives on every save.

## Autosave

Content changes are queued/debounced as appropriate but must reach durable storage quickly. Explicit Ctrl+S flushes pending work immediately.

Use transactions for logically grouped changes. Save failures propagate to UI as durable error state.

## Recovery and history

Crash recovery and user-visible history are separate concepts.

Use a rotating backup/snapshot strategy. Exact implementation may use SQLite backup APIs, database copies or another proven method, but snapshots must be consistent and should avoid corrupting the active story.

Detect unclean sessions with a lightweight session marker/state mechanism.

## Documents

Represent document identity independently from panel/tab placement. A document can be shown in either document panel without changing its semantic type.

Document types initially:

- Markdown
- PDF
- Image

Tab placement/order is workspace state.

## Markdown storage and long-document behavior

Markdown is the durable source for text documents. Editor-specific transient state may exist, but a proprietary rich-text JSON format must never be the only copy of user writing.

One Markdown document is opened in one continuous Milkdown/ProseMirror instance. This intentionally prioritizes native editor semantics—selection, copy/paste, keyboard selection, IME and one undo/redo history—over practical unlimited size for one document. Do not implement a `LongDocumentController`, a pool of editors, editor chunk virtualization, or custom selection/undo bridging.

Phase 0 performance proof results on the development environment found that 250,000-word realistic synthetic journals opened in roughly 8 seconds and remained usable; 500,000 words opened in roughly 24 seconds with noticeable but still usable editing degradation. These sizes are far beyond the expected normal journal. There is no hard document-size limit. Instead, the product offers per-document continuation guidance around 150,000–200,000 words and may repeat it only near a substantially higher threshold, initially around 400,000 words. Creating a continuation creates a new document and never automatically splits or moves user text.

Whole-document operations, including search, outline generation, metrics, bookmarks, navigation and PDF export, operate over the active document's full Markdown source.

Any editor-specific constructs must have a defined Markdown representation or an explicitly documented sidecar metadata mechanism.

Bookmarks and drawing edit-source metadata are appropriate sidecar structured data rather than Markdown syntax pollution.

## Drawings

Store both a rendered representation suitable for document display/export and editable source data (stroke/vector representation). Editing a drawing updates the rendered asset while preserving stable identity/references.

## PDFs

PDF.js should not require loading an entire huge PDF into JS memory if avoidable. Design attachment access so the renderer can use efficient byte/range access supported by the chosen Tauri/native bridge.

## Widget architecture

The Tools panel is a collection of typed widget instances, not hardcoded screen sections.

Each widget instance has at least:

- stable ID
- widget type
- title/name where applicable
- order
- collapsed state
- optional persisted height
- widget-specific configuration/state

Widget registration/rendering should make future tool types possible without rewriting the panel architecture.

## Deck state

Persist definition separately from runtime state conceptually. Runtime state includes exact draw-pile order, discard order and table card instances/positions. Reset reconstructs runtime state from definition/default configuration and shuffles as specified.

## Themes

Theme files contain validated structured tokens and references to known built-in texture/ornament IDs. Never execute theme-provided code/CSS.

Per-story appearance may reference an installed theme and/or store a self-contained theme snapshot/override sufficient to preserve appearance when the story is shared. Final representation should prioritize portability.

## Localization

All user-facing strings use localization keys from the beginning. English fallback is mandatory. External locale JSON is validated before activation; missing keys fall back to English rather than rendering blank text.

## Security and trust boundaries

Treat imported `.ffstory`, `.fftemplate`, `.fftheme`, `.ffdeck`, locale JSON, Markdown, images and PDFs as untrusted input.

Do not execute scripts from Markdown or imported content. Validate schemas, filenames/paths and asset references. Prevent path traversal on import/export. Theme and locale files are data only.

## Performance targets

Design/prototype against these scenarios early:

- long Markdown journal performance at 50,000, 100,000, 250,000 and 500,000 realistic synthetic words in one editor instance
- story with several large PDFs and images
- many persisted bookmarks
- multiple tool widgets
- large custom deck state
- frequent autosave while typing

Avoid architecture that works only for toy demo data.

## Platform strategy

Keep platform-specific behavior behind Tauri/native abstractions. Use conventional shortcuts with platform-aware equivalents where required. Initial release platform priorities can be chosen during implementation planning without compromising portable data formats.
