# AGENTS.md — FigmentFell

This file defines how coding agents should work in this repository.

## Source of truth

Read the project specifications before making architectural or product decisions:

- `README.md`
- `PRODUCT.md`
- `UX.md`
- `DESIGN_SYSTEM.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `ROADMAP.md`

These documents describe the intended product. Treat them as requirements, not loose inspiration.

If specifications conflict, are ambiguous, or implementation reveals that an important requirement is technically problematic, do not silently choose a different product behavior. Explain the conflict or constraint and propose concrete options before changing the intended behavior.

Do not silently rewrite product decisions in specification files to match an implementation shortcut.

## Product principles

FigmentFell is a polished, offline-first desktop application for solo journaling RPGs.

Preserve these constraints:

- fully local/offline operation;
- no accounts, cloud backend, telemetry, analytics, or crash reporting;
- no FigmentFell-operated infrastructure required for normal use;
- portable, self-contained story files;
- generic document panels rather than hardcoded rules/journal roles;
- a generic widget-based Tools panel;
- themes, localization, accessibility, atmosphere, sound, and motion are product architecture, not optional late-stage extras;
- user content and long-running stories must remain durable and portable;
- very long journals must scale without requiring the entire document to be loaded/rendered at once.

Do not reduce the intended product to a generic text-editor MVP unless explicitly instructed.

## Implementation approach

Follow `ROADMAP.md`. In particular, complete and evaluate Phase 0 technical proofs before committing the application to risky architectural assumptions.

Work in small, understandable increments. Prefer completing one coherent vertical or technical slice over scattering unfinished scaffolding across many unrelated features.

Before introducing a major dependency, persistence strategy, editor abstraction, or architectural pattern:

1. check whether the existing specifications already constrain the choice;
2. prefer mature, maintained libraries over custom infrastructure;
3. explain meaningful tradeoffs when the choice affects the product architecture;
4. avoid adding dependencies merely for trivial convenience.

Do not replace a difficult requirement with a simpler behavior without calling attention to it.

## Architecture boundaries

The Tauri/Rust side owns native and durable concerns such as filesystem access, story persistence, imports/exports, backups/recovery, attachment access, and OS integration.

The React/TypeScript side owns presentation and interaction.

Keep persistence behind typed service/API boundaries. React components must not directly manipulate `.ffstory` internals or arbitrary application files.

Keep transient UI state, per-story workspace state, durable story content, and global application settings conceptually separate.

Do not introduce a backend server, Next.js, Electron, or a large global state framework unless a later explicit decision changes the architecture.

## Markdown and long-document architecture

A Markdown document is one continuous document from the user's perspective.

Its internal representation may be split into stable, block-aware chunks so that very long journals can be loaded and edited incrementally. Chunk boundaries are an implementation detail and must never become visible as pages/files/sections imposed on the user.

Do not split Markdown blindly by character count. Preserve structural block boundaries.

Search, bookmarks, outline generation, navigation, export, and document-wide metrics must operate over the complete logical document, including content not currently mounted in the editor.

Opening a long journal should be able to restore the relevant recent/last position without loading the complete document. Older/newer regions should be loadable around navigation and scrolling as needed.

The Milkdown/ProseMirror integration is subject to the Phase 0 proof. If the chosen editor architecture fights these requirements, report the limitation and propose alternatives rather than weakening the requirements silently.

## Persistence and data safety

Ordinary text edits must never require rewriting or loading an entire large story containing hundreds of megabytes of attachments.

Use transactions/atomic operations where appropriate. Treat imported content as untrusted data and validate formats, versions, paths, and references.

Do not make destructive schema migrations without a safe migration path.

Autosave should remain unobtrusive but durable. Explicit save must flush pending work.

## UI and design

Follow `UX.md` and `DESIGN_SYSTEM.md`.

Do not hardcode visible user-facing strings in components. Use localization keys from the start.

Do not scatter arbitrary literal colors throughout feature components. Use semantic design/theme tokens.

Do not use generic developer-tool styling as a substitute for the intended FigmentFell visual character.

Keep interaction chrome restrained. Prefer contextual actions and the command palette over permanently exposing every possible command.

Animations and sounds should communicate physical/spatial meaning and must respect their global settings and Reduce Motion.

## Localization

English is the fallback language and Czech is a complete initial locale.

All new user-facing strings must enter the localization system. Missing community locale keys fall back safely to English.

Keep Unicode and Czech diacritics working throughout storage, search, UI, import/export, and generated output.

## Accessibility

Core workflows must be keyboard accessible. Maintain visible focus states and do not communicate important state through color alone.

UI scaling and Reduce Motion must remain functional as features are added.

## Automated tests

Do not create automated tests or a test suite unless explicitly requested.

Do not spend implementation time adding unit, integration, snapshot, or end-to-end test infrastructure by default.

Instead, after meaningful changes, use the applicable existing validation tools such as:

- TypeScript/type checking;
- linting;
- formatting checks where configured;
- Rust compilation/checks;
- production builds;
- focused manual verification of the changed workflow.

Do not add a new linter/formatter merely because this section mentions one. Use the project's configured tooling.

## Verification and completion claims

Never describe placeholder behavior, mocked persistence, hardcoded demo data, or TODO-backed functionality as complete.

When finishing a task, report concisely:

- what was implemented;
- what validation was run and whether it passed;
- any known limitation, placeholder, or unresolved decision;
- which specification/roadmap item should be tackled next when relevant.

If validation cannot be run, say so.

## Documentation discipline

Do not edit product specifications merely to document ordinary implementation details.

Update the relevant specification when an actual product or architectural decision has intentionally changed. Keep documentation and implementation consistent.

For meaningful architectural decisions not already captured by the specifications, propose the documentation change rather than allowing undocumented behavior to become the de facto design.

## Scope discipline

Do not opportunistically refactor unrelated code during a focused task unless it is required for correctness.

Do not prematurely implement later roadmap phases just because their scaffolding is convenient.

At the same time, do not create knowingly disposable architecture that contradicts requirements already scheduled for later phases.

The goal is steady progress toward the complete FigmentFell product described by the specifications, not maximum code volume.
