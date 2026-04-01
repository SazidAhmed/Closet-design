## Context

Floor-plan geometry behavior currently spans two runtime layers:
- UI-side wall selection and angle updates in FloorPlan view.
- Store-side topology and rotation logic in useRoomStore.

Both layers contain overlapping math (pivot endpoint detection, connectivity checks, area/winding logic, and rotation helpers). This duplication increases the chance of behavior drift, especially for closed-room and boundary-wall rotations where endpoint stability is critical.

Constraints:
- Preserve current user-facing editing flow.
- Keep store action signatures stable to avoid broad call-site changes.
- Maintain deterministic behavior for repeated rotations under floating-point tolerance.

## Goals / Non-Goals

**Goals:**
- Define one shared pivot-selection contract used by both view and store.
- Define reusable rigid-rotation utilities for closed-room and boundary-chain cases.
- Remove duplicated geometry helpers from view/store where practical.
- Preserve topology and geometric invariants in closed-room and boundary-chain rotations.
- Expand tests to lock deterministic endpoint behavior and rotation invariants.

**Non-Goals:**
- Redesign floor-plan UI interactions or side panels.
- Change quote, material, or unrelated closet domain behavior.
- Introduce external geometry libraries.
- Modify public route structure or app navigation.

## Decisions

1. Shared geometry module under closet domain
- Decision: Add domain-scoped utilities under src/features/closet/domain/geometry.
- Rationale: Geometry rules are feature-domain behavior, not generic app utils.
- Alternative considered: src/lib for shared helpers. Rejected because pivot/rotation semantics are closet floor-plan specific.

2. Deterministic pivot contract with topology-aware rules
- Decision: Use one reusable pivot selector with explicit branch priority:
  - Closed polygon: inside-left by winding.
  - Open wall (including boundary): inside-left by geometric projection when available.
  - Open fallback: winding/deterministic tie-break when projection is degenerate.
- Rationale: Enforces non-flipping endpoint guarantee while preserving expected boundary behavior.
- Alternative considered: UI-only anchor computation with store fallback. Rejected due to drift risk.

3. Reusable rigid rotation as pure transformations
- Decision: Implement reusable transformation functions that accept walls/topology input and return rotated geometry.
- Rationale: Improves testability and avoids mutation-heavy duplicated code paths.
- Alternative considered: Keep all rotation logic inline in store actions. Rejected for maintainability and duplication.

4. Keep setWallAngle action signature stable
- Decision: Preserve existing action signature and dispatch behavior while replacing internals.
- Rationale: Minimizes integration risk with existing UI calls.
- Alternative considered: New API surface for rotation mode selection. Rejected as unnecessary scope expansion.

5. Centralized tolerances
- Decision: Use shared tolerance constants for equality/comparison checks where feasible.
- Rationale: Prevents view/store/test divergence at threshold boundaries.
- Alternative considered: Leave local epsilons in each file. Rejected because it reintroduces nondeterminism risk.

## Risks / Trade-offs

- [Risk] Floating-point edge cases near tie thresholds can still produce unexpected branch decisions.
  -> Mitigation: deterministic tie-break rules and targeted regression tests for near-degenerate geometry.

- [Risk] Refactor could subtly alter behavior of open-chain branch.
  -> Mitigation: preserve dispatcher branching and add branch-specific tests before/after refactor.

- [Risk] Large function extraction from store may introduce temporary churn in types/imports.
  -> Mitigation: extract in small steps and run unit tests after each phase.

- [Trade-off] More modules increase file count.
  -> Mitigation: keep module boundaries clear and domain-scoped.

## Migration Plan

1. Add new geometry and rotation utility modules with pure helper functions.
2. Refactor store internals to consume utilities while keeping public action signatures unchanged.
3. Refactor FloorPlan pivot/anchor derivation to call shared selector.
4. Remove obsolete local duplicate helpers.
5. Expand tests for deterministic pivot and rigid-rotation invariants.
6. Validate via automated tests and manual draw-mode rotation checks.

Rollback strategy:
- Revert utility wiring commit while keeping baseline specs and tests for diagnosis.
- Restore previous store/view local helper usage if regression blocks release.

## Open Questions

- Should open non-boundary fallback include wall-id-based tie-break as final deterministic step, or endpoint-order-only tie-break is sufficient?
- Should tolerance constants live in geometry module only, or in constraints as part of domain-wide numeric policy?
- Do we include item-anchor movement invariants in this change, or defer to a follow-up capability?