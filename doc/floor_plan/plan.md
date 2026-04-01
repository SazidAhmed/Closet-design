
## Plan: One-Side Pivot Rotation For Open Chain

Add a dedicated rotation path for open rooms when the selected wall is connected on both endpoints: rotate only the non-pivot side as one rigid chain around the inside-left pivot, so the pivot-side angle changes (for example wall 1-2 or wall 3-2 depending on selected wall), while all downstream/non-pivot local corner angles remain unchanged (including both bottom 90 degree corners in your wall-2 scenario).

**Steps**

1. Phase 1 - Branching design in store: update setWallAngle dispatcher in [src/stores/useRoomStore.ts](src/stores/useRoomStore.ts#L366) to insert a new branch after closed-room and boundary checks. Condition: room is open and selected wall has both endpoints connected. Output: call a new one-side chain rotator and return early. Depends on existing helpers findWallConnectedToStart and findWallConnectedToEnd.
2. Phase 2 - One-side chain traversal: add a helper in [src/stores/useRoomStore.ts](src/stores/useRoomStore.ts) that builds a chain starting from selected wall and traverses only away from pivot. If anchor is start, traverse through end links only; if anchor is end, traverse through start links only. Stop at first disconnection or revisit guard.
3. Phase 3 - Rigid geometry update: in the new helper, compute pivot from selected wall endpoint (based on anchor), rotate all collected vertices with existing rotatePointAroundPivot, then rebuild each wall from consecutive rotated vertices using normalizeAngle. This preserves all non-pivot interior angles on that rotated side, including the opposite corner angle.
4. Phase 4 - Keep existing paths intact: do not change rotateClosedRoom, rotateBoundaryChain, or current open-chain fallback except for the new early branch. This keeps yesterday’s completed behavior stable for closed rooms and boundary-selected walls.
5. Phase 5 - UI/store contract validation: keep FloorPlan anchor source unchanged (insideLeftAnchorTypeForWall in [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue#L687)). Confirm setSelectedWallAngleDeg still recomputes anchor and passes it to store each update.
6. Phase 6 - Tests (parallelizable with Phase 5 after Phase 1-3): extend [tests/roomRotation.test.ts](tests/roomRotation.test.ts) with open-room both-connected scenarios covering anchor=start and anchor=end. Assert: pivot point remains fixed, pivot-side angle changes, opposite-side local angle stays constant, and rotated side remains internally connected.
7. Phase 7 - Regression verification: run current rotation tests to ensure no regressions in closed-room and boundary-wall behavior.

**Relevant files**

- [src/stores/useRoomStore.ts](src/stores/useRoomStore.ts) - primary implementation; setWallAngle branching and new one-side chain rotator.
- [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue) - anchor determination and angle-update call path to verify no contract change required.
- [tests/roomRotation.test.ts](tests/roomRotation.test.ts) - add targeted tests for the new both-connected open-room branch.
- [doc/floor_plan/Pivot-Point-Determination.md](doc/floor_plan/Pivot-Point-Determination.md) - update behavior documentation after implementation.

**Verification**

1. Unit test: open shape with one disconnected joint and selected wall connected at both ends; rotate selected wall and verify only pivot-side angle changes.
2. Unit test: all non-pivot downstream corner angles remain unchanged (for example for selected wall 2, both wall2-wall3 and wall3-wall4 corners remain 90 degrees).
3. Unit test: pivot endpoint stays numerically fixed across repeated updates within tolerance.
4. Unit test: branch precedence remains correct (closed room first, boundary wall second, both-connected-open third, fallback last).
5. Manual check in draw mode on the same topology as your image: selecting wall 2 and changing angle should rotate around the green-circled endpoint, change only wall1-wall2 angle, and keep both bottom corner geometries unchanged.

**Decisions**

- Included scope: only the new open-room + both-end-connected selected-wall behavior.
- Excluded scope: redesign of pivot rule, click-based pivot logic, and closed-room rotation math.
- Assumption used: left side is already provided correctly by insideLeftAnchorTypeForWall and passed as anchor to setWallAngle.

**Further Considerations**

1. Precision policy: reuse existing epsilon thresholds in store rotation logic to avoid drift.
2. Safety guard: keep visited-wall protection during traversal to prevent accidental loops in malformed wall graphs.
3. Test fixtures: add one minimal topology matching your screenshot so expected angle invariants are explicit and easy to debug.
