# Pivot Point Determination in Floor Plan Rotation

## Overview

Pivot selection is now deterministic and does not depend on where the user clicks on a wall body.

Current behavior has two layers:
1. Rotation execution in [useRoomStore.ts](../../src/stores/useRoomStore.ts)
2. Anchor selection in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue)

The anchor selected by the UI is passed into `setWallAngle(...)`, and store branches decide how much geometry rotates.

Note: for placed walls, the draw-canvas inside-side marker now uses the same interior-side rule as pivot selection. This keeps the shown shadow side and selected pivot endpoint aligned. (Preview segments still use right-hand drawing direction before placement.)

---

## Deterministic Pivot Rules

When a wall is selected in draw mode, `insideLeftAnchorTypeForWall(...)` in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue) resolves anchor type from one interior-side rule:

1. Build normalized polygon vertices from current walls.
2. At selected wall midpoint, sample both sides using wall normal (`+normal` and `-normal`).
3. Test both sample points with point-in-polygon.
4. The side that is inside determines anchor endpoint:
	- inside on right side -> `start`
	- inside on left side -> `end`
5. If side tests are ambiguous (both/none inside), fallback to winding sign.

This implements the same practical rule users see in canvas: the shadow-marked side is treated as inside, and inside-left endpoint comes from that side.

---

## Closed-Room Pivot in Store

For closed rooms, `setWallAngle(...)` calls `rotateClosedRoom(...)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts), which ignores UI click location and computes pivot using `insideLeftPivot(...)`.

`insideLeftPivot(...)` now uses `closedWallInteriorSide(...)`:

1. Sample both sides of selected wall at midpoint.
2. Determine which side is interior via point-in-polygon.
3. Map interior side to pivot endpoint (`right` -> `START`, `left` -> `END`).
4. Use winding fallback only for degenerate side tests.

This keeps store pivot calculation aligned with what is visually shown as inside in the floor-plan canvas.

---

## Boundary/Open Rotation in Store

`setWallAngle(wallId, angleRad, anchor)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts) branches as follows:

1. Closed room -> `rotateClosedRoom(delta, wallId)`
2. Boundary wall with **pivot endpoint connected** and opposite endpoint free -> rotate **selected wall only** around pivot endpoint
3. Other boundary wall case -> `rotateBoundaryChain(delta, wallId, anchor)`
4. Open wall with both endpoints connected -> `rotateOpenBothConnectedOneSide(delta, wallId, anchor)`
5. Other open-chain -> per-wall rotate/translate logic

Boundary connectivity is resolved per endpoint (`startConnected`, `endConnected`) and compared against the selected anchor.

- If selected anchor endpoint is connected, only the selected wall hinges around that pivot.
- If selected anchor endpoint is not connected, boundary behavior remains rigid-chain via `rotateBoundaryChain(...)`.

---

## Click Behavior (Important)

Wall click position no longer determines pivot endpoint.

- `selectWall(...)` in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue) computes anchor from deterministic geometry rules.
- Inside-side area click and wall-body click both route through the same wall selection path.
- `setSelectedWallAngleDeg(...)` keeps the selected endpoint type stable during the angle edit and passes that fixed anchor type to store.

So clicking near one end versus the other end of the same wall should not change pivot choice.

Intermittent flip fix:

- During repeated angle updates (typing or ±1°), the endpoint type is no longer recomputed per step.
- Only the anchor coordinates are refreshed from updated geometry while preserving the same endpoint type.
- This prevents occasional pivot jumps to the opposite endpoint in open/boundary shapes.

Add Wall continuation rule:

- When a wall is selected, Add Wall uses the endpoint opposite the selected inside-left pivot endpoint.
- Add Wall is visible only if that continuation endpoint is free (not connected).
- If the continuation endpoint is connected, Add Wall stays hidden for that selected wall.

---

## Viewport Locking During Rotation

To avoid apparent drift from auto-fit recentering, draw-mode viewBox is frozen while rotating.

- `lockDrawViewBoxToCurrentFrame()` stores the current frame
- closed rooms lock when closed
- boundary/open edits lock before angle updates
- unlock on draw-flow changes (mode switch, redraw, remove, undo, etc.)

This keeps the pivot visually stationary in the canvas.

---

## Rotation Math

Rigid rotation still uses the standard 2D matrix around pivot $p$:

$$
x' = p_x + (x-p_x)\cos\theta - (y-p_y)\sin\theta
$$

$$
y' = p_y + (x-p_x)\sin\theta + (y-p_y)\cos\theta
$$

Used in `rotatePointAroundPivot(...)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts).

---

## Summary

1. Pivot endpoint is deterministic and click-independent.
2. Pivot endpoint now follows the polygon-interior side rule used by the inside shadow area for placed walls.
3. Boundary walls now branch by pivot-endpoint connectivity: local hinge when pivot is connected, rigid-chain otherwise.
4. Closed rooms use store-side interior-side sampling via `insideLeftPivot(...)`, with winding fallback only for degenerate tests.
5. Closed-room anchor decisions in the view stay aligned with store pivot math.
6. View lock prevents visual pivot drift during rotation.

---

## Regression Coverage

- Store-level closed-rotation regression tests:
	- `tests/roomRotation.test.ts`
	- Concave wall-2 representative topology keeps inner-notch pivot fixed.
	- Reversed-winding concave wall-2 topology keeps the same inner-notch pivot fixed.
- UI-level interaction regression test:
	- `tests/floorPlan.pivot.integration.test.ts`
	- Mounts FloorPlan, selects wall 2, applies repeated `Rotate +1°`, and asserts pivot endpoint stability.


