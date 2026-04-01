## 1. Dispatcher Branch

- [ ] 1.1 Add open both-connected topology check in `setWallAngle` after boundary branch.
- [ ] 1.2 Route this check to a new one-side rigid rotation helper and return early.
- [ ] 1.3 Keep closed-room and boundary branches unchanged.

## 2. One-Side Rigid Rotation Helper

- [ ] 2.1 Implement anchor-directed traversal that collects only the side away from pivot.
- [ ] 2.2 Build ordered chain vertices and rotate around fixed pivot endpoint.
- [ ] 2.3 Rebuild walls from rotated vertices with normalized angles.
- [ ] 2.4 Add traversal visited guard and tolerance-safe comparisons.

## 3. Tests

- [ ] 3.1 Add open both-connected test for anchor `start`.
- [ ] 3.2 Add open both-connected test for anchor `end`.
- [ ] 3.3 Add invariant test: non-pivot downstream corner angles remain unchanged.
- [ ] 3.4 Add representative topology test matching wall labels 1-2-3-4 scenario.

## 4. Regression + Docs

- [ ] 4.1 Run rotation test suite and verify no closed-room regression.
- [ ] 4.2 Verify boundary-wall behavior remains unchanged.
- [ ] 4.3 Update floor-plan pivot documentation for new branch behavior.
