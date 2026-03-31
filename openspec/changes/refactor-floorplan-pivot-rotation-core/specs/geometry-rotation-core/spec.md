## ADDED Requirements

### Requirement: Shared Geometry Primitives
The system SHALL provide shared geometry primitives for wall endpoint, angle normalization, polygon area/centroid, approximate point equality, and point rotation around pivot.

#### Scenario: Primitives are reusable across layers
- **WHEN** floor-plan view and room store require the same geometry operation
- **THEN** both SHALL use the same shared primitive function
- **THEN** duplicated local implementations SHALL NOT be required

### Requirement: Deterministic Pivot Selection Utility
The system SHALL provide one topology-aware pivot selection utility that returns a deterministic endpoint and pivot point for a selected wall.

#### Scenario: Topology-aware pivot selection
- **WHEN** selected wall topology is closed, boundary, or open non-boundary
- **THEN** utility SHALL apply the correct rule branch for that topology
- **THEN** the returned endpoint SHALL be deterministic for unchanged geometry

### Requirement: Reusable Rigid Rotation Transformers
The system SHALL provide reusable rigid-rotation transformations for closed-room and boundary-chain rotation modes.

#### Scenario: Closed-room rigid transformation
- **WHEN** closed-room rotation is requested with a selected wall and delta angle
- **THEN** all walls SHALL be transformed as one rigid structure around the selected pivot
- **THEN** wall lengths and polygon closure SHALL be preserved

#### Scenario: Boundary-chain rigid transformation
- **WHEN** boundary-chain rotation is requested with selected anchor endpoint and delta angle
- **THEN** all walls in the connected chain SHALL rotate as one rigid structure
- **THEN** the selected anchor endpoint SHALL remain fixed

### Requirement: Shared Topology Connectivity Utilities
The system SHALL provide connectivity utilities for determining endpoint attachment and boundary-wall classification.

#### Scenario: Boundary detection consistency
- **WHEN** boundary-wall classification is evaluated in view and store paths
- **THEN** both paths SHALL use shared connectivity utilities
- **THEN** classification result SHALL be consistent for identical wall geometry
