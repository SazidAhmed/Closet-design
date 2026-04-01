## Context

The floor-plan rotation dispatcher currently has:
- Closed room rigid rotation.
- Boundary selected-wall rigid chain rotation.
- Open fallback local behavior.

The gap is open topology where selected wall has both endpoints connected. Local fallback can move the wrong part of the structure and violate user expectation that only the pivot-side angle changes while non-pivot downstream corners stay fixed.

## Goals / Non-Goals

Goals:
- Add a dedicated dispatcher branch for open + both-connected selected wall.
- Rotate only one connected side as a rigid chain around the pivot endpoint.
- Keep all downstream non-pivot interior angles invariant.
- Preserve existing behavior for closed and boundary branches.

Non-Goals:
- No pivot-rule redesign.
- No UI control redesign.
- No change to public action signatures.

## Decisions

1. Branch order remains topology-first
- Closed room branch first.
- Boundary selected-wall branch second.
- New open both-connected branch third.
- Existing open fallback last.

2. One-side traversal is anchor-directed
- Anchor `start`: include selected wall and traverse only through end connectivity.
- Anchor `end`: include selected wall and traverse only through start connectivity.
- Stop at first disconnection or visited node.

3. Rigid transformation preserves corner angles
- Rotate collected chain vertices around fixed pivot with existing point-rotation helper.
- Rebuild walls from consecutive rotated vertices.
- This keeps local angles within the rotated side unchanged.

4. UI/store contract unchanged
- UI still computes deterministic inside-left anchor.
- Store still accepts `setWallAngle(wallId, angleRad, anchor)`.

5. Inside-left projection orientation is explicit
- Decision: endpoint projection uses `left = (-insideY, insideX)`.
- Rationale: this matches inside-left semantics in current floor-plan screen space and prevents opposite-endpoint pivot selection.
- Consequence: open-wall cases (including boundary and both-connected; for example selected wall 1, 2, or 3 in the 1-2-3-4 topology) consistently choose the expected green-marked pivot.

## Invariants

- Pivot endpoint remains fixed during update.
- Pivot-side angle changes according to requested wall angle.
- Non-pivot downstream corner angles remain unchanged.
- Connectivity inside the rotated side remains continuous.

## Risks / Mitigation

- Risk: branch overlap between boundary and both-connected checks.
  - Mitigation: keep boundary check before both-connected check.
- Risk: cycle traversal on malformed topology.
  - Mitigation: visited-index guard.
- Risk: numeric drift during repeated edits.
  - Mitigation: reuse existing epsilon policy and angle normalization.

## Verification Strategy

- Add unit tests for open both-connected selected wall with anchor `start` and `end`.
- Add explicit invariant tests that downstream 90-degree corners remain unchanged in representative topology.
- Verify UI anchor selection does not flip to the opposite endpoint for representative wall-1 (boundary), wall-2, and wall-3 cases.
- Run existing closed-room and boundary tests as regression.
