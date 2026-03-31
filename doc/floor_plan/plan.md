## Plan: Reusable Pivot + Rotation Core

Unify pivot and rotation behavior by extracting deterministic geometry utilities under the closet domain, then refactor both the room store and floor-plan view to consume one shared pivot-selection contract. The key guarantee is that selected-wall pivot endpoint selection remains stable (inside-left rule, connected-endpoint rule for boundary walls) and never flips due to orientation/shape drift.

**Steps**
1. Phase 1 - Baseline contracts and extraction targets.
2. Document a single pivot contract used by both UI and store: closed polygon uses inside-left by winding; boundary wall uses connected endpoint; open non-boundary fallback uses stable structure reference rule. Include explicit tie-breakers for near-degenerate projections so start/end cannot oscillate frame-to-frame.
3. Identify and map duplicated helpers to extract from store/view/tests: wall endpoint math, angle normalization, signed area, centroid, point rotation around pivot, endpoint connectivity checks, and point-equality tolerance handling. This is a pure extraction step with no behavior changes yet. *parallel with step 2*
4. Phase 2 - Create reusable geometry module(s) under closet domain.
5. Add a dedicated geometry utility module under src/features/closet/domain with pure functions for: normalized angle, wall endpoint, signed area, centroid, point rotation, epsilon equality, endpoint connectivity, boundary-wall detection, and deterministic pivot endpoint selection (returns start/end and concrete pivot point).
6. Add a reusable rotation utility module under src/features/closet/domain that provides rigid-rotation builders for: closed-room rotate-around-selected-wall-pivot and connected-chain rotate-around-anchor. Keep functions pure (input walls + params -> transformed walls/vertices) so they are testable independently. *depends on 5*
7. Phase 3 - Refactor store and view to consume shared core.
8. Refactor useRoomStore to replace local pivot/rotation helpers with imported utilities. Keep setWallAngle as dispatcher, but route closed-room and boundary-chain branches through shared reusable rotation functions. Ensure anchor argument handling remains compatible with current action signature. *depends on 5 and 6*
9. Refactor FloorPlan pivot selection to call the shared pivot-selection function so UI and store cannot diverge. Remove duplicated centroid/signed-area/connectivity helper implementations from the view. *depends on 5*
10. Keep existing view behavior for draw interactions (selection/deselection/preview/viewBox lock) unchanged, only swapping pivot/rotation internals to shared core to minimize UI regression risk. *depends on 9*
11. Phase 4 - Regression coverage and hardening.
12. Expand rotation tests to cover boundary-chain behavior (both anchor choices where applicable), open-chain branch invariants, and non-flipping endpoint guarantees across repeated rotations. Reuse shared geometry utilities in tests to avoid duplicate mathematical logic. *depends on 8 and 9*
13. Add focused pivot-selection tests for deterministic endpoint choice across clockwise/counterclockwise closed polygons, boundary walls, and near-degenerate projection tie cases. *depends on 5*
14. Run test suite and verify no behavior regressions in existing closed-room tests. If any expectation changes, update assertions only when aligned to the new single pivot contract. *depends on 12 and 13*

**Relevant files**
- h:/Vue/Closet/src/stores/useRoomStore.ts - replace local helper functions and wire setWallAngle branches to shared rotation/pivot utilities.
- h:/Vue/Closet/src/features/closet/views/FloorPlan.vue - replace insideLeftAnchorTypeForWall internals with shared pivot selection and remove duplicate geometry helpers.
- h:/Vue/Closet/src/features/closet/domain/types/room.ts - reuse Vec2/Wall typing in extracted utilities; extend only if needed for helper input/output types.
- h:/Vue/Closet/src/features/closet/domain - add new reusable geometry + rotation utility modules here (as selected).
- h:/Vue/Closet/tests/roomRotation.test.ts - expand deterministic pivot and boundary/open-chain rotation tests.
- h:/Vue/Closet/tests/drawWallAngles.test.ts - check for opportunities to use shared angle/geometry helpers where it improves consistency.

**Verification**
1. Automated: run unit tests for room rotation and draw-wall angle behavior.
2. Automated: add and run new deterministic pivot tests (closed CW/CCW, boundary, open-chain fallback, tie-break scenarios).
3. Manual: in Draw Walls mode, select the same wall and rotate repeatedly; verify pivot endpoint stays stable and does not jump to opposite endpoint due to orientation/shape changes.
4. Manual: verify closed-room rotation remains rigid (wall lengths + closure preserved) and boundary-chain rotation keeps attached endpoint fixed.
5. Manual: verify quick-room resize and non-rotation floor-plan interactions are unchanged.

**Decisions**
- Open-chain inside rule: Connected-endpoint rule for boundary walls, then stable geometry fallback for non-boundary open chains.
- Utility location: extract reusable modules under src/features/closet/domain/geometry (domain-level, feature-scoped).
- Scope included: pivot selection unification + rotation utility extraction + test hardening.
- Scope excluded: redesign of UI controls, history/undo architecture changes, and unrelated room editing flows.

**Further Considerations**
1. Tolerance constants: centralize epsilon/tolerance values in one utility to prevent store/view/test drift.
2. Backward compatibility: keep setWallAngle public action signature stable to avoid changes in calling components.
3. If open-chain fallback still risks ambiguity in pathological shapes, add a deterministic tie-break (wall id + endpoint order) to guarantee no flips.
