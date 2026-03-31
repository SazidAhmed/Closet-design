## Why

Pivot endpoint selection and rotation logic are currently duplicated between the floor-plan view and room store, which can produce drift and inconsistent behavior over time. This refactor is needed now to enforce one deterministic pivot contract and reusable rigid-rotation utilities before additional floor-plan features increase complexity.

## What Changes

- Extract shared geometry helpers for wall endpoints, winding/area, centroid, connectivity checks, angle normalization, and point rotation.
- Introduce one reusable pivot selection function that enforces inside-left endpoint semantics and deterministic tie-breaking.
- Introduce reusable rigid-rotation functions for closed-room and boundary-chain rotations.
- Refactor room-store rotation dispatcher to use shared rotation utilities while keeping existing action signatures stable.
- Refactor floor-plan wall selection/angle update flow to use the shared pivot selector instead of view-local duplicated math.
- Add regression tests for deterministic pivot stability, boundary-chain anchor behavior, and rigid-rotation invariants.

## Capabilities

### New Capabilities
- `geometry-rotation-core`: Shared geometry and rigid-rotation utility behavior for floor-plan wall operations.

### Modified Capabilities
- `floor-plan-pivot-rotation`: Deterministic pivot endpoint selection is unified across UI and store with non-flipping endpoint guarantees.
- `floor-plan-wall-drawing-editing`: Wall angle editing behavior is aligned to shared pivot/rotation core without changing user-facing draw workflow.

## Impact

- Affected code:
  - src/stores/useRoomStore.ts
  - src/features/closet/views/FloorPlan.vue
  - src/features/closet/domain/geometry/* (new)
  - tests/roomRotation.test.ts
  - tests/drawWallAngles.test.ts (as needed)
- No external API contract change expected.
- Internal domain architecture improves maintainability and reduces duplicated geometry logic.