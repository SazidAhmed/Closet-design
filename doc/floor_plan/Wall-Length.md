# Wall Length Implementation (April 25, 2026)

## Overview

This document describes the current wall-length behavior in the floor-plan editor,
including the closed-room fix where only the selected wall length changes and
all other wall lengths remain unchanged.

Primary outcomes:

1. Length edits remain topology-aware for standalone, one-connected, open both-connected, and closed-loop cases.
2. Closed rooms now preserve non-selected wall lengths during resize.
3. Connected walls in closed rooms can rotate/reposition to maintain closure.
4. Viewport remains visually stable during repeated closed-room length edits.

## Key Code Paths

1. Store geometry logic:
	- `src/stores/useRoomStore.ts`
	- `setWallLength(...)` delegates to `resizeWallLength(...)`.
	- `resizeWallLength(wallId, length, growthSide)` is the canonical action.

2. Floor plan UI handler:
	- `src/features/closet/views/FloorPlan.vue`
	- `setSelectedWallLengthInches(...)` routes UI input to `roomStore.resizeWallLength(...)`.
	- The handler ensures the draw frame is locked before resize operations.

3. Regression tests:
	- `tests/wallLengthGrowth.test.ts`
	- `tests/floorPlan.pivot.integration.test.ts`

## Store-Level Design

## Entry Action

`resizeWallLength(wallId, length, growthSide = 'end')` is the canonical resize action.

General flow:

1. Locate selected wall.
2. Clamp requested length with wall constraints.
3. Compute selected wall direction from angle.
4. Resolve endpoint connectivity via `wallEndpointConnectivity(...)`.
5. Branch by topology and growth side.
6. Recalculate door/window side-position metadata for placed items.

## Helpers Used

Existing helpers reused:

1. `findWallConnectedToStart(...)`
2. `findWallConnectedToEnd(...)`
3. `wallEndpointConnectivity(...)`
4. `wallEndPoint(...)`
5. `translateWall(...)`

Closed-loop solver helpers added:

1. `chainReachRange(...)` to derive feasible selected-wall length range from fixed chain lengths.
2. `directionOrFallback(...)` for robust normalized direction handling.
3. `solveOpenChainFabrik(...)` to solve chained joint positions while preserving segment lengths.

## Behavior by Topology

## 1) Standalone wall (no connected endpoints)

1. Selected wall length updates directly.
2. No chain translation is required.

## 2) One-connected wall

1. If growth is applied toward the connected side, connected walls translate as a rigid chain.
2. Connectivity is preserved.

## 3) Both-connected wall (open topology)

1. Selected wall grows from configured side.
2. Downstream connected chain translates to preserve joints.
3. Open topology continuity is maintained.

## 4) Closed-loop wall (fixed non-selected lengths)

When room is closed and selected wall has both endpoints connected:

1. Selected wall length is updated (or clamped to the feasible range).
2. All non-selected wall lengths are kept unchanged.
3. A FABRIK-based chain solve updates non-selected wall positions/angles so:
	- end of selected wall reconnects to start of chain,
	- chain reconnects to selected wall start,
	- room remains closed.
4. Result: only selected wall length changes; other walls adjust by angle/position.

## Growth Side Policy

1. Current UI input path uses growth side `end`.
2. Store action supports both `start` and `end`, and closed-loop fixed-length behavior applies to both.

## Viewport Behavior

## Stable frame policy during length edits

In `setSelectedWallLengthInches(...)`:

1. Ensure draw frame is locked before resize if not already locked.
2. Reuse existing locked frame for closed rooms.
3. Do not refresh/recenter the frame after each closed-room resize step.

Result: repeated closed-room length edits do not visually jump or drift the viewport.

## Tests Added/Updated

## Store tests

File: `tests/wallLengthGrowth.test.ts`

Coverage includes:

1. Existing one-connected/open/internal/standalone behavior checks.
2. Closed room end-growth: only selected wall length changes; all other wall lengths remain unchanged; closure preserved.
3. Closed room start-growth: same invariant as above.

## Integration tests

File: `tests/floorPlan.pivot.integration.test.ts`

Coverage includes:

1. Open topology: draw viewBox remains locked during repeated length edits.
2. Closed topology: draw viewBox remains locked during repeated length edits.

## Verification Executed

Commands executed successfully:

1. `npx vitest run tests/wallLengthGrowth.test.ts tests/roomRotation.test.ts tests/roomRotation.openBothConnected.test.ts`
2. `npx vitest run tests/floorPlan.pivot.integration.test.ts tests/wallLengthGrowth.test.ts`
3. `npm test`

All passed.

## Notes

1. Closed-loop behavior now prioritizes fixed non-selected lengths plus closure maintenance.
2. If a requested closed-room selected-wall length is geometrically infeasible, the selected length is clamped to the chain reach range.
3. This keeps edits deterministic and avoids tearing closed topology.


