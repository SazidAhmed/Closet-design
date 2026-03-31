## MODIFIED Requirements

### Requirement: Wall Editing Properties
Each selected wall SHALL support label, length, thickness, visibility, and angle adjustments. Angle adjustments SHALL use the shared pivot selection and rotation core while preserving existing draw-mode UX controls.

#### Scenario: Angle Update Uses Shared Core
- **WHEN** user changes selected wall angle in draw mode
- **THEN** pivot endpoint SHALL be resolved by shared pivot selector
- **THEN** rotation execution SHALL use shared rotation utilities for applicable topology branches
- **THEN** existing angle input and increment controls SHALL remain unchanged

#### Scenario: Remove Wall
- **WHEN** user removes a selected wall
- **THEN** wall SHALL be deleted
- **THEN** labels SHALL be renumbered sequentially
- **THEN** closet wall assignment SHALL be preserved by assigning first wall if needed

### Requirement: Stable Viewing During Rotation
The draw canvas frame SHALL remain stable while rotating completed structures.

#### Scenario: Viewbox Lock During Rotation
- **WHEN** rotation begins for a completed or editing structure
- **THEN** viewport lock SHALL prevent visual drift from auto-fit recentering
- **THEN** viewport SHALL unlock when user returns to drawing or editing actions that require auto-fit
