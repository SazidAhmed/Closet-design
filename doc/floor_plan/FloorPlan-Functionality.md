# Floor Plan Component - Functionality Documentation

## Overview
The **FloorPlan.vue** component is a unified 2D floor plan editor for custom or preset room layouts. Quick presets and Draw Walls controls now live in one sidebar and one canvas, so preset rooms are edited with the same wall tools as drawn rooms.

---

## Core Features

### 1. **Quick Preset Setup**
For rapid room setup using predefined layouts.

#### Capabilities:
- **Preset Selection**: Choose from square/open-U/open-L/top-bridge presets
  - Selecting a preset applies full room geometry (walls + closet wall flag)
  - If the current layout is non-empty, a confirmation dialog is shown before replacement

- **Item Placement**: Architecture elements positioned on walls
  - 3 categories: Doors, Architecture (columns/walls), Wall Decorators (windows, vents, switches)
  - Items snap to normalized wall positions (0.0 to 1.0 along each wall)
  - Clamped to 0.05-0.95 range to keep items visually on walls
  - Vertical walls (right/left) automatically rotate items 90°

#### Visual Elements:
- Preset cards shown in the same left sidebar as drawing controls
- Same draw-canvas visual system as custom walls (grid, thick wall polygons, dimension labels)

---

### 2. **Wall Drawing And Editing**
For creating complex, non-rectangular room shapes with manual control.

#### Core Drawing System:

**Wall Snapping & Constraints:**
- **45-degree snapping**: Walls automatically snap to 0°, 45°, 90°, 135°, etc.
- **Grid snap**: Optional 10-unit grid snapping for vertex placement
- **Thickness control**: Configurable per-wall (1-30 units), applied retroactively to existing walls

**Drawing Workflow:**
1. **Start Fresh Draw**: Initializes empty wall chain, enables vertex placement
2. **Add Wall**: Continues from last wall endpoint (skip initial segment setup)
  - If a wall is selected, continuation starts from that wall's non-connected endpoint (green point)
3. **Click to Place**: Each click creates a new wall segment from previous endpoint
   - First click after start sets `pendingStartVertex` as explicit origin
   - Subsequent clicks add walls via `addWallVertex()`
4. **Close Room**: Click near first vertex (within 15 SVG units) to create closing wall
   - Attempts 45° snapping to the first vertex if possible
   - Falls back to direct closure if snap doesn't reach exact start point
5. **Undo**: Remove last wall segment individually (Escape key or button)

#### Room Closure & Rigid Rotation:

**Deterministic Pivot Selection (Click-Independent):**
- Pivot endpoint is resolved by geometry rules, not by click proximity on the wall body
- Anchor selection uses one interior-side rule for placed walls:
  1. Build polygon vertices from current wall chain (`normalizedVerticesForInterior`)
  2. Sample points on both wall sides at the wall midpoint (`+normal` and `-normal`)
  3. Determine which sampled side lies inside the polygon (`pointInPolygon2D`)
  4. Map interior side to anchor endpoint: inside on right => `start`, inside on left => `end`
  5. If side test is degenerate (both/none inside), fallback to winding sign
- This same interior-side decision is also used for store closed-room pivot calculation (`closedWallInteriorSide`), keeping view and store aligned
- Anchor stability during angle edits:
  - Endpoint type (`start` or `end`) is locked when the wall is selected
  - Endpoint type is not recomputed on every incremental angle update
  - Prevents intermittent pivot-side flips in open/boundary rotations (for example, wall-2 switching to the opposite endpoint mid-edit)
- Boundary/open topology does not override this endpoint decision in the UI anchor selector

**Room Closure Detection:**
- `roomIsClosed` getter checks if all walls form a continuous polygon
- Checks that the last wall's endpoint is within 1 unit of the first wall's start
- Requires minimum 3 walls to be considered closed

**Rigid/Local Rotation** (Four-tier priority system with boundary sub-branch):

1. **Closed Room Rotation** (when `isClosed = true`):
   - **Pivot Point Calculation**: (`insideLeftPivot` function)
  - Identifies interior wall side via midpoint side-sampling against room polygon (`closedWallInteriorSide`)
  - Maps interior side to inside-left endpoint (`right` side => wall `START`, `left` side => wall `END`)
  - Uses winding sign fallback only when side-sampling is degenerate
   - **Behavior**: Entire room rotates rigidly around the selected wall's inside-left pivot
     - Rotates all vertices around fixed pivot point
     - Rebuilds all walls from consecutive rotated vertices
     - Preserves room topology (no stretching/deformation)
     - Updates wall angles, positions, and lengths dynamically

2. **Boundary Wall Rotation** (when one wall end is disconnected):
   - **Detection**: Checks if selected wall has exactly one end connected and one end free
     - Connected end: Attached to another wall (within 1 unit tolerance)
     - Disconnected/free end: Not touching any other wall
   - **Pivot Point**: Uses the selected wall endpoint anchor (`start` or `end`)
     - Anchor is chosen from deterministic inside-left geometry rules (not click side)
     - Depending on geometry, anchor may be either the connected endpoint or the free endpoint
     - The chosen anchor point remains fixed while rotating
   - **Behavior**: Boundary rotation now has two outcomes based on pivot endpoint connectivity
     - **Pivot connected, opposite endpoint free**: rotate only the selected wall around the pivot endpoint (local hinge)
       - Connected structure stays fixed
       - Angle between the selected wall and connected neighbor changes
       - Use case: adjust a terminal wall without rotating the rest of the layout
     - **Pivot free, opposite endpoint connected**: rotate the connected chain rigidly around the selected endpoint
       - Traverses forward/backward through connected walls to identify chain
       - Rotates that chain around the fixed selected endpoint
       - Preserves chain lengths and corner angles

3. **Open Both-Connected One-Side Rotation** (when selected wall has both ends connected and room is open):
   - **Detection**: Selected wall has both endpoints connected and topology is not closed
   - **Pivot Point**: Uses deterministic inside-left endpoint (`start` or `end`)
   - **Behavior**: Rotates only one side of the connected structure as a rigid chain around pivot
     - Anchor `start`: traverse and rotate through end connectivity
     - Anchor `end`: traverse and rotate through start connectivity
   - **Invariant**: Non-pivot downstream corner angles remain unchanged while pivot-side joint angle changes

4. **Open Fallback Rotation** (all other open cases, including both-disconnected selected wall):
   - Selected wall rotates locally
   - Adjacent affected walls are translated/rebuilt to preserve endpoint continuity
   - No rigid rotation of the full structure

- **Angle Control**:
  - Input field for direct angle entry (degrees converted to radians)
  - ±1° increment buttons for fine rotation
  - Uses the selected wall's locked anchor endpoint type for the full edit interaction
  - Label changes to "Rotate Room" when closed (vs. "Angle" when open)

#### Wall Properties (When Selected):
- **Label**: Custom wall identifier (e.g., "1", "Front Wall")
- **Length**: Wall segment length (inches in UI; stored in cm internally)
- **Height**: Room ceiling height (inches in UI; stored in cm internally)
- **Thickness**: Wall visual thickness (1-30 units)
- **Rotation**: Angle in degrees (±1° control + direct input)
- **Visibility**: Toggle wall rendering on/off
- **Closet Wall Assignment**: Mark one wall as the closet anchor
- **Deletion**: Remove wall segment with automatic label renumbering

#### Wall Numbering System:
- Auto-numbered sequentially as walls are added (Wall 1, Wall 2, etc.)
- Labels update automatically when walls are deleted
- First wall automatically marked as closet wall if none exists
- Wall-number badges are consistently yellow for all walls

#### Canvas & Viewport Management:

**Auto-fitting Viewport:**
- Dynamic SVG viewBox that frames all drawn walls
- Auto-centers on geometry with 80-unit padding
- Locks viewport during rotation interactions to prevent jitter and apparent drift
  - `lockedDrawViewBox` freezes frame coordinates
  - For closed rooms: locks when room becomes closed
  - For boundary/open rotation: locks before angle updates so pivot appears stationary
  - Unlocks when user resumes drawing, undoes, removes walls, or switches mode

**Preview & Snap Feedback:**
- Preview line from last vertex to cursor (blue dashed)
- Inside-side preview area (shadow band) uses right-hand drawing direction for the pending segment (before polygon context exists)
- For placed walls, inside-side area uses polygon interior-side sampling so the shown inside matches pivot logic
- Inside-side visualization can be toggled with **Show Inside** in the Draw Walls controls
- Live dimension annotation showing current segment length
- Snap circle highlights near first vertex (expands when within close threshold)
- Vertices as dots: green for non-connected points, yellow for connected points

#### Keyboard Interaction:
- **Escape Key**: Stop drawing mode and clear pending start vertex
  - Does not clear drawn walls, only halts active drawing

---

### 3. **Architecture Item Management**

#### Item Collections by Category:

**Doors** (5 types):
- Wall opening, double door, single door, sliding door, bifold door
- Standard height (213 cm), varying widths

**Architecture** (3 types):
- Rectangular column, round column, interior wall
- Full room height, varying widths

**Wall Decorators** (6 types):
- Window, vent, outlet, light switch, wall photo, floor photo
- Various dimensions

#### Item Placement & Interaction:
- **Default Placement**: Centered on Wall 0 (bottom wall in quick mode)
- **Drag to Move**: Click and drag items along wall surface
  - Wall coordinate calculation for each wall type (horizontal/vertical)
  - Position normalized to 0.0-1.0 range, clamped to 0.05-0.95
- **Selection**: Click to select (yellow highlight)
- **Deletion**: Click delete button (×) when item selected
- **Rotation**: Automatic 90° applied to vertical walls (right/left)

#### Item Visual Representation:
- Color-coded rectangles by category
  - Orange: Doors
  - Purple: Architecture
  - Cyan: Wall Decorators
- Center point positions item on wall
- Labels show item type (e.g., "Single Door", "Window")

---

### 4. **Wall Elevation Overlay (Canvas-Scoped)**

#### Entry And Layout
- Right sidebar wall-properties section includes an **Elevation** button.
- Button appears only when a wall is selected, above **Use As Closet Wall**.
- Clicking the button opens an elevation overlay inside the center canvas area.
- Both sidebars remain visible and unchanged while elevation is open.

#### Rendering Contract
- Elevation always targets the selected wall at open time.
- Wall face is rendered as a flat 2D rectangle:
  - Width = selected wall length
  - Height = room height
- Overlay renders only door/window openings attached to that wall.
- Opening placement uses the same values shown in right-side selected-item fields:
  - `leftPosition` / `rightPosition` (inches)
  - `width` / `height` (cm internally, inches in labels)
  - `elevation` (inches)

#### Editing Behavior
- Openings are draggable in elevation:
  - Horizontal drag updates along-wall position (`positionAlongWall` via `moveItem`).
  - Vertical drag updates `elevation` via `updateItemProps`.
- Horizontal opening movement and width resize are constrained to the selected wall's usable span:
  - Start-connected endpoint reserves a left no-go margin equal to wall thickness.
  - End-connected endpoint reserves a right no-go margin equal to wall thickness.
- Selected opening shows resize handles in elevation:
  - Right handle resizes width.
  - Top handle resizes height.
  - Top-right corner handle resizes width and height together.
- Existing right-side width/height/left/right/elevation inputs stay in sync with elevation edits.

#### Connected Side-Wall Boundaries
- Connected side-wall gray bands are not visual-only.
- Bands represent strict no-go zones for all elevation elements (doors, windows, closet units).
- Add/drag/resize operations are clamped/rejected so elements cannot cross into neighboring wall regions.

#### Persistence / Visibility
- Floor-plan SVG is hidden (not deleted) while elevation is open.
- Closing elevation restores the floor-plan drawing immediately with prior state intact.
- No route change and no room reset is performed for elevation open/close.

---

### 5. **Coordinate Systems & Transformations**

#### SVG to Screen Mapping:
```
screenToSvg(svg, screenX, screenY):
1. Create SVG point from screen coordinates
2. Get Current Transformation Matrix (CTM) from svg.getScreenCTM()
3. Invert CTM to map screen → SVG space
4. Apply inverse matrix to get SVG coordinates
```

#### Room-Centric Coordinates:
- **Quick Mode**: Centered at origin (0, 0)
  - Width spans [-roomW/2, +roomW/2]
  - Depth spans [-roomD/2, +roomD/2]
  
- **Draw Mode**: Free-floating with auto-fitted viewport
  - Walls stored as absolute positions with angle/length
  - Vertices computed on-demand from wall segments

#### Item Positioning:
- **Wall 0 (Bottom)**: Horizontal, y = -roomD/2, x = -roomW/2 to +roomW/2
- **Wall 1 (Right)**: Vertical, x = +roomW/2, y = -roomD/2 to +roomD/2
- **Wall 2 (Top)**: Horizontal, y = +roomD/2, x reversed direction
- **Wall 3 (Left)**: Vertical, x = -roomW/2, y reversed direction
- **Free-standing**: Center of room (0, 0)

---

### 6. **Units & Measurements**

#### Internal Units: Centimeters (cm)
- Wall lengths stored in cm
- Heights in cm
- Thicknesses in cm/pixels (SVG context)

#### Display Units: Inches
- `cmToInches(cm)`: Converts cm to inch values for Floor Plan inputs
- `formatLength(cm)`: Used in dimension annotations (inches-only)
- Conversion: 1 inch = 2.54 cm

---

## State Management

### Pinia Store Integration (useRoomStore):
- **walls**: Array of wall objects with position, angle, length, thickness, labels, visibility
- **height**: Room ceiling height
- **items**: Placed architecture items with positions and dimensions
- **colors**: Room color scheme (floor, walls)
- **closetOffsetX/Y/Z**: Cabinet positioning within room
- **shape**: "rectangular" (4 walls) or "custom" (any polygon)

### Component State (Reactive):
- **Drawing State**: isDrawing, isClosed, wallVertices, previewWall
- **Selection State**: selectedWallId, selectedItemId, selectedWallAnchor
- **Mouse Position**: Real-time cursor location during interactions

---

## Event Handlers & Interactions

### Drawing Canvas:
- **Click**: Place wall vertex, close room, or select items
- **Move**: Update preview wall, snap feedback
- **Escape**: Cancel drawing mode

---

## Constraints

Enforced via `ROOM_CONSTRAINTS`:
- **Wall Length**: Min/max bounds (clamped via `clampWall()`)
- **Room Height**: Min/max range (clamped via `clampDrawHeight()`)
- **Wall Thickness**: 1-30 units (clamped via `clampDrawThickness()`)
- **Item Positions**: 0.05-0.95 normalized (prevent edge overlap)

---

## Performance Optimizations

- **Computed Properties**: Heavily used for reactive viewport, vertices, preview walls
  - Prevents unnecessary re-renders of static geometry
- **Viewport Locking**: Frozen viewBox prevents continuous recalculation post-closure
- **Single SVG Rendering Path**: One draw canvas for presets and custom walls
- **Polygon Rendering**: Uses `wallPolygonPoints()` to generate thick wall visuals with perpendicular offset
- **Grid Pattern**: Reusable SVG pattern definition for draw canvas background

---

## Visual Feedback Systems

1. **Hover Previews**: Thicker wall stroke + lighter fill when selected
2. **Snap Indicators**: Expanding circle near first vertex when in close range
3. **Live Dimension**: Blue dashed line + dimension text following cursor during draw
4. **Color Coding**: 
  - Yellow circle = wall number badge (all walls)
   - Orange/Purple/Cyan rectangles = item categories
5. **Selection Highlights**: Yellow fill for selected items, bold stroke for selected walls
6. **Cursor Feedback**: Resize cursors, grab cursor for items, pointer cursor for buttons
7. **Inside-Side Indicator**:
  - Shadow-style inside area rendered from the wall toward the room-inside side (no green edge line)
  - Area is shown while drawing (including pending preview segment)
  - **Show Inside** toggle enables/disables this visual guide
  - For placed walls, interior side is detected from polygon side-sampling (same rule used for pivot)
  - Preview segment uses right-hand direction before placement

---

## Supported Workflows

### Workflow 1: Preset To Editable Layout
1. Pick a quick preset from the left sidebar
2. Confirm replacement if the current room already contains walls/items
3. Continue with full wall editing (angle, length, thickness, rotate)
4. Add doors/windows and drag them along walls

### Workflow 2: Custom Freeform Design
1. Stay in the same unified editor
2. Click "Start Drawing"
3. Click to place vertices, snap to 45° angles
4. Close polygon by clicking near first vertex
5. Select walls to adjust angle/length individually
6. Rotate geometry by topology: closed room rotates rigidly; boundary walls may rotate locally or as a chain
7. Add items as needed

---

## Key Mathematical Functions

- **`snapped45Segment()`**: Project endpoint to nearest 45° lattice
- **`polygonSignedArea()`**: Shoelace formula for winding order detection
- **`insideLeftPivot()`**: Calculate inside-facing left corner for closed-room rotation pivot using interior side sampling with winding fallback
- **`rotatePointAroundPivot()`**: Rigid rotation around fixed point (cos/sin optimization)
- **`wallEndPoint()`**: Calculate endpoint from position + angle * length
- **`normalizeAngle()`**: Map angles to canonical [-π, π] range
- **`roomPlanBounds()`**: Calculate AABB (axis-aligned bounding box) for viewport fitting
- **`wallInsideGuideAreaPoints()`**: Build the inside shadow-band polygon from wall direction and thickness
- **`pointInPolygon2D()` / `pointInPolygon()`**: Determine whether side-sample points lie inside the current polygon
- **`interiorSideForWall()` / `closedWallInteriorSide()`**: Resolve which side of a wall is interior

### Boundary Wall Rotation Functions

- **`pointsApproximatelyEqual()`**: Check if two points are connected (within 1 unit tolerance)
- **`findWallConnectedToStart()`**: Find wall attached to a wall's start endpoint
- **`findWallConnectedToEnd()`**: Find wall attached to a wall's end endpoint
- **`wallEndpointConnectivity()`**: Reports whether selected wall start/end endpoints are connected to any wall
- **`isBoundaryWall()`**: Detect boundary walls (exactly one connected endpoint)
- **`isBothConnectedWall()`**: Detect selected walls connected at both endpoints
- **`rotateBoundaryChain(deltaRad, wallId, anchor)`**: Execute rigid rotation when boundary branch resolves to chain rotation
- **`rotateOpenBothConnectedOneSide(deltaRad, wallId, anchor)`**: Execute one-side rigid rotation for open both-connected selected walls

### Rotation/View Helpers in FloorPlan

- **`insideLeftAnchorTypeForWall()`**: Resolves deterministic anchor endpoint from polygon interior-side sampling with winding fallback
- **`selectedWallAnchorType`**: Tracks whether the selected endpoint anchor is `start` or `end`
- **`lockDrawViewBoxToCurrentFrame()`**: Freezes draw viewBox before rotation edits
- **`unlockDrawViewBox()`**: Restores auto-fit when editing context changes

### Regression Tests

- **`tests/roomRotation.test.ts`**:
  - Concave wall-2 inner-notch pivot stability (closed room)
  - Reversed-winding concave wall-2 inner-notch pivot stability (closed room)
- **`tests/floorPlan.pivot.integration.test.ts`**:
  - UI interaction regression for wall selection + repeated `Rotate +1°` updates preserving wall-2 pivot endpoint

---

## Summary Table

| Feature | Quick Mode | Draw Mode |
|---------|-----------|-----------|
| Room Shape | Rectangular | Any polygon |
| Wall Count | 4 fixed | 1+ variable |
| Resize | Drag handles | Manual angle/length |
| Rotation Modes | N/A | 4-tier: Closed room / Boundary wall (local hinge or rigid chain) / Open both-connected one-side / Open fallback |
| Snap | None | 45° grid snap |
| Items | Yes | Yes |
| Closet Wall | Default Wall 0 | Selectable any wall |
| Viewport | Fixed center | Auto-fit with lock |
