# Session Plan - 2026-04-25

## Source: /memories/session/plan.md

## Plan: Closed Resize With Fixed Neighbor Lengths

Implement closed-room wall-length resizing so only the selected wall length changes, connected wall lengths stay unchanged, connected wall angles/positions may update, and the floor-plan viewport remains visually stable (no jump/drift) during edits.

**Steps**
1. Baseline current failure with explicit invariants from your screenshots.
- Reproduce closed 4-wall case where increasing wall 4 currently changes wall 3 length and shifts frame.
- Capture baseline invariants for tests:
- Selected wall length changes by requested delta.
- Non-selected wall lengths remain constant.
- Room remains closed after each edit.
- Draw frame does not visibly jump during repeated edits.

2. Refactor closed-loop branch in resizeWallLength to preserve non-selected lengths.
- Target h:/Vue/Closet/src/stores/useRoomStore.ts inside resizeWallLength looped branches (growth from end/start).
- Replace current bridge-wall rebuild behavior that uses setWallFromPoints on one bridge (this currently changes bridge length).
- Introduce a closed-loop solve strategy based on vertex-chain constraints:
- Keep segment lengths fixed for all non-selected walls.
- Move/solve vertices so endpoint connectivity is preserved.
- Update wall angles/positions from solved vertices.
- Maintain deterministic behavior using existing winding/pivot helpers where relevant.
- Depends on Step 1.

3. Define solver behavior for infeasible deltas (hard constraints).
- Add explicit fallback policy when exact closed solution is impossible for requested delta:
- Preferred: clamp to max feasible delta while keeping closure and fixed non-selected lengths.
- Alternative: reject update (no-op) if clamp is not acceptable.
- Keep behavior deterministic and testable; avoid silent topology break.
- Depends on Step 2.

4. Keep viewport stable for closed-room length edits.
- In h:/Vue/Closet/src/features/closet/views/FloorPlan.vue, maintain a stable locked draw frame during repeated closed-room length edits so the scene does not recenter or drift.
- Ensure lock lifecycle remains compatible with existing closed-room rotation contract and open-topology behavior.
- If a lock refresh is needed, apply it only in a way that does not produce visible jump.
- Parallel with Step 3 after Step 2 starts.

5. Add/extend tests to encode the new rule set.
- Store tests in h:/Vue/Closet/tests/wallLengthGrowth.test.ts:
- New closed-room increase test asserting non-selected wall lengths are unchanged (including wall 3), closure preserved, selected wall changed.
- Symmetric closed-room decrease test with same invariants.
- Optional infeasible-delta test validating clamp/reject policy.
- Integration tests in h:/Vue/Closet/tests/floorPlan.pivot.integration.test.ts:
- Closed-room repeated length increases keep frame visually stable (no jump across repeated inputs).
- Closed-room grow then shrink returns to near-baseline geometry within tolerance.
- Depends on Steps 2-4.

6. Verification and regression safety.
- Run targeted suites first:
- wallLengthGrowth
- floorPlan.pivot.integration
- roomRotation + roomRotation.openBothConnected
- Then run full suite with npm test.
- Validate no regressions in pivot endpoint stability and closed-room rotation behavior.
- Depends on Step 5.

**Relevant files**
- h:/Vue/Closet/src/stores/useRoomStore.ts — resizeWallLength closed-loop logic; endpoint/chain handling.
- h:/Vue/Closet/src/features/closet/views/FloorPlan.vue — draw frame lock lifecycle during closed-room length edits.
- h:/Vue/Closet/tests/wallLengthGrowth.test.ts — store invariants for closed-room grow/shrink.
- h:/Vue/Closet/tests/floorPlan.pivot.integration.test.ts — viewport stability and interaction-level assertions.
- h:/Vue/Closet/tests/roomRotation.test.ts — regression guard for closed rotation invariants.
- h:/Vue/Closet/tests/roomRotation.openBothConnected.test.ts — regression guard for open both-connected behavior.
- h:/Vue/Closet/doc/floor_plan/Wall-Length-Implementation.md — update behavior contract from bridge-length mutation to fixed non-selected lengths.
- h:/Vue/Closet/doc/floor_plan/to_fix.md — close/adjust viewport and resize issue notes.

**Verification**
1. Automated:
- npm test -- wallLengthGrowth (or equivalent targeted command in project setup).
- npm test -- floorPlan.pivot.integration.
- npm test -- roomRotation.
- npm test -- roomRotation.openBothConnected.
- npm test (full suite).
2. Manual:
- Closed rectangle preset in Overhead.
- Increase wall 4 repeatedly: wall 3 stays at original length; angles may change; room stays closed; frame does not jump.
- Decrease wall 4 repeatedly: behavior remains correct and symmetric.
- Grow then shrink back: geometry returns near initial values within tolerance.

**Decisions**
- In scope:
- Closed-room resize semantics change: non-selected wall lengths fixed, angles allowed to change.
- Closed-room viewport stability during length edits.
- Out of scope:
- Reworking open-topology resize semantics.
- Altering pivot endpoint stability rules for angle edits.
- Footer/canvas redesign unrelated to geometry behavior.
- Constraint policy recommendation: clamp-to-feasible delta is preferred over breaking closure.

**Further Considerations**
1. Solver complexity for arbitrary n-wall concave rooms can be higher than current bridge rebuild; start with robust 4-wall and representative multi-wall tests before full generalization.
2. If performance degrades during rapid input, apply lightweight batching/debounce in view-layer event handling without changing store invariants.
3. If clamp-to-feasible is used, include subtle UI feedback so users understand why requested length was not fully applied.
