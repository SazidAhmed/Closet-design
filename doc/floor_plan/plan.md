# Wall Length Growth-Side Implementation Plan

## Goal
Implement deterministic wall-length growth behavior for all connectivity topologies while preserving geometry continuity and reusing the same draw-canvas viewport locking strategy already used for wall rotation.

## Scope
- In scope:
  - Wall length edit behavior in floor plan draw mode.
  - Connectivity-safe geometry updates for selected wall and affected neighbors.
  - Viewport lock/unlock behavior during length edits to prevent recenter drift.
  - Regression tests for connectivity + viewport stability.
- Out of scope:
  - Door/window placement rules.
  - New drawing flow changes unrelated to wall length.
  - 3D scene behavior.

## Existing Contracts To Preserve
1. No disconnections: any shared endpoint before edit remains shared after edit.
2. Deterministic behavior: growth side must not depend on click jitter.
3. Store ownership: geometry mutation stays in room store actions.
4. Closed room integrity: maintain valid closed loop for closed topologies.
5. Viewport stability: follow the same lock pattern used by rotation to avoid apparent drift.

## Topology Rules For Length Growth
1. Both endpoints connected (closed room or internal attached wall)
	- Increase selected wall length from configured growth side (default: right-side behavior).
	- Move affected connected chain(s) rigidly so unselected wall lengths/angles remain unchanged.
	- Keep all joints connected.

2. One endpoint connected (boundary wall)
	- Connected endpoint acts as anchor unless growth-side policy requires opposite-side movement.
	- Free endpoint extends/retracts along selected wall direction.
	- If edit would otherwise break the connected side, translate connected neighbors rigidly to preserve continuity.

3. No endpoints connected (standalone wall)
	- Adjust selected wall only, by moving the side dictated by growth direction.
	- No neighbor compensation needed.

4. Hard constraint
	- Never create gaps between previously connected walls.

## Viewport Rules (Must Match Rotation Behavior)
Use the existing draw-canvas frame locking approach already used during rotation:

1. Before applying continuous length updates (drag or repeated +/- controls):
	- Lock draw viewBox to current frame.

2. During the edit sequence:
	- Keep locked viewBox unchanged even if geometry bounds change.
	- Do not auto-fit each incremental update.

3. On edit completion/cancel:
	- Unlock using the same lifecycle triggers used by rotation/draw-flow transitions.
	- Preserve current existing unlock points (draw mode switches, clear/remove/undo flow).

4. Rule of consistency:
	- Length-edit lock/unlock entry points should call the same helper functions already used by rotation, not a duplicate viewport mechanism.

## Implementation Steps
1. Add/confirm a single room-store action for length updates by wall id and growth-side intent.
2. In that action, classify selected wall connectivity (both/one/none connected).
3. Implement topology branches:
	- Both-connected branch: apply selected wall delta and rigidly move required connected structure.
	- One-connected branch: anchor connected side, move free side, and compensate if needed.
	- None-connected branch: local endpoint adjustment only.
4. Ensure endpoint snapping/precision rules remain consistent with current wall model.
5. In floor plan view interaction handlers:
	- Lock viewport at edit start.
	- Apply incremental length updates.
	- Unlock on end/cancel using existing viewport lifecycle behavior.
6. Keep selection/anchor state stable during repeated increments to avoid side flipping.

## Data And API Notes
1. Keep internal units in centimeters as currently defined.
2. Convert only at input/output UI boundaries.
3. Preserve existing public action signatures unless change is required; if changed, update call sites in one pass.

## Regression Test Plan
1. Store-level tests (new file suggested: tests/wallLengthGrowth.test.ts)
	- Both-connected: selected wall grows, other walls keep dimensions, connectivity preserved.
	- One-connected: free side extends correctly, connected side remains attached.
	- None-connected: only selected wall changes.
	- Repeated increments: no accumulated disconnections.

2. Integration tests (extend floor plan integration suite)
	- During repeated length updates, SVG viewBox remains fixed while locked.
	- After edit completion, normal viewport lifecycle resumes.
	- No visual recenter drift during incremental edits.

3. Invariants asserted in tests
	- Shared endpoints remain coincident within epsilon.
	- Unselected wall lengths unchanged where branch contract requires.
	- Closed topology remains closed.
	- ViewBox before/after incremental sequence remains equal while lock is active.

## Verification Commands
1. npm test
2. npm run build

## Risks And Mitigations
1. Risk: branching logic overlaps with rotation topology utilities.
	- Mitigation: reuse existing connectivity helpers and chain traversal utilities where possible.

2. Risk: viewport lock not released on all exits.
	- Mitigation: wire lock/unlock through existing helper functions and verify cancel/undo/remove flows.

3. Risk: side selection flips during repeated updates.
	- Mitigation: store growth-side intent at interaction start and keep it stable until interaction ends.

## Definition Of Done
1. All three connectivity modes and no-disconnection rule behave deterministically.
2. Length edits keep canvas framing stable using the same viewport lock rules as rotation.
3. Tests cover geometry invariants and viewport lock stability.
4. npm test and npm run build pass.
