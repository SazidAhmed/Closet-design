## Plan: Fix Wall Connectivity Color And Joint Seam

Update Floor Plan drawing so endpoint connectivity state is computed from exact continuation geometry (no Add Wall start drift), which will turn wall 5 endpoint yellow once wall 6 connects. Then apply a minimal-visual-change joint rendering polish only if needed after geometry fix. Validate with integration tests plus manual SVG inspection for the red-marked seam area.

**Steps**
1. Phase 1: Confirm and isolate current failure path in FloorPlan Add Wall flow.
2. In [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue), trace continueDrawing, continuationStartVertexForWall, pendingStartVertex seeding, and wall creation click handling to verify where coordinate snapping is applied before new wall creation.
3. Capture dependency: connectivity color logic in isConnectedVertex and vertex rendering must use the same geometry tolerance assumptions as continuation seeding.
4. Phase 2: Fix connectivity state at source (blocks all downstream visual correctness).
5. Change Add Wall continuation seeding so pendingStartVertex starts from the exact continuation endpoint coordinate, not grid-snapped values.
6. Preserve existing snapped-45 behavior for user-directed segment direction so only the start anchor precision changes, not drawing UX.
7. Keep anchor/pivot determinism untouched: do not alter insideLeftAnchorTypeForWall or setWallAngle anchor endpoint type stability.
8. Phase 3: Resolve joint artifact with minimal visual delta (depends on Phase 2 visual result).
9. Re-check the wall 6-wall 5 joint after precise connectivity fix; if artifact remains, apply minimal SVG rendering polish in wall polygon rendering:
10. Add explicit stroke-linejoin and stroke-linecap attributes for wall polygons to reduce micro-seams without changing interaction contracts.
11. If seam still appears at some angles, apply a tiny vertex-dot radius increase only at connected junctions as a secondary visual mask, avoiding broad style shifts.
12. Keep inside-side guide geometry logic unchanged unless strictly necessary, to avoid touching regression-sensitive pivot/inside contracts.
13. Phase 4: Add regression coverage (parallel with late Phase 3 polish validation).
14. Extend [tests/floorPlan.pivot.integration.test.ts](tests/floorPlan.pivot.integration.test.ts) to assert endpoint color transition for Add Wall continuation case:
15. Before connection: selected free endpoint renders green.
16. After adding connecting wall: same endpoint renders yellow.
17. Add assertion that new wall start coordinate is within connectivity tolerance of continuation endpoint.
18. Add DOM-level assertion for wall polygon join/cap attributes if Phase 3 polish is applied.
19. Phase 5: Verification and contract check.
20. Run targeted floor-plan regression suite, then full test run if touched behavior intersects pivot/rotation flow.
21. Perform manual UI verification on the exact user scenario: preset -> select wall 5 -> Add Wall -> draw wall 6, then inspect endpoint color and seam area in normal zoom and one alternate zoom level.

**Relevant files**
- [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue) - Add Wall continuation start seeding, endpoint color rendering, and wall polygon SVG attributes.
- [src/stores/useRoomStore.ts](src/stores/useRoomStore.ts) - Connectivity tolerance/reference behavior cross-check only; modify only if needed to keep consistency.
- [tests/floorPlan.pivot.integration.test.ts](tests/floorPlan.pivot.integration.test.ts) - Extend Add Wall continuation coverage for endpoint color and coordinate continuity.
- [tests/insideWallSide.test.ts](tests/insideWallSide.test.ts) - Reference-only guardrail for inside-side logic if any geometry-adjacent rendering touches are considered.
- [AGENTS.md](AGENTS.md) - Floor-plan deterministic pivot/anchor and Add Wall continuation contract constraints.

**Verification**
1. Run npm test and confirm existing pivot/rotation tests remain green.
2. If test runtime is long, first run floor-plan sensitive tests: tests/floorPlan.pivot.integration.test.ts, tests/roomRotation.test.ts, tests/roomRotation.openBothConnected.test.ts.
3. Manual scenario check in UI:
4. Apply open preset, select wall 5, click Add Wall, draw wall 6 from the free endpoint.
5. Confirm previous green endpoint on wall 5 turns yellow after connection.
6. Confirm the wall 6-wall 5 joint no longer shows the visible seam in the red-marked area, with minimal style difference.

**Decisions**
- User requirement: wall 5 endpoint must become yellow once connected on both sides.
- User preference: pick the approach that removes the connection artifact with minimal visual change.
- Included scope: FloorPlan Add Wall continuation precision, endpoint rendering correctness, and local joint visual polish.
- Excluded scope: redesign of inside-side indicator system, store contract refactors, and pivot algorithm changes.

**Further Considerations**
1. If product wants strict grid adherence for continuation starts, use exact internal coordinate for connectivity while snapping only displayed preview coordinates.
2. If seam remains on high-DPI displays, consider adding an opt-in visual regression step with browser-based snapshot tooling later (outside this bug fix scope).
