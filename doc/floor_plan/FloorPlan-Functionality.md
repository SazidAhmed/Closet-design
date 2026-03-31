# Floor Plan Component - Functionality Documentation

## Overview
The **FloorPlan.vue** component is a 2D interactive floor plan editor that allows users to design room layouts with custom or predefined shapes. It supports two distinct modes: **Quick Room** (simple rectangular rooms) and **Draw Walls** (freeform custom polygons).

---

## Core Features

### 1. **Quick Room Mode** (Default)
For rapid room setup with simple rectangular spaces.

#### Capabilities:
- **Drag-to-Resize**: Corner and mid-wall resize handles
  - 4 corner handles (diagonals) for resizing both width and depth simultaneously
  - 4 mid-wall handles for resizing individual dimensions (width XOR depth)
  - Real-time screen-to-SVG coordinate transformation with CTM (Current Transformation Matrix)
  - Smart sign calculation based on which handle is grabbed (handles quadrants)

- **Room Dimensions**: Width and depth with automatic clamping to constraints
  - Centered room coordinate system ([-width/2, +width/2] × [-depth/2, +depth/2])
  - Dynamic SVG viewBox with padding to keep room centered during resize

- **Room Height Dialog**: Separate modal for setting ceiling height (not visible in 2D plan)

- **Item Placement**: Architecture elements positioned on walls
  - 3 categories: Doors, Architecture (columns/walls), Wall Decorators (windows, vents, switches)
  - Items snap to normalized wall positions (0.0 to 1.0 along each wall)
  - Clamped to 0.05-0.95 range to keep items visually on walls
  - Vertical walls (right/left) automatically rotate items 90°

#### Visual Elements:
- Floor color and wall strokes based on room store colors
- Dimension annotations (feet/inches format) above and right edges
- Resize handles with cursor feedback (nwse-resize, nesw-resize, etc.)

---

### 2. **Draw Walls Mode** (Custom Polygons)
For creating complex, non-rectangular room shapes with manual control.

#### Core Drawing System:

**Wall Snapping & Constraints:**
- **45-degree snapping**: Walls automatically snap to 0°, 45°, 90°, 135°, etc.
- **Grid snap**: Optional 10-unit grid snapping for vertex placement
- **Thickness control**: Configurable per-wall (1-30 units), applied retroactively to existing walls

**Drawing Workflow:**
1. **Start Fresh Draw**: Initializes empty wall chain, enables vertex placement
2. **Add Wall**: Continues from last wall endpoint (skip initial segment setup)
3. **Click to Place**: Each click creates a new wall segment from previous endpoint
   - First click after start sets `pendingStartVertex` as explicit origin
   - Subsequent clicks add walls via `addWallVertex()`
4. **Close Room**: Click near first vertex (within 15 SVG units) to create closing wall
   - Attempts 45° snapping to the first vertex if possible
   - Falls back to direct closure if snap doesn't reach exact start point
5. **Undo**: Remove last wall segment individually (Escape key or button)

#### Room Closure & Rigid Rotation:

**Room Closure Detection:**
- `roomIsClosed` getter checks if all walls form a continuous polygon
- Checks that the last wall's endpoint is within 1 unit of the first wall's start
- Requires minimum 3 walls to be considered closed

**Rigid Room Rotation** (Three-tier priority system):

1. **Closed Room Rotation** (when `isClosed = true`):
   - **Pivot Point Calculation**: (`insideLeftPivot` function)
     - Identifies the "inside-left" corner of selected wall
     - Uses polygon signed area (shoelace formula) to determine winding order
     - Positive area (clockwise in floor-plan space) → left = wall START
     - Negative area (counterclockwise) → left = wall END
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
     - Anchor is chosen from the clicked side of the selected wall
     - The chosen anchor point remains fixed while rotating
   - **Behavior**: Entire connected chain rotates rigidly around the selected anchor endpoint
     - Traverses forward and backward through connected walls to identify full chain
     - Rotates all walls in the chain around the fixed selected anchor point
     - Maintains all wall connections and lengths
     - Intuitive interaction: "grab" the free corner and rotate the attached structure
   - **Use Case**: Perfect for adjusting angled room sections while keeping a specific endpoint visually fixed (pivot lock)

3. **Open Chain Rotation** (when both ends are connected or both disconnected):
   - Only the selected wall rotates individually
   - Adjacent connected walls translate to maintain endpoints
   - No rigid rotation of the entire structure
   - Original per-wall behavior

- **Angle Control**:
  - Input field for direct angle entry (degrees converted to radians)
  - ±1° increment buttons for fine rotation
  - Label changes to "Rotate Room" when closed (vs. "Angle" when open)

#### Wall Properties (When Selected):
- **Label**: Custom wall identifier (e.g., "1", "Front Wall")
- **Length**: Wall segment length (cm)
- **Height**: Room ceiling height (applies to all walls)
- **Thickness**: Wall visual thickness (1-30 units)
- **Rotation**: Angle in degrees (±1° control + direct input)
- **Visibility**: Toggle wall rendering on/off
- **Closet Wall Assignment**: Mark one wall as the closet anchor
- **Deletion**: Remove wall segment with automatic label renumbering

#### Wall Numbering System:
- Auto-numbered sequentially as walls are added (Wall 1, Wall 2, etc.)
- Labels update automatically when walls are deleted
- First wall automatically marked as closet wall if none exists
- Green highlight on closet wall label (yellow for others)

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
- Live dimension annotation showing current segment length
- Snap circle highlights near first vertex (expands when within close threshold)
- Vertices as dots: green for first vertex, yellow for others

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

### 4. **Coordinate Systems & Transformations**

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

### 5. **Units & Measurements**

#### Internal Units: Centimeters (cm)
- Wall lengths stored in cm
- Heights in cm
- Thicknesses in cm/pixels (SVG context)

#### Display Units: Feet/Inches
- `cmToImperial(cm)`: Converts to "X' Y\"" format
- `formatLength(cm)`: Used in dimension annotations
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
- **Mode**: "quick" or "draw"
- **Drawing State**: isDrawing, isClosed, wallVertices, previewWall
- **Selection State**: selectedWallId, selectedItemId, selectedWallAnchor
- **Drag State**: active flag, start positions, axis constraints
- **Mouse Position**: Real-time cursor location during interactions

---

## Event Handlers & Interactions

### Drag Operations:
- **Pointer Start**: Capture target element, record start position/dimensions
- **Pointer Move**: Calculate delta in SVG space, apply sign corrections, update state
- **Pointer Up**: Release capture, deactivate drag state

### Drawing Canvas:
- **Click**: Place wall vertex, close room, or select items
- **Move**: Update preview wall, snap feedback
- **Escape**: Cancel drawing mode

### Resize Handles:
- 4 corner handles (stretch both axes simultaneously with sign adjustment)
- 4 mid-wall handles (stretch single axis independently)
- Cursor feedback shows appropriate resize direction (nwse-resize, ew-resize, etc.)

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
- **Selective SVG Rendering**: Conditional v-if blocks for quick vs. draw mode
- **Polygon Rendering**: Uses `wallPolygonPoints()` to generate thick wall visuals with perpendicular offset
- **Grid Pattern**: Reusable SVG pattern definition for draw canvas background

---

## Visual Feedback Systems

1. **Hover Previews**: Thicker wall stroke + lighter fill when selected
2. **Snap Indicators**: Expanding circle near first vertex when in close range
3. **Live Dimension**: Blue dashed line + dimension text following cursor during draw
4. **Color Coding**: 
   - Green circle = closet wall
   - Yellow circle = regular wall
   - Orange/Purple/Cyan rectangles = item categories
5. **Selection Highlights**: Yellow fill for selected items, bold stroke for selected walls
6. **Cursor Feedback**: Resize cursors, grab cursor for items, pointer cursor for buttons

---

## Supported Workflows

### Workflow 1: Quick Room Setup
1. Drag corners/edges to set room size
2. Add doors, columns, windows from sidebar
3. Drag items to positions on walls
4. Export/save configuration

### Workflow 2: Custom Freeform Design
1. Switch to Draw Walls mode
2. Click "Start Drawing"
3. Click to place vertices, snap to 45° angles
4. Close polygon by clicking near first vertex
5. Select walls to adjust angle/length individually
6. Rotate entire room around selected wall's inside-left corner
7. Add items as needed

### Workflow 3: Hybrid Approach
1. Start with Quick Room
2. Switch to Draw Walls to customize specific walls
3. Continue editing walls with rotation/angle control
4. Return to Quick Room for simple rectangular adjustments

---

## Key Mathematical Functions

- **`snapped45Segment()`**: Project endpoint to nearest 45° lattice
- **`polygonSignedArea()`**: Shoelace formula for winding order detection
- **`insideLeftPivot()`**: Calculate inside-facing left corner for rotation pivot
- **`rotatePointAroundPivot()`**: Rigid rotation around fixed point (cos/sin optimization)
- **`wallEndPoint()`**: Calculate endpoint from position + angle * length
- **`normalizeAngle()`**: Map angles to canonical [-π, π] range
- **`roomPlanBounds()`**: Calculate AABB (axis-aligned bounding box) for viewport fitting

### Boundary Wall Rotation Functions

- **`pointsApproximatelyEqual()`**: Check if two points are connected (within 1 unit tolerance)
- **`findWallConnectedToStart()`**: Find wall attached to a wall's start endpoint
- **`findWallConnectedToEnd()`**: Find wall attached to a wall's end endpoint
- **`isBoundaryWall()`**: Detect boundary walls (exactly one connected endpoint)
- **`rotateBoundaryChain(deltaRad, wallId, anchor)`**: Execute rigid rotation of the connected chain around the selected endpoint anchor

### Rotation/View Helpers in FloorPlan

- **`selectedWallAnchorType`**: Tracks whether the selected endpoint anchor is `start` or `end`
- **`lockDrawViewBoxToCurrentFrame()`**: Freezes draw viewBox before rotation edits
- **`unlockDrawViewBox()`**: Restores auto-fit when editing context changes

---

## Summary Table

| Feature | Quick Mode | Draw Mode |
|---------|-----------|-----------|
| Room Shape | Rectangular | Any polygon |
| Wall Count | 4 fixed | 1+ variable |
| Resize | Drag handles | Manual angle/length |
| Rotation Modes | N/A | 3-tier: Closed room / Boundary wall / Open chain |
| Snap | None | 45° grid snap |
| Items | Yes | Yes |
| Closet Wall | Default Wall 0 | Selectable any wall |
| Viewport | Fixed center | Auto-fit with lock |
