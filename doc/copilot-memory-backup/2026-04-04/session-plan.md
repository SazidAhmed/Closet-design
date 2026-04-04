## Plan: Draw Wall Inside-Side Indicator

Add a clear inside-side visual in Draw Walls mode by rendering a thin line on the wall side defined by drawing direction. The inside rule is fixed to right-hand side of wall direction, so reversing wall direction automatically flips the indicator side. Keep this independent from pivot/rotation anchor logic so existing rotation behavior remains unchanged.

**Steps**
1. Phase 1 - Geometry helper wiring
1. In src/features/closet/views/FloorPlan.vue, add a pure helper that computes inside-edge coordinates from wall start/end, angle, and thickness using right-side perpendicular from drawing direction.
2. Keep the helper local or extract to a small geometry utility if testing requires reuse; do not alter store-side pivot resolution or anchor selection logic.
3. Add a similar helper path for previewWall so users see inside side while actively drawing the next segment.

2. Phase 2 - Draw-mode rendering
1. In the draw-mode SVG wall render loop, add a non-interactive inside indicator line for each visible wall directly on the computed inside edge.
2. Place the indicator layer above wall fill and below labels/dimensions for readability.
3. Add a preview inside indicator line for previewWall during drawing to show side before click placement.
4. Ensure pointer events remain unchanged by setting indicator elements to non-interactive.

3. Phase 3 - Visual polish and guardrails
1. Use a single high-contrast stroke color and thickness that remains visible on selected and unselected walls.
2. Keep indicator line inset/offset tuned so it stays visually attached to the wall body across thickness values 1-30.
3. Confirm behavior in open chains, closed rooms, and after wall angle edits where direction may change.

4. Phase 4 - Tests and regression coverage
1. Add a focused geometry test file (for example tests/floorPlanInsideIndicator.test.ts) for direction-to-inside mapping:
   - Left-to-right segment => inside below
   - Right-to-left segment => inside above
   - Bottom-to-top segment => inside right
   - Top-to-bottom segment => inside left
2. Add tolerance-based assertions for line coordinates and orientation invariants using existing EPS style.
3. Run existing draw/rotation suites to ensure no regressions in wall snapping and rotation branches.

5. Phase 5 - Documentation updates
1. Update doc/floor_plan/FloorPlan-Functionality.md in draw-walls visuals and rotation-context notes to describe inside-side indicator semantics.
2. Update doc/floor_plan/Pivot-Point-Determination.md with a short clarification that visual inside-side marker is direction-based and independent from pivot anchor decision logic.

**Relevant files**
- h:/Vue/Closet/src/features/closet/views/FloorPlan.vue - add inside-edge geometry helpers and SVG indicator rendering for draw walls and preview wall.
- h:/Vue/Closet/tests/drawWallAngles.test.ts - keep current draw behavior regression checks aligned after indicator rendering changes (if touched).
- h:/Vue/Closet/tests/floorPlanInsideIndicator.test.ts - new geometry-only tests for direction-based inside-side mapping.
- h:/Vue/Closet/doc/floor_plan/FloorPlan-Functionality.md - update feature and visual feedback descriptions.
- h:/Vue/Closet/doc/floor_plan/Pivot-Point-Determination.md - add note separating visual inside marker from pivot anchor logic.

**Verification**
1. Automated: run npm run test -- tests/drawWallAngles.test.ts tests/roomRotation.test.ts tests/roomRotation.openBothConnected.test.ts tests/floorPlanInsideIndicator.test.ts.
2. Manual: in Draw Walls mode, draw four single-direction walls to verify side mapping matches your red examples.
3. Manual: reverse wall direction and confirm indicator flips to opposite side immediately.
4. Manual: select and rotate boundary and both-connected walls, verify indicator follows wall direction while pivot behavior remains unchanged.
5. Manual: verify no click/select regressions due to indicator overlay.

**Decisions**
- Scope: Draw Walls mode only.
- Visual style: thin colored line on inside edge.
- Rule: inside is right-hand side of drawing direction.
- Non-goal: no changes to rotation branch logic or deterministic anchor selection.

**Further Considerations**
1. Recommendation: keep the indicator always visible for all draw walls, not only selected, so directional semantics remain obvious during editing.
2. Recommendation: if visual clutter appears on dense plans, add a simple toggle in the Draw Walls sidebar as a follow-up improvement.
