# Copilot Memory Snapshot - 2026-04-25

## Source: /memories/debugging.md

- Vitest v3 in this environment does not support --runInBand; use npm test (vitest run) without that flag.

## Source: /memories/repo/floorplan-add-wall-connectivity.md

- Add Wall continuation start must use the exact selected wall endpoint (no grid snap), otherwise endpoint distance can exceed 1-unit connectivity tolerance and a connected joint may still render green.
- Keep 45-degree snapping for user target direction, but do not quantize the continuation anchor itself.
- Regression guard: verify endpoint color transitions green -> yellow after adding a wall from a previously free continuation endpoint.

## Source: /memories/repo/floorplan-elevation-overlay.md

- FloorPlan elevation is implemented as a center-canvas overlay, not a route/modal; both sidebars stay visible.
- Floor-plan SVG is hidden with v-show during elevation and restored on close (state preserved, drawing not destroyed).
- Elevation entry is in the selected-wall right sidebar panel (`Elevation` button) and appears only when a wall is selected.
- Elevation renders only door/window items attached to the opened wall and supports drag edits: X -> moveItem (along-wall), Y -> updateItemProps.elevation.
- Integration guard added in tests/floorPlan.addItems.selection.integration.test.ts for open/close + wall-specific item filtering + floor-plan restoration.
- Selected elevation opening now exposes width/height/corner resize handles; width clamps by remaining wall span from left edge, height clamps by room height above current elevation.
- Test guard also verifies resize handles appear when an elevation opening is selected.
- Phase-1 closet-fit start: session-local multi-closet blocks per wall are modeled in FloorPlan elevation with hard collision blocking against door/window and other closet rectangles.
- Elevation now shows connected-side gray bands and an order-measurement panel (left/right gaps, nearest opening distance, total/unit widths, top clearance, bottom elevation).

## Source: /memories/repo/floorplan-pivot.md

- Floor plan pivot selection must be deterministic by inside-left endpoint; never derive anchor from click proximity.
- In FloorPlan wall selection, compute anchor with geometry (inside reference) and pass same anchor to setWallAngle.
- Draw-wall inside-side visual marker uses wall direction right-hand side in screen space; final UX uses a shadow area band (no green line) and remains independent from pivot-anchor selection logic.
- In FloorPlan angle edits, keep selected wall anchor type stable during interaction; do not recompute per step to avoid intermittent endpoint pivot flips.

- Closed-room anchor selection in FloorPlan must use winding-only (signed area) to match store insideLeftPivot; projection-based anchor selection is for open/boundary topologies only.
- Keep docs in sync with topology-aware priority to avoid regression confusion.
- Avoid relying on local `isClosed` UI flag for pivot math; use `roomStore.roomIsClosed` in anchor selection to prevent stale-state regressions.
- Added UI-level regression test: tests/floorPlan.pivot.integration.test.ts validates FloorPlan wall selection + repeated Rotate +1 updates keep wall-2 concave inner-notch pivot fixed.

- In Draw Walls mode, inside-side area clicks should route through the same wall selection path as wall body clicks to prevent stale selection before angle edits.

- Pivot/inside rules now use side-sampling against the current polygon interior (point-in-polygon at wall midpoint +/- normal) in both FloorPlan and useRoomStore, with winding fallback only for degenerate side tests.

- Unified FloorPlan mode removes Draw Walls tab; integration tests should enter drawing via `Start Drawing` or `Clear and Redraw` depending on initial closed state, and Teleport dialogs require stubbing in Vue test utils when assertions rely on wrapper text.

- Current FloorPlan draw entry button labels in UI are `Custom Room` / `Clear Drawing`; tests searching for `Start Drawing` / `Clear and Redraw` will fail until updated.

- Add Wall continuation now uses only the endpoint opposite inside-left anchor ("right" endpoint), and the button is shown only when that endpoint is free; no Add Wall fallback when no wall is selected.

## Source: /memories/session/plan.md

Captured in backup file: doc/copilot-memory-backup/2026-04-25/session-plan.md
