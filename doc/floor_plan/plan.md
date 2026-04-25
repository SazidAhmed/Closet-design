
## Plan: Closed Resize With Fixed Neighbor Lengths

Implement closed-room wall-length resizing so only the selected wall length changes, connected wall lengths stay unchanged, connected wall angles/positions may update, and the floor-plan viewport remains visually stable (no jump/drift) during edits.

**Steps**

1. Baseline and lock invariants from your reported case.

   - Reproduce closed 4-wall case where increasing wall 4 currently changes wall 3 length and shifts frame.
   - Capture baseline invariants for tests:
     - Selected wall length changes by requested delta.
     - Non-selected wall lengths remain constant.
     - Room remains closed after each edit.
     - Draw frame does not visibly jump during repeated edits.
2. Refactor closed-loop branch in `src/stores/useRoomStore.ts` to preserve non-selected lengths.

   - Target the `resizeWallLength` looped branches (growth from end/start).
   - Replace current bridge-wall rebuild behavior (which changes bridge length) with a solver that:
     - Keeps segment lengths fixed for all non-selected walls.
     - Solves/moves vertices so endpoint connectivity is preserved.
     - Updates wall angles/positions from solved vertices.
   - Maintain deterministic behavior using existing winding/pivot helpers where relevant.
3. Define solver behavior for infeasible deltas (hard constraints).

   - Add explicit fallback policy when exact fixed-length closed solution is impossible:
     - Preferred: clamp to max feasible delta while keeping closure and fixed non-selected lengths.
     - Alternative: reject update (no-op) if clamp is not acceptable.
   - Keep behavior deterministic and testable; avoid silent topology break.
4. Keep viewport stable for closed-room length edits.

   - In `src/features/closet/views/FloorPlan.vue`, maintain a stable locked draw frame during repeated closed-room length edits so the scene does not recenter or drift.
   - Ensure lock lifecycle remains compatible with existing closed-room rotation contract and open-topology behavior.
   - If a lock refresh is needed, apply it only in a way that does not produce visible jump.
5. Add/extend tests to encode the new rule set.

   - Store tests (`tests/wallLengthGrowth.test.ts`):
     - New closed-room increase test asserting non-selected wall lengths are unchanged (including wall 3), closure preserved, selected wall changed.
     - Symmetric closed-room decrease test with same invariants.
     - Infeasible-delta test validating clamp/reject policy.
   - Integration tests (`tests/floorPlan.pivot.integration.test.ts`):
     - Closed-room repeated length increases keep frame visually stable (no jump across repeated inputs).
     - Closed-room grow then shrink returns to near-baseline geometry within tolerance.
6. Verification and regression safety.

   - Run targeted suites:
     - `wallLengthGrowth`
     - `floorPlan.pivot.integration`
     - `roomRotation` + `roomRotation.openBothConnected`
   - Then run full suite with `npm test`.
   - Validate no regressions in pivot endpoint stability and closed-room rotation behavior.

**Relevant files**

- `src/stores/useRoomStore.ts` — `resizeWallLength` closed-loop logic; endpoint/chain handling.
- `src/features/closet/views/FloorPlan.vue` — draw frame lock behavior during closed-room length edits.
- `tests/wallLengthGrowth.test.ts` — store invariants for closed-room grow/shrink.
- `tests/floorPlan.pivot.integration.test.ts` — viewport stability and interaction-level assertions.
- `tests/roomRotation.test.ts` and `tests/roomRotation.openBothConnected.test.ts` — regression guards.
- `doc/floor_plan/Wall-Length-Implementation.md` and `doc/floor_plan/to_fix.md` — update behavior contract and notes.

**Verification**

1. Automated:
   - Run targeted tests (store + integration + pivot/rotation).
   - Then full `npm test`.
2. Manual:
   - Closed rectangle preset in Overhead.
   - Increase wall 4 repeatedly: wall 3 stays at original length; angles may change; room stays closed; frame does not jump.
   - Decrease wall 4 repeatedly: symmetric correctness.
   - Grow then shrink back: geometry returns near initial values within tolerance.

**Decisions**

- In scope:
  - Closed-room resize semantics change: non-selected wall lengths fixed, angles allowed to change.
  - Closed-room viewport stability during length edits.
- Out of scope:
  - Reworking open-topology resize semantics.
  - Altering pivot endpoint stability rules for angle edits.
  - Footer/canvas redesign unrelated to geometry behavior.
- Fallback policy recommendation: clamp-to-feasible delta is preferred over breaking closure.

**Further Considerations**

1. Solver complexity for arbitrary n-wall concave rooms can be higher than current bridge rebuild; start with robust 4-wall and representative multi-wall tests before full generalization.
2. If performance degrades during rapid input, apply lightweight batching/debounce in view-layer event handling without changing store invariants.
3. If clamp-to-feasible is used, include subtle UI feedback so users understand why requested length was not fully applied.
