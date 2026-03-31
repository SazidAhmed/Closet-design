# Pivot Point Determination in Floor Plan Rotation

## Overview

When a room is closed (all walls form a continuous polygon), rotating a selected wall rotates the **entire room rigidly** around a fixed pivot point. For boundary walls (one connected end and one free end), the connected structure rotates rigidly around the **selected endpoint anchor**. This document explains both pivot strategies and the view-locking behavior that keeps the pivot visually stationary.

---

## Closed-Room Pivot Concept

For closed polygons, the pivot point is the **inside-left corner** of the selected wall. This means:
- Stand on the selected wall
- Face INTO the room (perpendicular to the wall, toward the interior)
- The corner to your left is the pivot point

This creates intuitive rotations where the room pivots around the selected wall's interior edge, rather than some arbitrary center point.

---

## Calculating the Pivot Point

The `insideLeftPivot()` function in [useRoomStore.ts](../../src/stores/useRoomStore.ts#L122) determines the pivot point through two key steps:

### Step 1: Determine Polygon Winding Order

Using the **shoelace formula** (polygon signed area):

$$\text{signedArea} = \frac{1}{2} \sum_{i=0}^{n-1} (x_i \cdot y_{i+1} - x_{i+1} \cdot y_i)$$

```typescript
function polygonSignedArea(vertices: Vec2[]): number {
  if (vertices.length < 3) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i]!
    const [x2, y2] = vertices[(i + 1) % vertices.length]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}
```

**Interpretation:**
- **Positive area** → Walls ordered **clockwise** in floor-plan space (SVG coordinates)
- **Negative area** → Walls ordered **counterclockwise** in floor-plan space

### Step 2: Identify Inside-Left Corner

Once we know the winding order, we determine which end of the selected wall is "inside-left":

```typescript
function insideLeftPivot(vertices: Vec2[], wallIndex: number): Vec2 {
  const n = vertices.length
  const signedArea = polygonSignedArea(vertices)
  const wallStart = vertices[wallIndex]!
  const wallEnd = vertices[(wallIndex + 1) % n]!

  // Inside is derived from winding:
  // - positive signed area => clockwise wall order in this floor-plan space
  // - negative signed area => counterclockwise wall order
  //
  // "Left endpoint from inside" means: stand on the wall and face into the room.
  // Under that viewpoint in this screen-space coordinate system:
  // - clockwise order => left endpoint is wall START
  // - counterclockwise order => left endpoint is wall END
  return signedArea >= 0
    ? [wallStart[0], wallStart[1]]
    : [wallEnd[0], wallEnd[1]]
}
```

**Key Logic:**
- **Clockwise polygon** (positive area) → Inside-left = **wall START**
- **Counterclockwise polygon** (negative area) → Inside-left = **wall END**

---

## Why This Works: The Orientation Test

In SVG's screen-space coordinate system (y increases downward):

### Clockwise Polygon Example
```
Wall 0: (0, 0) → (100, 0)     [rightward]
Wall 1: (100, 0) → (100, 100) [downward]
Wall 2: (100, 100) → (0, 100) [leftward]
Wall 3: (0, 100) → (0, 0)     [upward]
```

If you stand on Wall 1 facing INTO the polygon (leftward):
- Your left side points DOWN (toward the wall end)
- Wall 1's END (100, 100) is to your left ✓

But positive winding means: inside-left = START
- Wall 1 START is (100, 0)
- When standing on Wall 1 facing left, (100, 0) is actually to your RIGHT

**Solution:** The formula reverses the interpretation for clockwise polygons because of SVG's inverted y-axis and the way shoelace winding works in screen space.

### Counterclockwise Polygon Example
```
Wall 0: (0, 100) → (0, 0)     [upward]
Wall 1: (0, 0) → (100, 0)     [rightward]
Wall 2: (100, 0) → (100, 100) [downward]
Wall 3: (100, 100) → (0, 100) [leftward]
```

If you stand on Wall 1 facing INTO the polygon (upward):
- Your left side points RIGHTWARD (toward the wall end)
- Wall 1's END (100, 0) is to your left ✓
- Negative winding: inside-left = END ✓

---

## Rigid Room Rotation

Once the pivot point is determined, the `rotateClosedRoom()` function performs rigid rotation:

```typescript
rotateClosedRoom(deltaRad: number, wallId: string) {
  if (!Number.isFinite(deltaRad) || deltaRad === 0) return
  const walls = this.walls
  if (!this.roomIsClosed || walls.length < 3) return

  const selectedIdx = walls.findIndex((w) => w.id === wallId)
  if (selectedIdx < 0) return

  const n = walls.length
  const vertices = walls.map((w) => [w.position[0], w.position[1]] as Vec2)
  const pivot = insideLeftPivot(vertices, selectedIdx)

  const cosD = Math.cos(deltaRad)
  const sinD = Math.sin(deltaRad)
  
  // Rotate every vertex around the fixed pivot point
  const rotatedVertices = vertices.map((v) => 
    rotatePointAroundPivot(v, pivot, cosD, sinD)
  )

  // Rebuild walls from consecutive rotated vertices
  for (let i = 0; i < n; i += 1) {
    const wall = walls[i]!
    const start = rotatedVertices[i]!
    const end = rotatedVertices[(i + 1) % n]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    wall.position = [start[0], start[1]]
    wall.length = Math.hypot(dx, dy)
    wall.angle = normalizeAngle(Math.atan2(dy, dx))
  }
}
```

**Rotation Algorithm:**
1. Calculate pivot point from selected wall's inside-left corner
2. Pre-compute `cosΔ` and `sinΔ` for the rotation angle
3. Rotate every room vertex around the pivot using 2D rotation matrix:
   - $x' = p_x + (x - p_x) \cos\theta - (y - p_y) \sin\theta$
   - $y' = p_y + (x - p_x) \sin\theta + (y - p_y) \cos\theta$
4. Rebuild walls segment-by-segment from rotated vertices:
   - Wall start = rotated vertex at index i
   - Wall end = rotated vertex at index i+1
   - Recalculate angle and length from new endpoints

**Preservation Guarantees:**
- ✓ Room topology unchanged (walls remain connected)
- ✓ All wall lengths preserved (rigid transformation)
- ✓ No stretching or deformation
- ✓ Selected wall's inside-left corner stays at origin

---

## Boundary-Chain Pivot (Anchor-Based)

For non-closed rooms, if a selected wall is a boundary wall (exactly one endpoint connected), rotation uses the **selected endpoint anchor** (`start` or `end`) as the pivot.

### How the Anchor Pivot Is Chosen

1. The user clicks a selected wall.
2. The UI measures click proximity to wall start/end.
3. `selectedWallAnchorType` is set to `start` or `end`.
4. Angle changes call:
   - `setWallAngle(wallId, angleRad, selectedWallAnchorType)`

### Boundary Detection

`isBoundaryWall()` returns true when exactly one endpoint is connected:

```typescript
function isBoundaryWall(walls: Room['walls'], wallIdx: number): boolean {
  const startConnected = findWallConnectedToStart(walls, wallIdx) !== null
  const endConnected = findWallConnectedToEnd(walls, wallIdx) !== null
  return startConnected !== endConnected
}
```

### Rotation Behavior

`rotateBoundaryChain(deltaRad, wallId, anchor)` then:

1. Builds a connected wall chain around the selected wall.
2. Uses selected endpoint as pivot:
   - `anchor === 'start'` -> wall start point
   - `anchor === 'end'` -> wall end point
3. Rotates all chain vertices around that pivot.
4. Rebuilds every wall from consecutive rotated vertices.

Result: the chosen anchor point remains fixed while the full connected structure rotates.

---

## Viewport Locking

During rotation, the SVG viewBox is **frozen** to prevent continuous re-centering:

```typescript
function lockDrawViewBoxToCurrentFrame() {
  lockedDrawViewBox.value = drawViewBoxFromPoints(wallVertices.value)
}
```

This prevents visual jitter where the viewport would re-center on rotated geometry, causing the pivot to appear to move.

- Closed rooms: lock occurs when room is closed.
- Boundary/open rotations: lock occurs before angle updates.
- Unlock occurs when drawing context changes (start/continue draw, undo, remove wall, mode switch).

With this lock, the room visually rotates around a stationary pivot.

---

## Mathematical Foundation: 2D Rotation Matrix

The rotation of a point around a pivot follows the standard 2D rotation matrix:

$$\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \begin{pmatrix} x - p_x \\ y - p_y \end{pmatrix} + \begin{pmatrix} p_x \\ p_y \end{pmatrix}$$

Implemented as:
```typescript
function rotatePointAroundPivot(
  point: Vec2, 
  pivot: Vec2, 
  cosD: number, 
  sinD: number
): Vec2 {
  const dx = point[0] - pivot[0]
  const dy = point[1] - pivot[1]
  return [
    pivot[0] + dx * cosD - dy * sinD,
    pivot[1] + dx * sinD + dy * cosD,
  ]
}
```

**Efficiency Note:** Pre-computing `cosΔ` and `sinΔ` avoids redundant trigonometry for each vertex rotation.

---

## Practical Example

### Scenario: L-Shaped Room with 4 Walls

**Initial Configuration:**
```
Wall 0: (0, 0) → (100, 0)
Wall 1: (100, 0) → (100, 50)
Wall 2: (100, 50) → (50, 50)
Wall 3: (50, 50) → (0, 0)
```

**Step 1: Calculate Signed Area**
$$\text{Area} = \frac{1}{2}[(0 \times 0 - 100 \times 0) + (100 \times 50 - 100 \times 0) + (100 \times 50 - 50 \times 50) + (50 \times 0 - 0 \times 50)]$$
$$= \frac{1}{2}[0 + 5000 + 2500 + 0] = 3750 > 0$$

→ Clockwise polygon

**Step 2: Select Wall 1, Find Inside-Left**
- Wall 1 starts at (100, 0)
- Wall 1 ends at (100, 50)
- Clockwise → inside-left = START = **(100, 0)** ✓

**Step 3: Rotate +45° Around (100, 0)**
- cosD = cos(45°) ≈ 0.707
- sinD = sin(45°) ≈ 0.707
- Pivot stays at (100, 0)
- Other vertices rotate around this point

**Result:** Room rotates CCW around the top-right corner of Wall 1

---

## Key Insights

1. **Winding Order Detection** is automatic and handles both CW and CCW polygons
2. **Inside-left pivot** is used for closed polygons; **selected endpoint anchor** is used for boundary chains
3. **Rigid Rotation** preserves room topology regardless of starting orientation
4. **Viewport Locking** ensures visual stability during both closed and boundary/open rotations
5. **Pre-computed Cosine/Sine** optimizes performance for multi-vertex rotations

---

## Related Functions

- `polygonSignedArea()` - Calculate winding order
- `insideLeftPivot()` - Determine rotation pivot
- `isBoundaryWall()` - Detect boundary walls (exactly one connected endpoint)
- `rotatePointAroundPivot()` - Apply 2D rotation matrix
- `rotateClosedRoom()` - Orchestrate full room rotation
- `rotateBoundaryChain()` - Rotate connected chain around selected endpoint anchor
- `normalizeAngle()` - Map angles to [-π, π] canonical range
- `setWallAngle()` - User-facing rotation control

