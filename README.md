# Figmentary — Project Specification

Figmentary is a local-first desktop workspace for solo journaling RPGs. It recreates the feeling of a physical writing desk—books, paper, cards, dice, trackers, inventories and sketching—without slowing down the player's imagination.

This directory is the product source of truth for implementation. When implementation choices conflict with these documents, prefer the product intent documented here and update the specification deliberately rather than silently changing behavior.

## Documents

- `PRODUCT.md` — product principles, scope and feature requirements.
- `UX.md` — screens, interactions, commands, accessibility and detailed behavior.
- `DESIGN_SYSTEM.md` — visual direction, themes, typography, textures, ornamentation, motion and sound.
- `ARCHITECTURE.md` — proposed desktop/web architecture, persistence strategy and engineering constraints.
- `DATA_MODEL.md` — conceptual entities and portable file formats.
- `ROADMAP.md` — implementation order and acceptance gates.

## Naming

- Product: **Figmentary**
- Display/logo may use: **FIGMENTARY**
- Monogram: **F**
- Technical slug: `figmentary`
- Story: `.figstory`
- Template: `.figtemplate`
- Theme: `.figtheme`
- Deck: `.figdeck`
- Community locales remain human-editable JSON, e.g. `cs-CZ.json`.

The application identifier is `com.figmentary.app`. Before public release, perform a final collision/registration review for file associations and trademarks.
