## Why

Current rotation branches cover closed rooms and boundary-selected walls. A missing case remains: open topology where the selected wall is connected on both endpoints, while another part of the structure is disconnected. In this case, users expect only the pivot-side joint angle to change, and all non-pivot downstream corner angles to remain unchanged.

## What Changes

- Add a dedicated rotation behavior for open topology when selected wall has both endpoints connected.
- Route this case through a one-side rigid-chain rotation around the selected pivot endpoint.
- Preserve non-pivot downstream corner angles by rotating the selected wall together with the connected side away from the pivot.
- Fix inside-left projection orientation used by UI anchor selection so the pivot endpoint does not flip to the opposite corner in open-wall cases (including boundary and both-connected).
- Keep existing closed-room and boundary-selected-wall branches unchanged.
- Add tests for both anchor directions and corner-angle invariants.

## Capabilities

### Modified Capabilities
- `floor-plan-pivot-rotation`: Adds topology-aware one-side rigid rotation for open both-connected selected walls.

## Impact

- Affected code:
  - src/features/closet/views/FloorPlan.vue
  - src/stores/useRoomStore.ts
  - tests/roomRotation.openBothConnected.test.ts
  - doc/floor_plan/Pivot-Point-Determination.md
- No public API changes expected.
- Branch precedence in `setWallAngle` becomes explicit for this topology.
