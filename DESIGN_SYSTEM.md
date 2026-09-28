# FigmentFell — Design System Direction

## Identity

FigmentFell should evoke a refined personal writing desk: bound books, fine fabric, paper, ink, cards and wooden tabletop objects interpreted through a modern desktop interface.

Avoid both extremes:

- sterile developer-tool minimalism
- literal/tacky skeuomorphism

The target is modern UI with tactile suggestion.

## Default visual direction

Default theme: muted dark blue, low-contrast fabric texture, warm readable document surface, restrained ornament and gentle depth.

The splash may use `FIGMENTFELL` typographically. `FF` is the natural monogram for app icon exploration.

## Theme tokens

Themes should be structured data, not custom CSS. At minimum expose semantic tokens for:

- workspace background
- panel background
- document background
- toolbar/menu surface
- primary text
- secondary text
- accent
- border/decorative line
- selection/highlight
- texture selection
- texture intensity
- ornament/decorative family

Components consume semantic tokens; do not hardcode theme-specific colors in components.

## Textures

Only curated built-in textures. Candidate families:

- None
- Fine Fabric
- Coarse Fabric
- Paper
- Parchment
- Leather
- Wood
- subtle stripes
- crosshatch/dots

Simple textures may be procedural CSS/SVG. Keep contrast low and intensity within a safe configurable range.

## Ornamentation

Use curated vector ornament families such as:

- None
- Minimal
- Classical
- Botanical
- Arcane
- Geometric

Ornaments appear only in controlled locations: corners, separators, headings, selected dialogs/cards. They must not compete with writing.

Bundled external assets require traceable compatible licensing, preferably CC0/public domain. Maintain `ASSET_LICENSES.md` with source, author and license. Never allow automated implementation work to download random untracked decorative assets.

## Typography

Bundle/select a small curated set of high-quality fonts with strong Unicode coverage including Czech diacritics. Provide separate UI Font and Document Font settings.

Avoid a Word-like giant font selector. PDF export defaults to the current story document font and may allow explicit override.

## Books

Library book appearance is generated parametrically. A cover has material/texture, outer/border color, inner color, text color and decoration style/color. Shelf spine derives from the same definition.

The result should look designed rather than procedurally noisy. Restrict combinations where necessary to preserve visual quality.

## Cards

Cards need consistent proportions, readable typography and subtle depth. Provide several cohesive built-in backs. Custom cards without artwork use deck styling to generate a polished text face.

## Dice

Dice are recognizable physical forms rather than generic numbered buttons. Keep animations brief. Visual quality is why the product intentionally supports the classic fixed die set instead of arbitrary dN shapes.

## Sound identity

Use short, restrained samples with consistent acoustic character. Avoid loud UI gamification. Sounds should imply paper, wood, cards and small mechanical interactions.

Typewriter mode is intentionally optional and OFF by default.

## Motion

Motion duration should generally be short and ease naturally. Use it to communicate material/spatial transitions. Reduced-motion mode should remove rotations, flips and large movement while preserving state changes.

## Initial bundled themes

At minimum design cohesive presets along these directions:

- Midnight — muted dark blue/fabric; default
- Ivory — light, clean book/paper
- Herbalist — natural muted greens/paper
- Study — warm desk/library character

Names may change during visual design, but multiple polished themes ship from the beginning.
