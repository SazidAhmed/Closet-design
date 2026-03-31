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

1. Boundary-wall rule (highest priority)
2. Inside-facing geometric rule (projection)
3. Winding fallback rule

### Rule 1: Boundary Wall Uses Connected Endpoint

If exactly one endpoint of the selected wall is connected to other walls, pivot is forced to the connected endpoint.

- `startConnected !== endConnected`
- pivot = `start` when start is connected
- pivot = `end` when end is connected

This prevents pivot jumps to the free endpoint and keeps chain rotation physically anchored at the joint.

### Rule 2: Inside-Facing Left Endpoint

When both endpoints are connected or both are free:

1. Compute selected wall midpoint.
2. Build an inside reference from other walls (`structureReferencePointExcludingWall`).
3. Form inside vector from midpoint to that reference.
4. Compute left-of-facing vector in screen space:
   - $left = (insideY, -insideX)$
5. Project start and end offsets onto `left`.
6. Endpoint with larger projection is chosen as pivot endpoint.

This implements: "stand on the wall, face inside, choose the endpoint on your left."

### Rule 3: Winding Fallback

If the inside reference is degenerate, fallback uses signed area of normalized wall vertices:

- `signedArea >= 0` -> `start`
- `signedArea < 0` -> `end`

---

## Closed-Room Pivot in Store

For closed rooms, `setWallAngle(...)` calls `rotateClosedRoom(...)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts), which ignores UI click location and computes pivot using `insideLeftPivot(...)`.

`insideLeftPivot(...)` uses polygon winding from shoelace area:

$$
	ext{signedArea} = \frac{1}{2} \sum_{i=0}^{n-1}(x_i y_{i+1} - x_{i+1} y_i)
$$

Then:

- `signedArea >= 0` -> selected wall `START`
- `signedArea < 0` -> selected wall `END`

---

## Boundary/Open Rotation in Store

`setWallAngle(wallId, angleRad, anchor)` in [useRoomStore.ts](../../src/stores/useRoomStore.ts) branches as follows:

1. Closed room -> `rotateClosedRoom(delta, wallId)`
2. Boundary wall -> `rotateBoundaryChain(delta, wallId, anchor)`
3. Other open-chain -> per-wall rotate/translate logic

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
2. Boundary walls pivot on the connected endpoint.
3. Non-boundary walls use inside-facing left endpoint from geometry projection.
4. Closed rooms use store-side winding rule via `insideLeftPivot(...)`.
5. View lock prevents visual pivot drift during rotation.


