# Pivot Point Determination in Floor Plan Rotation

## Overview

Pivot selection is now deterministic and does not depend on where the user clicks on a wall body.

Current behavior has two layers:
1. Rotation execution in [useRoomStore.ts](../../src/stores/useRoomStore.ts)
2. Anchor selection in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue)

The anchor selected by the UI is passed into `setWallAngle(...)`, and store branches decide how much geometry rotates.

---

## Deterministic Pivot Rules

When a wall is selected in draw mode, `insideLeftAnchorTypeForWall(...)` in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue) resolves anchor type with this priority:

1. Inside-facing geometric rule (projection)
2. Winding fallback rule

### Rule 1: Inside-Facing Left Endpoint

For open walls (including boundary walls):

1. Compute selected wall midpoint.
2. Build an inside reference from other walls (`structureReferencePointExcludingWall`).
3. Form inside vector from midpoint to that reference.
4. Compute left-of-facing vector in screen space:
	- $left = (-insideY, insideX)$
5. Project start and end offsets onto `left`.
6. Endpoint with larger projection is chosen as pivot endpoint.

This implements: "stand on the wall, face inside, choose the endpoint on your left."

### Rule 2: Winding Fallback

If the inside reference is degenerate, fallback uses signed area of normalized wall vertices:

- `signedArea >= 0` -> `start`
- `signedArea < 0` -> `end`

---

## Closed-Room Pivot in Store

For closed rooms, `setWallAngle(...)` calls `rotateClosedRoom(...)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts), which ignores UI click location and computes pivot using `insideLeftPivot(...)`.

`insideLeftPivot(...)` uses polygon winding from shoelace area:

$$
signedArea = \frac{1}{2} \sum_{i=0}^{n-1}(x_i y_{i+1} - x_{i+1} y_i)
$$

Then:

- `signedArea >= 0` -> selected wall `START`
- `signedArea < 0` -> selected wall `END`

---

## Boundary/Open Rotation in Store

`setWallAngle(wallId, angleRad, anchor)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts) branches as follows:

1. Closed room -> `rotateClosedRoom(delta, wallId)`
2. Boundary wall -> `rotateBoundaryChain(delta, wallId, anchor)`
3. Open wall with both endpoints connected -> `rotateOpenBothConnectedOneSide(delta, wallId, anchor)`
4. Other open-chain -> per-wall rotate/translate logic

For boundary chains, `rotateBoundaryChain(...)` rotates the connected chain rigidly around the provided anchor endpoint.

---

## Click Behavior (Important)

Wall click position no longer determines pivot endpoint.

- `selectWall(...)` in [FloorPlan.vue](../../src/features/closet/views/FloorPlan.vue) computes anchor from deterministic geometry rules.
- `setSelectedWallAngleDeg(...)` recomputes anchor before each angle update and passes that anchor to store.

So clicking near one end versus the other end of the same wall should not change pivot choice.

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
2. Open walls (including boundary walls) use inside-facing left endpoint from geometry projection.
3. Closed rooms use store-side winding rule via `insideLeftPivot(...)`.
4. View lock prevents visual pivot drift during rotation.


