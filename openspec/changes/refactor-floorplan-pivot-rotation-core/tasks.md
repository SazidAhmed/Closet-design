## 1. Geometry Core Scaffolding

- [ ] 1.1 Create domain geometry module structure under src/features/closet/domain/geometry
- [ ] 1.2 Implement shared primitives for wall endpoint, angle normalization, signed area, centroid, point rotation, and approximate equality
- [ ] 1.3 Centralize and export numeric tolerances used by geometry comparisons

## 2. Pivot And Topology Utilities

- [ ] 2.1 Implement shared endpoint connectivity and boundary-wall classification helpers
- [ ] 2.2 Implement deterministic pivot selection utility for closed, boundary, and open non-boundary topologies
- [ ] 2.3 Add deterministic tie-break behavior tests for near-degenerate open fallback cases

## 3. Reusable Rotation Utilities

- [ ] 3.1 Implement closed-room rigid rotation utility around selected-wall pivot
- [ ] 3.2 Implement boundary-chain rigid rotation utility around selected anchor endpoint
- [ ] 3.3 Add unit tests validating rigid invariants (length preservation, connectivity, fixed pivot/anchor)

## 4. Store And View Refactor

- [ ] 4.1 Refactor useRoomStore to use shared pivot and rotation utilities while preserving setWallAngle signature
- [ ] 4.2 Refactor FloorPlan wall anchor/angle update flow to use shared pivot selector
- [ ] 4.3 Remove duplicated geometry helpers from store and view once utility wiring is complete

## 5. Regression Coverage And Verification

- [ ] 5.1 Expand roomRotation tests for boundary-chain behavior and repeated non-flipping pivot endpoint checks
- [ ] 5.2 Update or add draw-wall angle tests for shared pivot/rotation integration behavior
- [ ] 5.3 Run test suite and verify no closed-room behavioral regressions or UX flow regressions in draw mode
