# Floor Plan Inside-Side Indicator Research

## Investigation Date
April 4, 2026

## Key Findings Summary

### 1. INTEGRATION POINTS (Exact functions/blocks to touch)

**Primary Files:**
- [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue) - Main render & logic
- [src/stores/useRoomStore.ts](src/stores/useRoomStore.ts) - State management  

**Functions to modify or extend:**

1. **wallPolygonPoints()** [L1172-1189]
   - Currently creates 4-point polygon using `perpAngle = wall.angle + Math.PI / 2`
   - Would be the core for half-strip fill strategy
   - Returns string of comma-separated x,y points

2. **insideLeftAnchorTypeForWall()** [L676-758]
   - Determines which endpoint is "inside-left" 
   - Uses geometry projection: `leftX = -insideY; leftY = insideX`
   - Returns 'start' | 'end' based on signed area or projection
   - **This fully encodes inside-direction logic already!**

3. **SVG wall rendering block** [L1890-1957]
   - Polygon element for wall body
   - Can add sibling elements (lines, rectangles, path) after the polygon
   - Before or after the wall center-line dashed line

**New Functions to Create:**
- `wallInsideEdgePoints()` - Generate perpendicular edge coordinates
- `getWallInsideDirection()` - Return normalized perpendicular vector
- `computeInsideIndicatorStroke()` - Create visual indicator geometry

### 2. EXISTING GEOMETRY HELPERS

**Foundation Functions (already tested):**
```typescript
// Line 536
function wallEndPoint(wall: {position, angle, length}): [number, number]
  => Start + (cos(angle), sin(angle)) * length

// Line 576
function polygonSignedArea2D(vertices): number
  => Shoelace formula: sum(x_i * y_{i+1} - x_{i+1} * y_i) / 2

// Line 587
function polygonCentroid2D(vertices): [number, number] | null
  => Weighted centroid for closed polygons

// Line 1172
function wallPolygonPoints(wall): string
  => Creates 4-corner rectangle: p1, p2, p3, p4 using perpendicular offset
  => perpAngle = wall.angle + π/2
  => offset = (cos(perpAngle) * t, sin(perpAngle) * t)  where t = thickness/2
```

**Key Anchor Logic (stores inside-left determinism):**
```typescript
// Line 676 - insideLeftAnchorTypeForWall()
// On closed: uses centroid + signed area winding
// On open: uses structureReferencePointExcludingWall() for inside reference
// Projects onto left-perpendicular: leftX = -insideY; leftY = insideX
// Returns 'start' if startProj >= endProj, else 'end'
```

### 3. SVG LAYERS & RENDERING ORDER (Draw Mode Canvas)

**Current depth order [L1810+]:**
1. Grid pattern (background + definitions)
2. Background grid fill
3. Floor polygon (semi-transparent)  
4. **For each wall:**
   - Thick wall polygon fill (tan/beige) 
   - Wall center dashed line ← **INSERT HERE** (behind center line or replace edge markers)
   - Wall label circle
   - Dimension line + text
5. Vertices circles
6. Preview line (cursor preview)
7. Close-indicator circle

**Insertion Options:**
- **After** polygon, **before** center line: can use same transparency/layering
- **Replace** center line with colored edge: cleaner visual
- **After** vertices: renders on top (better visibility)
- **In separate group**: for easy toggling

### 4. COORDINATE ORIENTATION ANALYSIS

**SVG Coordinate System:**
- Origin typically at center (viewBox transforms)
- X increases right (positive)
- Y increases down (positive)
- Standard deviation: y-axis is flipped vs. Cartesian

**Wall Angle Semantics:**
- `angle = 0` → direction is `(+1, 0)` = rightward
- `angle = π/2` → direction is `(0, +1)` = downward
- `angle = π` → direction is `(-1, 0)` = leftward  
- `angle = 3π/2` → direction is `(0, -1)` = upward

**Perpendicular Computation:**
```
perpAngle = wall.angle + π/2  (standard left-perpendicular in math)
perpDir = (cos(perpAngle), sin(perpAngle))
       = (-sin(wall.angle), cos(wall.angle))
```

**User Screenshot Requirements Interpretation:**
- Horizontal L→R (angle ≈ 0), inside **below** = +Y direction = p2-p3 edge
- Horizontal R→L (angle ≈ π), inside **above** = -Y direction = p1-p4 edge  
- Vertical up (angle ≈ 3π/2), inside **right** = +X direction = p1-p2 edge
- Vertical down (angle ≈ π/2), inside **left** = -X direction = p3-p4 edge

**Inside-Side Direction Formula:**
```
For wall with angle θ and inside reference point:
  1. Compute perpendicular: perpDir = (-sin(θ), cos(θ))
  2. Compute inside vector: from wall toward center/reference
  3. Project inside onto left(-perpDir): dotProduct(inside, -perpDir)
  4. If positive: p1/p4 side; if negative: p2/p3 side
```

**Wall Polygon Corner Order** (from wallPolygonPoints):
```
p1 = start + perpOffset        (right side of direction)
p2 = start - perpOffset        (left side of direction)  
p3 = end - perpOffset          (left side at end)
p4 = end + perpOffset          (right side at end)
Points form: p1→p2→p3→p4 closed path
```

→ **CONCLUSION: Inside is NOT always right or left; determined by `insideLeftAnchorTypeForWall()` projection logic**

### 5. SUGGESTED HELPER SIGNATURES & FORMULAS

**New functions to add:**

```typescript
/**
 * Compute the perpendicular vector to a wall (always points "left" of direction).
 * @param angle Wall angle in radians
 * @param magnitude Vector length (typically thickness/2 or indicator size)
 * @returns [number, number] normalized perpendicular vector
 */
function wallLeftPerpendicularVector(
  angle: number, 
  magnitude: number = 1
): [number, number] {
  return [
    -Math.sin(angle) * magnitude,
    Math.cos(angle) * magnitude
  ]
}

/**
 * Get which perpendicular side (of the two) faces the interior.
 * Matches insideLeftAnchorTypeForWall() logic.
 * Returns 'positive' if p1-p4 side, 'negative' if p2-p3 side.
 */
function getWallInsideSide(
  wall: { position: Vec2; angle: number; length: number; thickness?: number },
  allWalls: Wall[],
  wallIndex: number,
  isClosed: boolean
): 'positive' | 'negative' {
  // Compute inside reference (mirrors insideLeftAnchorTypeForWall)
  // Project midpoint-to-inside onto left perpendicular
  // Return side that has positive projection
}

/**
 * Render inside-edge indicator as a line segment.
 * @param wall Wall object with position, angle, length, thickness
 * @param insideSide 'positive' | 'negative' to pick edge
 * @returns { x1, y1, x2, y2 } SVG line coordinates
 */
function insideEdgeLinePoints(
  wall: { position: Vec2; angle: number; length: number; thickness: number },
  insideSide: 'positive' | 'negative'
): { x1: number; y1: number; x2: number; y2: number } {
  const t = wall.thickness / 2
  const perpVec = wallLeftPerpendicularVector(wall.angle, t)
  const endPt = wallEndPoint(wall)
  const offset = insideSide === 'positive' ? perpVec : 
                 [-perpVec[0], -perpVec[1]]
  
  return {
    x1: wall.position[0] + offset[0],
    y1: wall.position[1] + offset[1],
    x2: endPt[0] + offset[0],
    y2: endPt[1] + offset[1]
  }
}

/**
 * Render inside-half fill zone as a polygon strip.
 */
function insideHalfStripPoints(
  wall: { position: Vec2; angle: number; length: number; thickness: number },
  insideSide: 'positive' | 'negative'
): string {  // SVG points format
  // Return 4-corner or 6-corner strip polygon covering inner half
}

/**
 * Check if a wall's inside side is determinable (has structural reference).
 */
function isWallInsideSideDeterminable(
  wall: Wall,
  allWalls: Wall[]
): boolean {
  // Return false if wall is isolated or reference fails
}
```

### 6. RENDER STRATEGY OPTIONS

**Option A: Edge Highlight Line** ← Recommended first  
- Stroke the inside edge with accent color (#22c55e or #60a5fa)
- Add after polygon fill, renders on top immediately
- Thin line (1-2px), no fill interference
- SVG: `<line x1="" y1="" x2="" y2="" stroke="#22c55e" stroke-width="2"/>`
- **Pros:** Simple, zero overlap, fast, mergeable with preview
- **Cons:** Thin visibility on small walls, need distinct color

**Option B: Half-Strip Fill**
- Fill inner 50% of wall thickness with distinct semi-transparent color  
- Create narrower polygon (half thickness) and overlay
- SVG: `<polygon points="..." fill="#22c55e" opacity="0.3"/>`
- **Pros:** Fills area, intuitive "inside" notion
- **Cons:** Color blending issues, overlaps wall center line, harder to layer

**Option C: Hatch/Dash Pattern**
- Use SVG pattern fill for inside half
- SVG: `<pattern id="insideHatch">` + `<polygon fill="url(#insideHatch)"/>`
- **Pros:** Visually distinct, doesn't obscure texture
- **Cons:** Complex patterns, performance hit, hard to discern on thin walls

**Option D: Thicker Edge Border**
- Stroke entire wall edge with darker color, then inside-only with accent
- **Cons:** Very complex, visual noise

**Option E: Gradient Fade**  
- Apply radial gradient from inside edge, fading outward
- **Pros:** Elegant
- **Cons:** Overkill, hard to update dynamically

### 7. LIKELY PITFALLS & MITIGATIONS

**Pitfall 1: Preview Wall Inside Direction**
- Draw mode shows preview line before a wall is added to chain
- At that point, no "inside" context exists (only 2 vertices, not yet part of structure)
- **Mitigation:**  
  - Skip indicator on preview wall  
  - OR compute tentative inside from mouse position + cursor direction
  - OR show bidirectional preview (both sides shaded lightly)

**Pitfall 2: Selection Highlight Overlap**
- Wall selected: fill changes to `#e8c88a` (lighter tan)
- Indicator color may become invisible
- **Mitigation:**  
  - Use `stroke` instead of `fill` for indicator (won't be masked)
  - Use higher-contrast color (#ff4444 or #00ff00)
  - Layer indicator line AFTER fill change (ensures visibility)

**Pitfall 3: Closed vs. Open Chain Different Anchor Logic**
- `insideLeftAnchorTypeForWall()` has two branches:
  - Closed: uses `polygonCentroid2D()` for interior
  - Open: uses `structureReferencePointExcludingWall()` for reference
- **Both determine inside differently!**
- **Mitigation:**  
  - Extract shared inside-determination logic into single function
  - Use same logic for both indicator computation and anchor selection
  - Test both pathways thoroughly

**Pitfall 4: Perpendicular Order Confusion**
- `wallPolygonPoints` uses `p1, p2, p3, p4` corners
- `p1/p4` = +perpendicular side; `p2/p3` = -perpendicular side
- Easy to invert which side is "inside"
- **Mitigation:**  
  - Document edge labeling clearly in code
  - Add unit test: verify indicator always points to centroid for simple rectangle
  - Use consistent naming: `insideSide` = 'positive' | 'negative' or 'left' | 'right'

**Pitfall 5: Very Thin Walls**
- If thickness = 1cm in SVG coords, indicator line may be 0.5px wide  
- Invisible or subpixel rendering
- **Mitigation:**  
  - Use minimum stroke width: `Math.max(1, thickness/4)`
  - Scale indicator size independently of wall thickness at small scales
  - Consider absolute min pixel width in CSS

**Pitfall 6: Rotation Pivot Confusion**
- Wall rotation uses `insideLeftAnchorTypeForWall()` to pick pivot
- If indicator points to wrong side, user may think pivot is wrong even if it's correct
- **Mitigation:**  
  - Make indicator visually match anchor circle in selected-wall UI
  - Add anchor marker on pivot endpoint (e open or closed)
  - Ensure indicator updates live during angle input

**Pitfall 7: Performance on Large Polygons**
- If adding SVG elements per wall, × number of walls = many DOM nodes
- Especially bad if also rendering preview wall + anchors
- **Mitigation:**  
  - Use single group for all indicators (batch renders)
  - Consider canvas-based rendering for indicator layer OR
  - Defer rendering until wall is stable (not in draw preview)
  - Use CSS classes + dynamic `v-show` for toggle

**Pitfall 8: Closed Room Redraw Bug**
- When room is closed, `wallVertices` is normalized (removes duplicate last point)
- But `insideLeftAnchorTypeForWall()` handles both closed and open logic
- If indicator reads from wrong vertices array, it could point wrong way
- **Mitigation:**  
  - Always fetch wall index correctly: `drawWalls.findIndex(w => w.id === wallId)`  
  - Pass `isClosed` flag explicitly to indicator computation
  - Test after room close/reopen

### 8. COORDINATE EXAMPLES

**Scenario: Horizontal L→R wall, user wants inside below**

```
Wall: start=(0,0), angle=0, length=100, thickness=10
Expected: inside edge at y = +5 (downward in SVG coords)

perpAngle = 0 + π/2 = π/2
perpDir = (cos(π/2), sin(π/2)) = (0, 1) = downward ✓
perpVec = (0, 5)  @ thickness/2

wallPolygonPoints corners:
  p1 = (0,0) + (0,5) = (0, 5)    ← right side, downward offset
  p2 = (0,0) - (0,5) = (0, -5)   ← left side, upward offset
  p3 = (100,0) - (0,5) = (100, -5)
  p4 = (100,0) + (0,5) = (100, 5)

Inside = "positive" side (p1-p4) = y=5 line down ✓
```

**Scenario: Vertical down wall, user wants inside left**

```
Wall: start=(0,0), angle=π/2, length=100, thickness=10
Expected: inside edge at x = -5 (leftward)

perpAngle = π/2 + π/2 = π
perpDir = (cos(π), sin(π)) = (-1, 0) = leftward ✓
perpVec = (-5, 0) @ thickness/2

wallPolygonPoints corners:
  p1 = (0,0) + (-5,0) = (-5, 0)  ← left side
  p2 = (0,0) - (-5,0) = (5, 0)   ← right side
  p3 = (0,100) - (-5,0) = (5, 100)
  p4 = (0,100) + (-5,0) = (-5, 100)

Inside = "negative" side (p2-p3) = x=5 line right... NOT LEFT!
This means inside reference is actually to the RIGHT of this wall.
```

This illustrates that **inside direction depends on polygon winding, not wall angle alone**. The `insideLeftAnchorTypeForWall()` projection is essential.
