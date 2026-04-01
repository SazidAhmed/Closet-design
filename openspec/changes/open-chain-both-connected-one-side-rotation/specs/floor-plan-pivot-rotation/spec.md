## MODIFIED Requirements

### Requirement: Rotation Dispatcher Contract
The public wall-angle action SHALL dispatch to closed-room rigid rotation, boundary-chain rigid rotation, open both-connected one-side rigid rotation, or open fallback local rotation based on topology.

#### Scenario: Topology-Based Branching Includes Open Both-Connected Case
- **WHEN** wall angle is updated for a selected wall
- **THEN** closed topology SHALL route to closed-room rigid rotation
- **THEN** boundary topology (exactly one connected endpoint on selected wall) SHALL route to boundary-chain rigid rotation
- **THEN** open topology where selected wall has both endpoints connected SHALL route to one-side rigid rotation
- **THEN** all other open topology cases SHALL route to fallback local behavior

### Requirement: Open Both-Connected One-Side Rigid Rotation
For open topology with a selected wall connected at both endpoints, the system SHALL rotate only the anchor-opposite connected side as a rigid chain around the selected pivot endpoint.

#### Scenario: Pivot-Side Joint Changes And Downstream Corners Stay Fixed
- **GIVEN** an open structure where the selected wall has both endpoints connected and at least one disconnection exists elsewhere
- **WHEN** selected wall angle is updated using the computed pivot anchor
- **THEN** the joint angle at the pivot endpoint SHALL change according to requested wall angle
- **THEN** non-pivot downstream interior corner angles on the rotated side SHALL remain unchanged
- **THEN** connectivity within the rotated side SHALL remain continuous

#### Scenario: Wall 2 Example Keeps Two Downstream Right Angles
- **GIVEN** wall 2 is selected, pivot is at wall1-wall2 endpoint, and wall2-wall3 and wall3-wall4 are both 90 degrees before update
- **WHEN** wall 2 angle is changed from UI
- **THEN** only the wall1-wall2 angle SHALL change
- **THEN** wall2-wall3 SHALL remain 90 degrees
- **THEN** wall3-wall4 SHALL remain 90 degrees
