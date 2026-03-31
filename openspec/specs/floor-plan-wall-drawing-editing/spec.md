# Capability: Floor Plan Wall Drawing And Editing

## Intent
Specify behavior for draw-walls workflow, snapping, closure, and per-wall editing in floor-plan mode.

### Requirement: Draw Session Lifecycle
The system SHALL support explicit start, continue, and stop behavior for draw sessions.

#### Scenario: Start Fresh Draw
Given draw mode is active  
When user starts a fresh draw session  
Then room shape becomes custom  
And walls/items drawing state is reset  
And drawing is ready for first anchor placement.

#### Scenario: Continue Existing Chain
Given walls already exist in draw mode  
When user continues drawing  
Then the next segment starts from selected anchor or chain endpoint  
And drawing resumes without resetting existing geometry.

### Requirement: Wall Segment Creation With Snapping
New walls SHALL be created from previous endpoint using grid and 45-degree directional snapping.

#### Scenario: Add Wall Segment
Given at least one valid start vertex  
When user places next vertex  
Then the segment is snapped to 45-degree lattice direction  
And endpoint is grid-snapped  
And thickness is clamped to allowed range.

### Requirement: Closure Behavior
The system SHALL close the room when user targets near the first vertex.

#### Scenario: Close Room Near First Vertex
Given at least two drawn segments  
When cursor or click is within closure threshold of first vertex  
Then final segment is added to close polygon  
And closure prefers 45-degree snap only if exact closure is preserved  
And draw state becomes closed.

### Requirement: Wall Editing Properties
Each selected wall SHALL support label, length, thickness, visibility, and angle adjustments.

#### Scenario: Remove Wall
Given a selected wall  
When user removes it  
Then wall is deleted  
And labels are renumbered sequentially  
And closet wall assignment is preserved by assigning first wall if needed.

### Requirement: Stable Viewing During Rotation
The draw canvas frame SHALL remain stable while rotating completed structures.

#### Scenario: Viewbox Lock During Rotation
Given a completed or editing structure  
When rotation begins  
Then viewport lock prevents visual drift from auto-fit recentering  
And unlock occurs when user returns to drawing/editing actions that require auto-fit.
