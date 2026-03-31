## MODIFIED Requirements

### Requirement: Deterministic Pivot Endpoint Selection
The system SHALL choose one pivot endpoint for a selected wall using inside-facing left logic, and SHALL return the same endpoint for the same geometry state. Pivot selection SHALL be computed through one shared pivot utility used by both UI and store logic.

#### Scenario: Pivot Rule Priority Is Enforced
- **WHEN** pivot endpoint is resolved for a selected wall in draw mode
- **THEN** rule priority SHALL be boundary-wall connected-endpoint, then inside-facing geometric projection, then winding fallback
- **THEN** lower-priority rules SHALL NOT override higher-priority rule matches

#### Scenario: Closed Polygon Uses Winding Rule
- **WHEN** a wall is selected in a closed room with at least 3 walls
- **THEN** pivot endpoint SHALL be computed from closed-polygon inside-left semantics using polygon winding
- **THEN** the returned endpoint SHALL be deterministic for that wall index and geometry

#### Scenario: Boundary Wall Uses Connected Endpoint
- **WHEN** selected wall belongs to an open chain and has exactly one connected endpoint
- **THEN** pivot endpoint SHALL be the connected endpoint
- **THEN** pivot endpoint SHALL NOT switch to the free endpoint based on wall angle or chain orientation

#### Scenario: Open Non-Boundary Uses Stable Fallback
- **WHEN** selected wall is open non-boundary and inside-left is derived from structure reference geometry
- **THEN** tie-breaking SHALL be deterministic
- **THEN** repeated calls with unchanged geometry SHALL return the same endpoint

#### Scenario: Pivot Selection Is Click-Independent
- **WHEN** user clicks different points along the same wall body before angle updates
- **THEN** pivot endpoint selection SHALL remain unchanged for the same geometry and topology
- **THEN** wall click position SHALL NOT determine pivot endpoint

### Requirement: Rotation Dispatcher Contract
The public wall-angle action SHALL dispatch to closed-room rigid rotation, boundary-chain rigid rotation, or open-chain local rotation based on topology. Dispatcher branches SHALL call shared rotation utility functions for closed-room and boundary-chain rigid modes.

#### Scenario: Topology-Based Branching
- **WHEN** wall angle is updated for a selected wall
- **THEN** closed topology SHALL route to closed-room rigid rotation via shared utility
- **THEN** boundary topology SHALL route to boundary-chain rigid rotation via shared utility
- **THEN** non-boundary open topology SHALL route to open-chain local behavior

#### Scenario: Closed-Topology Pivot Is Store-Computed
- **WHEN** closed topology receives wall angle update with any UI-provided anchor value
- **THEN** closed-room branch SHALL compute pivot from store-side winding semantics
- **THEN** UI-provided anchor SHALL NOT change closed-room pivot endpoint
