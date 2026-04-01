## 1. Dispatcher Branch

- [x] 1.1 Add open both-connected topology check in `setWallAngle` after boundary branch.
- [x] 1.2 Route this check to a new one-side rigid rotation helper and return early.
- [x] 1.3 Keep closed-room and boundary branches unchanged.

## 2. One-Side Rigid Rotation Helper

- [x] 2.1 Implement anchor-directed traversal that collects only the side away from pivot.
- [x] 2.2 Build ordered chain vertices and rotate around fixed pivot endpoint.
- [x] 2.3 Rebuild walls from rotated vertices with normalized angles.
- [x] 2.4 Add traversal visited guard and tolerance-safe comparisons.

## 3. Tests

- [x] 3.1 Add open both-connected test for anchor `start`.
- [x] 3.2 Add open both-connected test for anchor `end`.
- [x] 3.3 Add invariant test: non-pivot downstream corner angles remain unchanged.
- [x] 3.4 Add representative topology test matching wall labels 1-2-3-4 scenario.

## 4. Regression + Docs

- [x] 4.1 Run rotation test suite and verify no closed-room regression.
- [x] 4.2 Verify boundary-wall behavior remains unchanged.
- [x] 4.3 Update floor-plan pivot documentation for new branch behavior.
- [x] 4.4 Fix inside-left projection orientation in UI anchor selection to prevent opposite-endpoint pivot flips in both-connected open cases.
