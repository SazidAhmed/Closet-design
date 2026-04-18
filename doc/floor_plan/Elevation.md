# Elevation View - Closet Fit Workflow

## 1. Objective

Turn Elevation into an order-ready fitting surface where users can:

1. See connected wall context (left/right gray bands).
2. See door/window openings on the selected wall.
3. Place multiple closet units in front of that wall.
4. Prevent invalid placements where closets overlap door/window areas.
5. Read key measurements needed for production and ordering.

This supports practical planning for rooms with multiple walls/openings and multiple closet units.

## 2. Product Decisions (Locked)

1. Multiple closet blocks per wall (independent units).
2. Door/window overlap is hard-blocked (invalid placements are not applied).
3. Connected side-wall bands are hard no-go zones enforced with wall-thickness margins.
4. First release is session-local (no schema/store migration for closet block persistence).
5. Required measurements:
   - Left gap
   - Right gap
   - Closest distance to an opening
   - Total closet width
   - Each unit width
   - Top clearance to ceiling
   - Bottom elevation from floor

## 3. Data Model (Session-Local)

Elevation closet blocks are stored locally in FloorPlan state, keyed by wall id.

```ts
type ElevationClosetBlock = {
  id: string
  leftCm: number
  bottomCm: number
  widthCm: number
  heightCm: number
}

Record<string, ElevationClosetBlock[]> // wallId -> blocks
```

Notes:

1. `leftCm` is from wall start (same direction used by Left Position).
2. `bottomCm` is from floor upward.
3. Units stay in cm internally; UI labels use inch-format helpers already used in FloorPlan.

## 4. Geometry And Collision Strategy

### 4.1 Wall-space rectangles

Everything is computed in wall-local cm space first:

1. Opening rect: derived from `leftPosition`, `elevation`, `width`, `height`.
2. Closet rect: derived from `leftCm`, `bottomCm`, `widthCm`, `heightCm`.

Then projected to elevation SVG coordinates using existing layout scale.

### 4.2 Overlap rule

A closet candidate is valid only if:

1. It stays inside the usable wall span and room height bounds.
2. It does not overlap any opening rect on the same wall.
3. It does not overlap any other closet block on the same wall.

Usable wall span in elevation:

1. If selected wall start endpoint is connected, left no-go margin = wall thickness.
2. If selected wall end endpoint is connected, right no-go margin = wall thickness.
3. Horizontal drag/resize/add placement is clamped to the remaining usable span.

Collision check uses axis-aligned rectangle overlap in wall-local cm space.

## 5. UI/UX Implementation Plan

## 5.1 Right Sidebar (Selected Wall)

Add controls in selected wall panel:

1. `Elevation` (already present)
2. `Add Closet Unit`
3. `Remove Selected Unit`

Behavior:

1. Add button creates a default closet block using cabinet size defaults from closet store, clamped to wall/room bounds.
2. Add is disabled if no valid slot can be found.
3. Remove deletes currently selected closet block for that wall.

## 5.2 Elevation Overlay

Render sequence:

1. Wall face rect.
2. Connected side-wall gray bands (left for start-connected, right for end-connected).
3. Floor line and dimensions.
4. Opening blocks (door/window) and their existing interactions.
5. Closet blocks with selection + drag/resize handles.

Closet interactions:

1. Drag to move in X/Y within valid bounds.
2. Right handle -> width resize.
3. Top handle -> height resize.
4. Corner handle -> width + height resize.
5. Any operation that would overlap an opening, overlap another closet, or cross into connected side-wall no-go bands is rejected.

## 5.3 Measurements Panel

Show order-oriented values for selected closet (or first closet if none selected):

1. Left Gap
2. Right Gap
3. Nearest Opening distance
4. Total Closet Width
5. Unit Widths list
6. Top Clearance
7. Bottom Elevation

Fallback behavior when no closet exists:

1. Show `Opening Measurements` for selected opening (or first opening on wall).
2. If no openings exist, show `Wall Context` (wall width, usable width, blocked margins, opening/closet counts).
3. Keep the right panel populated (never blank while elevation is open).

## 6. Technical Scope Boundaries

Included in first release:

1. Session-local elevation closet placement and validation.
2. Visual connected-wall bands.
3. Measurement panel in elevation overlay.

Excluded in first release:

1. Persisting elevation closet blocks in saved schema.
2. Quote payload/backend changes.
3. 3D scene closet-fit parity update.

## 7. Verification Plan

1. Extend floor plan elevation integration tests to validate:
   - Add/remove closet unit controls.
   - Closet render and selection.
   - Hard no-overlap with openings.
   - Measurement panel values for known geometry.
2. Ensure existing pivot/rotation/opening tests continue to pass.
3. Run:
   - `npm test`
   - `npm run build`

## 8. Current Status

Implementation for Phase 1 and initial hardening is in place in FloorPlan:

1. Session-local closet block state and interaction model is implemented.
2. Connected-wall side-band computation and rendering is implemented.
3. Closet overlay rendering and controls are implemented.
4. Ordering measurement panel is implemented.
5. Measurement panel now has closet/opening/wall-context fallback modes to avoid empty state.
6. Integration tests now cover blocked and valid interaction paths plus connected-side boundary behavior.

## 9. Implementation Log (2026-04-18)

The following behavior is implemented today.

### 9.1 Core State And Geometry

In `src/features/closet/views/FloorPlan.vue`:

1. Added `ElevationClosetBlock` session-local model keyed by wall id.
2. Added selection state and drag/resize interaction state for closet blocks.
3. Added wall connectivity computed logic for start/end connection detection.
4. Added wall-local rectangle geometry helpers for openings and closet blocks.
5. Added rectangle overlap checks with hard validation gate.

### 9.2 Placement And Collision Rules

Implemented rules:

1. Closet block must stay inside selected wall length and room height.
2. Closet block cannot overlap any door/window opening on same wall.
3. Closet block cannot overlap any other closet block on same wall.
4. Invalid drag/resize operations are rejected (state does not update).
5. Valid drag/resize operations apply immediately.

### 9.3 UI Added

In selected wall panel (right sidebar):

1. Add Closet Unit
2. Remove Selected Unit

In elevation overlay:

1. Connected-side gray bands.
2. Closet unit rectangles with selection state.
3. Closet resize handles (width, height, corner).
4. Right-side measurements panel with fallback sections:
   - `Order Measurements` (when closet metrics exist)
   - `Opening Measurements` (when opening exists but no closet metrics)
   - `Wall Context` (when no closet/opening metrics exist)

### 9.4 Measurements Implemented

For selected closet (fallback first closet if none selected):

1. Left Gap
2. Right Gap
3. Nearest Opening distance
4. Total Closet Width
5. Unit Widths
6. Top Clearance
7. Bottom Elevation

Additional panel modes:

1. Opening Measurements includes type, width/height, left/right gaps, top clearance, and bottom elevation.
2. Wall Context includes wall width, usable width, blocked left/right margins, and opening/closet counts.

## 10. Test Coverage Added Today

In `tests/floorPlan.addItems.selection.integration.test.ts`:

1. Elevation opens/closes and floor plan restores.
2. Elevation closet unit can be created and metrics panel renders.
3. Drag/resize are blocked when operation would overlap opening (negative path).
4. Drag/resize are allowed when operation is in valid non-overlap area (positive path).
5. Doors/closets cannot cross connected side-wall no-go boundaries.
6. Elevation measurements panel remains visible for opening-only scenarios.

Current verification status:

1. `npm test` passes.
2. `npm run build` passes.

## 11. Known Technical Notes And Gotchas

1. Elevation closet blocks are intentionally session-local in this phase (not persisted to schema/history).
2. Pointer interaction tests in jsdom require SVG/pointer polyfills and manual event dispatch.
3. Wall connectivity bands are synchronized with strict horizontal constraints; the band edges are hard limits for doors, windows, and closet units.
4. Collision is axis-aligned in wall-local 2D space; this is correct for current elevation model.

## 12. Tomorrow Start Checklist

When resuming implementation, do this first:

1. Open `src/features/closet/views/FloorPlan.vue` and review elevation closet symbols (`ElevationClosetBlock`, collision helpers, drag handlers, measurement computed state).
2. Open `tests/floorPlan.addItems.selection.integration.test.ts` and run only this file first to verify baseline.
3. Run full `npm test` and `npm run build` before new changes.

Recommended next increments:

1. Add explicit no-overlap visual feedback during attempted invalid drag/resize.
2. Add precision numeric inputs for selected closet block in right panel.
3. Evaluate optional persistence model for elevation closet blocks after UX sign-off.
