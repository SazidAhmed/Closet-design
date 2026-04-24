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
