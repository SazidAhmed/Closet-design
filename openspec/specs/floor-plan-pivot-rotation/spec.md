# Capability: Floor Plan Pivot And Rotation

## Intent
Define deterministic pivot selection and rotation behavior for selected walls so pivot endpoint does not flip unexpectedly.

### Requirement: Deterministic Pivot Endpoint Selection
The system SHALL choose one pivot endpoint for a selected wall using inside-facing left logic, and SHALL return the same endpoint for the same geometry state.

#### Scenario: Pivot Rule Priority Is Enforced
Given a selected wall in draw mode  
When pivot endpoint is resolved  
Then resolution SHALL apply rules in this order: boundary-wall connected-endpoint, inside-facing geometric projection, winding fallback  
And lower-priority rules SHALL NOT override higher-priority rule matches.

#### Scenario: Closed Polygon Uses Winding Rule
Given a closed room with at least 3 walls  
When a wall is selected for rotation  
Then the pivot endpoint is computed from closed-polygon inside-left semantics using polygon winding  
And the returned endpoint is deterministic for that wall index and geometry.

#### Scenario: Boundary Wall Uses Connected Endpoint
Given an open chain where the selected wall has exactly one connected endpoint  
When the wall is selected for rotation  
Then the pivot endpoint SHALL be the connected endpoint  
And SHALL NOT switch to the free endpoint based on wall angle or chain orientation.

#### Scenario: Open Non-Boundary Uses Stable Fallback
Given an open non-boundary selected wall  
When inside-left is derived from structure reference geometry  
Then tie-breaking SHALL be deterministic  
And repeated calls with unchanged geometry SHALL return the same endpoint.

#### Scenario: Pivot Selection Is Click-Independent
Given the same selected wall geometry and topology  
When the user clicks different points along the wall body before angle updates  
Then pivot endpoint selection SHALL remain unchanged  
And wall click position SHALL NOT determine pivot endpoint.

### Requirement: Closed-Room Rotation Is Rigid
The system SHALL rotate the entire closed room rigidly around the selected wall pivot.

#### Scenario: Invariants During Closed-Room Rotation
Given a closed room and selected wall  
When a rotation delta is applied  
Then wall lengths remain unchanged  
And wall-to-wall connectivity remains closed  
And the selected pivot point remains fixed in world coordinates.

### Requirement: Boundary-Chain Rotation Is Rigid
The system SHALL rotate the full connected chain around the chosen boundary anchor for boundary walls.

#### Scenario: Chain Rotation Around Connected Anchor
Given a boundary wall and computed anchor endpoint  
When a rotation delta is applied  
Then all walls in the connected chain rotate as a rigid set  
And the anchor endpoint remains fixed  
And chain connectivity remains continuous.

### Requirement: Rotation Dispatcher Contract
The public wall-angle action SHALL dispatch to closed-room rigid rotation, boundary-chain rigid rotation, or open-chain local rotation based on topology.

#### Scenario: Topology-Based Branching
Given a selected wall  
When wall angle is updated  
Then closed topology routes to closed-room rigid rotation  
And boundary topology routes to boundary-chain rigid rotation  
And non-boundary open topology routes to open-chain local behavior.

#### Scenario: Closed-Topology Pivot Is Store-Computed
Given closed topology and any UI-provided anchor value  
When wall angle is updated  
Then closed-room rotation SHALL compute pivot from store-side winding semantics  
And UI-provided anchor SHALL NOT change closed-room pivot endpoint.
