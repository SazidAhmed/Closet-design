# Capability: Quote Request And Validation Pipeline

## Intent
Define consistent export, validation, and quote request behavior for closet pricing.

### Requirement: Backend Export Normalization
The quote payload SHALL be exported from closet state in a stable, JSON-safe form with clamped numeric ranges.

#### Scenario: Export Payload Shape
Given a valid closet state  
When quote request payload is built  
Then payload includes schemaVersion, units, closetType, cabinet, towers, materials, doorOptions, and summarized room fields  
And numeric dimensions are clamped to allowed backend-safe ranges.

### Requirement: Validation Produces Structured Violations
Validation SHALL return machine-readable violations with severity, code, message, and optional path.

#### Scenario: Constraint Violation Reporting
Given closet dimensions or accessories outside constraints  
When validation runs  
Then violations include deterministic code and path  
And severity is error for invalid constraints  
And warning for non-blocking fit/sanity concerns.

### Requirement: Debounced Quote Scheduling
The quote store SHALL debounce user-driven quote requests and process only the latest payload.

#### Scenario: Latest Payload Wins
Given multiple quote schedules in short succession  
When debounce window completes  
Then only the latest payload is sent for quote  
And earlier payloads are skipped.

### Requirement: Stale Request Protection
The quote store SHALL abort superseded in-flight requests and ignore late responses.

#### Scenario: Abort And Late Response Guard
Given a newer quote request is started  
When older request returns after being superseded  
Then older result is ignored  
And store state reflects only the latest payload hash result.

### Requirement: Error Handling Contract
The quote pipeline SHALL expose deterministic loading and error state transitions.

#### Scenario: Failed Quote Request
Given quote endpoint responds with non-success  
When request fails  
Then error contains response details when available  
And result is cleared  
And loading state is finalized for the active payload.
