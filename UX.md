# FigmentFell — UX Specification

## Overall interaction character

The application should feel calm, tactile and immediate. Avoid dense IDE chrome, permanent status noise and unnecessary modal dialogs. Use animation and sound where they create a physical impression, not merely because animation is available.

## Startup flow

1. Launch into a short branded splash.
2. Enter Library.
3. Sort stories by last opened.
4. Opening a book transitions gently into the workspace and may play a subtle book-opening sound.

Do not create a giant `Continue` hero; the most recent story naturally appears first.

## Library interaction

Support Cover and Shelf view toggles. Story actions are available through context menu and appropriate hover/focus affordances. New Story and Import are distinct primary actions.

Generated covers and spines must remain recognizable as the same story across both views.

Deletion requires confirmation. Renaming should be lightweight. Duplicate creates an independent story.

## Workspace chrome

Keep the top bar minimal. Left side: return to Library and story title. Right side: concise add/content affordance and story menu.

Story menu includes Save as Template, Export Story and story appearance/theme controls.

Use splitters between the two document panels and Tools panel. Persist proportions. Collapsing a panel should not destroy its tabs/widgets or dimensions.

## Document tabs

Tabs support drag reordering and cross-panel drag/drop. The active tab is obvious without relying solely on color. Tab types may have subtle icons but should not visually dominate.

Closing a tab removes it from the current layout; destructive deletion of the underlying document must be a distinct action where applicable.

## Search

Ctrl+F searches the active document. Markdown and PDF should expose a consistent interaction model: query, result count, next and previous. Escape closes search and returns focus appropriately.

## Bookmarks

Adding a bookmark captures the current location and prompts for/permits a short label and color. Bookmarks appear as small colored edge markers. Hover/focus reveals the label. Activating one jumps to it and participates in navigation history.

Bookmarks are not generated automatically from headings. Markdown outline/headings are a separate navigation feature.

## Navigation history

Alt+Left and Alt+Right navigate jump history similar to a browser. History includes bookmark jumps and other deliberate in-document navigation, not ordinary scrolling.

## Markdown editing

Favor direct manipulation and keyboard flow. Common Markdown input conventions should transform into rich structures. The user should not need a permanently visible formatting toolbar.

Images can enter via clipboard paste, drag/drop, file insertion or Sketchbook. Preserve predictable cursor/focus behavior after insertion.

Very long Markdown documents still appear and behave as one continuous document. Internal chunk/segment boundaries must never appear as pages, entries, loading separators or other user-visible structure.

Opening a long journal should restore the last meaningful reading/editing position; for the usual append-at-the-end journal workflow this means opening near the latest content without first rendering the full history. Scrolling toward unloaded history progressively loads it, while distant content may be virtualized to keep interaction responsive.

Search, bookmarks, outline and navigation cover the entire document, including unloaded content. Activating a result in an unloaded region loads it transparently and then jumps to the correct location. Very long documents must avoid whole-document DOM churn on each input.

## Tools panel

Treat Tools as a vertical dashboard of widget instances. Provide an Add Tool interaction and drag handles for reorder. Widgets have a header with title and compact actions. Collapse state persists.

Avoid a rigid upper/lower tools split. Dice and cards may need to remain visible in the same session.

## Trackers UX

+/- should be large enough for rapid repeated use. Clicking the displayed value enables direct entry. Small bounded ranges can use clickable discrete markers while retaining numeric editing.

Feedback should be immediate and optionally accompanied by the global UI click sound.

## Inventory UX

Items are manually ordered. Dragging between inventories changes ownership and preserves item data. Quantity reaches zero but the item stays in place and dims. Deletion is explicit.

Long descriptions do not expand every row by default; show a concise preview and a full accessible popover/details view.

## Dice UX

The tray visibly contains the selected dice. Rolling should be satisfying but short enough not to interrupt play. Results become readable quickly. Individual dice remain clickable for reroll.

Reduce Motion removes/shortens physical movement while preserving immediate result feedback.

## Cards UX

Cards should feel physical without turning the UI into a simulator. Drawing can be click-driven or drag-driven. A card may slide/flip briefly when revealed.

The Table is a freeform bounded surface. Cards can overlap and be repositioned. Provide obvious paths to discard/return without requiring precision dragging.

Searching the draw pile is an intentional gameplay action. Clearly communicate that selecting a search result draws that actual card from the pile.

Reset Deck is destructive to current deck state and requires confirmation.

## Sketchbook UX

Open a focused canvas with a minimal tool strip. `Done` returns to the document and inserts/updates the drawing. `Cancel` must not silently destroy existing edited drawing data; confirm when unsaved changes would be lost.

The editing source is retained behind the inserted image so `Edit Drawing` reopens the original strokes.

## Command palette

Ctrl+Shift+P opens centered searchable commands. Search command names and aliases. Display shortcuts. Keyboard selection/activation is first-class.

The palette should expose commands based on context; unavailable actions should either be absent or clearly disabled with reason.

## Autosave feedback

Autosave normally stays invisible. Ctrl+S causes an immediate flush and a short non-intrusive `Saved` acknowledgement. A save error becomes prominent and persistent until resolved/retried.

## Settings UX

Settings should be a calm dedicated surface, not a giant modal over the workspace. Changes that are safe should preview/apply immediately. Destructive/reset actions ask for confirmation.

Shortcut editing detects conflicts and clearly offers resolution/reset.

Theme editor previews changes live. Contrast warnings inform rather than police the user.

## Accessibility baseline

All core workflows must be keyboard reachable. Provide visible focus states. Never encode important state using color alone. Respect Reduce Motion. UI scaling must not break layouts. Tooltips/popovers must work for keyboard focus as well as pointer hover.

## Motion principles

Use motion for spatial/physical meaning: opening a book, changing screens, rolling dice, drawing/flipping cards and expanding/collapsing surfaces. Avoid decorative perpetual animation.

Motion should be subtle by default and substantially reduced when Reduce Motion is enabled.
