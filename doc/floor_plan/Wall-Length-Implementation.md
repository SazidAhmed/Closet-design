# Wall Length Implementation (April 24, 2026)

## Overview

This document describes the wall-length implementation completed today for the floor-plan editor.

Primary goals achieved:

1. Length edits follow topology-aware behavior (standalone, one-connected, both-connected, and closed-loop cases).
2. Existing connectivity is preserved (no unintended disconnections).
3. Open-topology edits keep the viewport locked during repeated length changes.
4. Closed-room edits refresh the locked frame after resize to prevent stale-frame drift.

## Key Code Paths

1. Store geometry logic:
	- `src/stores/useRoomStore.ts`
	- `setWallLength(...)` now delegates to `resizeWallLength(...)`.
	- `resizeWallLength(wallId, length, growthSide)` contains the topology-aware propagation.

2. Floor plan UI handler:
	- `src/features/closet/views/FloorPlan.vue`
	- `setSelectedWallLengthInches(...)` routes UI input to `roomStore.resizeWallLength(...)`.
	- Same handler applies viewport lock behavior consistent with rotation rules.

3. Regression tests:
	- `tests/wallLengthGrowth.test.ts`
	- `tests/floorPlan.pivot.integration.test.ts`

## Store-Level Design

## Entry Action

`resizeWallLength(wallId, length, growthSide = 'end')` is now the canonical resize action.

Flow:

1. Locate selected wall.
2. Clamp requested length using existing wall constraints.
3. Compute `delta = nextLength - currentLength`.
4. Resolve wall direction unit vector from wall angle.
5. Inspect endpoint connectivity with `wallEndpointConnectivity(...)`.
6. Apply branch logic based on `growthSide` and connectivity.
7. Recalculate door/window side-position metadata for placed items.

## Connectivity Helpers Used

The resize logic reuses existing topology helpers:

1. `findWallConnectedToStart(...)`
2. `findWallConnectedToEnd(...)`
3. `wallEndpointConnectivity(...)`
4. `wallEndPoint(...)`

Additional local utilities in store for resize flow:

1. `setWallFromPoints(...)` to rebuild bridge walls in looped cases.
2. `translateWall(...)` to rigidly move connected chains.

## Behavior by Topology

## 1) Standalone wall (no connected endpoints)

1. Selected wall length updates directly.
2. No chain translation is required.

## 2) One-connected wall

1. If growth is applied toward a connected side, connected walls are translated as a rigid chain.
2. Selected wall remains continuous with its neighbor.
3. No endpoint gap is introduced.

## 3) Both-connected wall (open internal attachment)

1. Selected wall grows from configured side (`end` in current UI path).
2. Downstream connected chain is translated to preserve joints.
3. Structure continuity is maintained.

## 4) Closed loop behavior

1. Chain traversal may loop back to selected wall.
2. In looped case, one bridge segment is rebuilt using `setWallFromPoints(...)` while other affected walls are translated.
3. Result keeps closed connectivity instead of tearing the polygon.

## Growth Side Policy (Current)

Current UI path uses growth side `end`:

1. `FloorPlan.vue` calls `resizeWallLength(..., 'end')`.
2. `setWallLength(...)` also delegates with `'end'`.

This provides deterministic behavior and a single action path for future extension to explicit side selection.

## Viewport Behavior

## Open/Boundary topologies

In `setSelectedWallLengthInches(...)`:

1. If room is not closed and viewBox is not already locked, lock frame before incremental edits.
2. Repeated length changes keep the frame stable (no recenter jitter).

## Closed rooms (important fix)

Problem addressed today:

1. Closed rooms already keep a locked draw frame.
2. Length changes could make geometry outgrow that stale frame.
3. Visual result looked like room drifting away from viewport.

Fix implemented:

1. After `resizeWallLength(...)` in closed mode, call `lockDrawViewBoxToCurrentFrame()` again.
2. This refreshes the locked frame to the updated geometry.
3. Closed-room length edits stay in view while preserving lock semantics.

## Tests Added/Updated

## Store tests

File: `tests/wallLengthGrowth.test.ts`

Coverage:

1. One-connected wall grows and connected chain translation preserves connectivity.
2. Both-connected internal wall growth preserves topology.
3. Standalone wall grows locally without neighbor compensation.
4. Closed room length growth preserves closed connectivity.

## Integration tests

File: `tests/floorPlan.pivot.integration.test.ts`

Existing + added coverage relevant to length:

1. Open topology: viewBox remains locked during repeated length edits.
2. Closed topology: viewBox is refreshed after wall length growth to prevent drift.

## Verification Executed

Commands executed successfully:

1. `npm test -- tests/floorPlan.pivot.integration.test.ts`
2. `npm test`
3. `npm run build`

All passed after implementation.

## Notes / Future Extensions

1. The architecture now supports explicit growth-side control (`start` vs `end`) at action level.
2. UI can later expose side-selection without changing core propagation model.
3. Current behavior intentionally prioritizes deterministic topology preservation over ad hoc per-component mutations.


