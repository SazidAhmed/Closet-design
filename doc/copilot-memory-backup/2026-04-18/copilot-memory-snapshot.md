# Copilot Memory Snapshot - 2026-04-18

## Source: /memories/debugging.md

- Vitest v3 in this environment does not support --runInBand; use npm test (vitest run) without that flag.

## Source: /memories/session/elevation-exploration.md

# Elevation Implementation Exploration - April 18, 2026

## Current Elevation Architecture

**File:** [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue)

### Core Data Flow
1. **State containers** (lines 370-412):
   - `showElevationOverlay`: ref<boolean> - overlay visibility toggle
   - `elevationWallId`: ref<string|null> - selected wall ID
   - `elevationDrag`: reactive drag state with mode ("move" | "resize-width" | "resize-height" | "resize-both")

2. **Computed properties** (lines 412-430):
   - `elevationWall`: computed wall object from elevationWallId
   - `elevationItems`: computed array filtering door/window items on selected wall
   - `elevationLayout`: computed layout with scale, wallX, wallY, wallWidthPx, wallHeightPx

3. **Geometry calculation functions** (lines 434-507):
   - `elevationItemGeometryCm()`: maps item's leftPosition, elevation, width, height to clamped cm coords
   - `elevationItemRect()`: converts cm geometry to SVG pixels using scale
   - `formatPositionInches()`: displays position values
   - `openElevationForSelectedWall()`: entry point from wall selection

4. **Interaction handlers** (lines 530-680):
   - `closeElevationOverlay()`: resets state
   - `selectElevationItem()`: sets selectedItemId
   - `startElevationItemDrag()`: initiates move/resize mode
   - `startElevationItemResize()`: handles 3 resize modes
   - `onElevationPointerMove()`: updates item props via roomStore.moveItem() and roomStore.updateItemProps()
   - `onElevationPointerUp()`: cleanup drag state

### SVG Rendering (lines 1840-1980)
- Main container: `.elevation-overlay` (flex, centered over floor plan)
- SVG element: `.elevation-svg` (760x520 viewBox)
- Wall background: `elevation-wall` rect (light tan, stroked)
- Floor line: `elevation-floor-line` (yellow dashed, bottom edge)
- Dimension labels: `elevation-dim` (top width label, left height label)
- Items: `elevation-item` group per door/window
  - Item rect: `elevation-item-rect` (light blue fill)
  - Label: `elevation-item-label` (above rect, shows type + dimensions)
  - Meta: `elevation-item-meta` (below rect, shows L/R/E positions in inches)
  - Resize handles: circles/rect at right-center, top-center, top-right (only when selected)

### Styling (lines 2599-2670)
- Wall: rgba(212,201,184,0.2) with #cbd5e1 stroke
- Item rect: rgba(14,165,233,0.6) -> 0.85 when selected, #fbbf24 stroke when selected
- Handles: #fbbf24 circles with cursor hints (ew-resize, ns-resize, nwse-resize)

## Key Helpers & Dependencies

### From useRoomStore (src/stores/useRoomStore.ts)
- `itemsOnWall(wallId)`: getter filtering items by wall
- `wallEndpointConnectivity()`: returns {startConnected, endConnected}
- `updateItemProps()`: action mutating item width/height/elevation
- `moveItem()`: action moving item along wall
- `removeItem()`: action deleting item

### From domain types (src/features/closet/domain/types/)
- `PlacedItem`: id, type, category, wallId, positionAlongWall, width, height, leftPosition, rightPosition, elevation
- `Wall`: id, length, position [x,y], angle (radians), hasCloset, thickness, label, visible
- `Tower`: id, label, width, depth, height, accessories[]

### From domain helpers
- `isDoorOrWindowItem()`: checks if item.category=='door' or item.type=='window'
- `itemWallBandThickness()`: returns wall.thickness-1 for display bounds
- `wallInsideGuideAreaPoints()`: builds inside-side indicator polygon (from insideWallSide.ts)
- `cmToInches()`, `inchesToCm()`: unit conversion

### From useClosetStore (src/stores/useClosetStore.ts)
- `cabinet`: {width, height, depth, thickness}
- `towers[]`: array of Tower objects
- `exportForBackend()`: getter returning order-ready payload

## Architecture for New Features

### 1. **Connected-Side Gray Bands** (Adjacent wall indicators)
**Location to add:** After floor-line render, before items loop (line ~1883)
- Detect walls adjacent to selected wall using wall connectivity
- Render semi-transparent gray bands on left/right edges of elevation wall
- Call `wallEndpointConnectivity()` to determine which sides are connected
- Visual: 15-20px wide semi-transparent bands (e.g., rgba(107,92,69,0.3))
- Placed at wallX (left) and wallX+wallWidthPx (right)

**Helper needed:** `getAdjacentWalls(wallId)` returning {leftWall?, rightWall?}

### 2. **Closet Placement Slots/Blocks on Selected Wall Elevation**
**Location to add:** Before items loop (line ~1908)
- Render closet cabinet dimensions as a translucent block in elevation view
- Show where cabinet would sit on the selected wall
- From useClosetStore: closetStore.cabinet {width, height, depth}
- From roomStore: closetOffsetX, closetOffsetY, closetOffsetZ
- Cabinet position: `(selectedWall.width - cabinet.width) / 2 + closetOffsetX`
- Visual: semi-transparent rect (e.g., rgba(100,150,100,0.15)) with dashed border
- Display: "Closet" label + dimensions inside block
- Selectable/movable: add click + drag to update closetOffsetX

**Helper needed:** `closetBlockInElevation(wallCm, roomHeightCm, cabinetDims, offset)` returning rect coords

### 3. **Measurement Overlays for Order-Ready Dimensions**
**Location to add:** Can attach to closet block OR add separate overlay panel
- Display order-ready measurements: cabinet width, height, depth
- Show tower layout: tower widths + total
- Constraints: show if cabinet width > wall.length (warning)
- Measurements should be aligned to grid/dimen lines

**Helper needed:**
- `getOrderReadyMeasurements(closetStore)` returning {cabinetWidth, cabinetHeight, cabinetDepth, towerWidths}
- `formatDimension(cm, units)` for consistent display

## Integration Points

### State mutations needed:
- Store `selectedElevationMode`: 'view' | 'place-closet' | 'measure'
- Store closet block selection state if making it movable

### Computed properties to add:
- `canShowClosetBlock`: roomStore.closetWall?.id === elevationWallId.value
- `cabinetElevationRect`: computed from closetStore + roomStore offsets
- `connectedWalls`: computed from wallEndpointConnectivity

### Geometry helper file candidates:
- Create new: `src/features/closet/domain/geometry/elevationHelpers.ts`
  - `elevationClosetBlockRect(wallLengthCm, roomHeightCm, cabinet, offset): ElevationRect`
  - `wallConnectivityBands(walls, selectedWallIdx): {left: boolean, right: boolean}`
  - `getOrderReadyMeasurements(closetState): MeasurementData`

## Styling Additions Needed

Classes to add to [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue#L2599):
- `.elevation-connected-band` (rgba(107,92,69,0.3), width 20px, pointer-events: none)
- `.elevation-closet-block` (rgba(100,150,100,0.15), dashed border #6b964d)
- `.elevation-closet-block.selected` (brighter green, solid border)
- `.elevation-measurements-overlay` (flex column, positioned overlay with dimension lines)
- `.elevation-measurement-line` (thin border-bottom, with value label)

## Test Coverage Needed

### Tests to add/update:
- tests/floorPlan.elevation.connected-walls.test.ts: verify bands appear for connected/disconnected walls
- tests/floorPlan.elevation.closet-blocks.test.ts: verify cabinet rect positioning and offset updates
- tests/floorPlan.elevation.measurements.test.ts: verify order-ready dimension display + constraints

## Risk Areas & Gotchas

1. **Scale consistency**: elevationLayout.scale must be used consistently for all pixel conversions
2. **Coordinate origin**: SVG origin is top-left; cm geometry uses room coords; need careful transformation
3. **Wall connectivity state**: wallEndpointConnectivity() is expensive if called per-frame; memoize
4. **Cabinet offset bounds**: closetOffsetX must respect wall length - cabinet width; add clamping logic
5. **Closet wall detection**: only show closet block if selectedWall.hasCloset === true

## Source: /memories/session/elevation-implementation-guide.md

# Floor Plan Elevation Implementation Guide

## Exact File Locations & Key Symbols

### Primary Implementation File
**[src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue)**
- Lines 370-412: State and computed properties for elevation
- Lines 434-507: Geometry calculation functions
- Lines 530-680: Interaction handlers
- Lines 1840-1980: SVG rendering template
- Lines 2599-2670: CSS styles

### Supporting Store Files
**[src/stores/useRoomStore.ts](src/stores/useRoomStore.ts)**
- Line 299: `isBoundaryWall()` function
- Line 306: `isBothConnectedWall()` function
- Line 312-340: `wallEndpointConnectivity()` function (returns {startConnected, endConnected})
- Line 357: `itemsOnWall()` getter
- Line 704: `updateItemProps()` action
- Line 727-740: `setClosetOffsetX()`, `setClosetOffsetY()`, `setClosetOffsetZ()` actions

**[src/stores/useClosetStore.ts](src/stores/useClosetStore.ts)**
- Line 25: `exportForBackend` getter (returns order-ready data)
- State properties: `cabinet`, `towers[]`

### Domain Types
**[src/features/closet/domain/types/room.ts](src/features/closet/domain/types/room.ts)**
- Line 57-75: `PlacedItem` type definition
- Line 8-27: `Wall` type definition
- Line 85-96: `Room` type definition

**[src/features/closet/domain/types/tower.ts](src/features/closet/domain/types/tower.ts)**
- Line 41-48: `Tower` type definition
- Line 80-87: Tower depth/height options

### Geometry Helpers
**[src/features/closet/domain/geometry/insideWallSide.ts](src/features/closet/domain/geometry/insideWallSide.ts)**
- Line 18: `wallInsideEdgeLine()` - computes wall's inside-facing edge
- Line 47: `wallInsideGuideAreaPoints()` - builds polygon string for shadow band

### Constraints
**[src/features/closet/domain/constraints.ts](src/features/closet/domain/constraints.ts)**
- Line 1-45: All constraint definitions (CABINET_CONSTRAINTS, TOWER_CONSTRAINTS, ROOM_CONSTRAINTS)

## Architecture for Each Feature

### Feature 1: Connected-Side Gray Bands

**Render location:** [FloorPlan.vue L1883](src/features/closet/views/FloorPlan.vue#L1883) after `elevation-floor-line`

**Implementation steps:**
1. Before items rendering loop, add computed for connected walls:
   ```typescript
   const wallConnectivity = computed(() => {
     if (!elevationWall.value) return { startConnected: false, endConnected: false };
     const idx = roomStore.walls.findIndex(w => w.id === elevationWall.value!.id);
     return wallEndpointConnectivity(roomStore.walls, idx);
   });
   ```

2. Add SVG rendering (insert after floor-line, before items loop):
   ```xml
   <!-- Left connected band (if start is connected) -->
   <rect v-if="wallConnectivity.startConnected"
     :x="elevationLayout.wallX - 20"
     :y="elevationLayout.wallY"
     width="20"
     height="elevationLayout.wallHeightPx"
     class="elevation-connected-band" />
   
   <!-- Right connected band (if end is connected) -->
   <rect v-if="wallConnectivity.endConnected"
     :x="elevationLayout.wallX + elevationLayout.wallWidthPx"
     :y="elevationLayout.wallY"
     width="20"
     height="elevationLayout.wallHeightPx"
     class="elevation-connected-band" />
   ```

3. Add CSS class (at line ~2670):
   ```css
   .elevation-connected-band {
     fill: rgba(107, 92, 69, 0.25);
     stroke: #6b5c45;
     stroke-width: 1;
     stroke-dasharray: 2, 2;
     pointer-events: none;
   }
   ```

**Dependencies:** `wallEndpointConnectivity()` from useRoomStore (already imported)

---

### Feature 2: Closet Placement Blocks

**Render location:** [FloorPlan.vue L1908](src/features/closet/views/FloorPlan.vue#L1908) before items loop

**New helper file to create:**
`src/features/closet/domain/geometry/elevationClosetLayout.ts`
```typescript
import type { ClosetStateV2 } from '../schema'
import { CM_PER_INCH } from '../types/room'

export type ElevationClosetBlockRect = {
  x: number
  y: number
  width: number
  height: number
}

export function closetBlockElevationRect(
  wallLengthCm: number,
  roomHeightCm: number,
  cabinetWidth: number,
  cabinetHeight: number,
  closetOffsetX: number,
  scale: number,
  wallX: number,
  wallY: number,
): ElevationClosetBlockRect {
  // Cabinet positioned centered by default, adjustable by closetOffsetX
  const centerX = (wallLengthCm - cabinetWidth) / 2
  const cabinetLeftCm = Math.max(0, Math.min(
    wallLengthCm - cabinetWidth,
    centerX + closetOffsetX / CM_PER_INCH
  ))
  
  return {
    x: wallX + cabinetLeftCm * scale,
    y: wallY + (roomHeightCm - cabinetHeight) * scale,
    width: cabinetWidth * scale,
    height: cabinetHeight * scale,
  }
}
```

## Source: /memories/session/floorplan-exploration.md

# FloorPlan Exploration Summary

## Left Panel Structure
**File:** [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue#L1166)
- Container: `<aside class="sidebar sidebar-left">` (lines 1166-1227)
- Sections:
  - "Layout Tools" heading
  - "Quick Presets" buttons (QUICK_ROOM_PRESETS list)
  - "Draw Wall" section with:
    - Custom Room / Clear Drawing buttons
    - Show Inside indicator checkbox

## Right Panel Structure  
**File:** [src/features/closet/views/FloorPlan.vue](src/features/closet/views/FloorPlan.vue#L1543)
- Container: `<aside class="sidebar sidebar-right">`
- Wall Options section (Height, Thickness)
- Conditional `v-if="selectedWall"` section for selected wall properties:
  - Add Wall button (lines ~1603)
  - Label, Length, Height, Thickness inputs
  - Angle controls (-1°, input, +1°)
  - Visible checkbox
  - "Use As Closet Wall" button

## Source: /memories/session/plan.md

## Plan: Elevation No-Cross Wall Boundaries

Enforce strict horizontal usable bounds in elevation so doors, windows, and closet blocks can never enter connected side-wall zones. Reuse existing connectivity detection and collision flow in FloorPlan, add shared band-margin helpers in cm-space, then apply those helpers consistently to drag, resize, add-placement, validation, and visuals.

**Steps**
1. Phase 1 - Define canonical elevation horizontal bounds (foundation).
2. In src/features/closet/views/FloorPlan.vue, add computed helpers derived from elevationWallConnectivity and wall geometry: startMarginCm, endMarginCm, minUsableLeftCm, maxUsableRightCm, usableSpanCm.
3. Add a shared clamp helper for horizontal placement in cm-space (e.g., clampLeftWithinUsableRange(widthCm, leftCm)) and keep one epsilon/tolerance constant for boundary comparisons.
4. Add a guard for degenerate walls (usableSpanCm <= 0) so interactions become no-op instead of producing invalid coordinates.
5. Phase 2 - Apply bounds to openings (door/window) interactions (depends on Phase 1).
6. Update elevationItemGeometryCm to clamp leftPosition into the usable interval, not full wall interval.
7. Update elevationOpeningRectCm and elevationOpeningRectsCmForCurrentWall so all opening rectangles reflect bounded geometry used by placement/collision checks.
8. In onElevationPointerMove item move mode, replace full-wall minX/maxX with band-aware minX/maxX based on minUsableLeftCm/maxUsableRightCm.
9. In onElevationPointerMove item resize modes, cap width so right edge cannot pass maxUsableRightCm and left edge cannot pass minUsableLeftCm.
10. Phase 3 - Apply bounds to closet placement and interactions (depends on Phases 1-2).
11. Update isClosetPlacementValid with explicit horizontal boundary checks against minUsableLeftCm/maxUsableRightCm for the target wall.
12. Update findFirstValidClosetLeftCm to start scanning at minUsableLeftCm and stop at maxUsableRightCm - widthCm.
13. In onElevationPointerMove closet move mode, clamp X to usable range before building next candidate.
14. In onElevationPointerMove closet resize modes, compute maxWidthCm from usable right bound and current left, then validate via isClosetPlacementValid.
15. Keep overlap blocking unchanged (rectsOverlapCm + opening/closet checks), but ensure bounded geometry feeds those checks.

## Source: /memories/repo/floorplan-add-wall-connectivity.md

- Add Wall continuation start must use the exact selected wall endpoint (no grid snap), otherwise endpoint distance can exceed 1-unit connectivity tolerance and a connected joint may still render green.
- Keep 45-degree snapping for user target direction, but do not quantize the continuation anchor itself.
- Regression guard: verify endpoint color transitions green -> yellow after adding a wall from a previously free continuation endpoint.

## Source: /memories/repo/floorplan-elevation-overlay.md

- FloorPlan elevation is implemented as a center-canvas overlay, not a route/modal; both sidebars stay visible.
- Floor-plan SVG is hidden with v-show during elevation and restored on close (state preserved, drawing not destroyed).
- Elevation entry is in the selected-wall right sidebar panel (`Elevation` button) and appears only when a wall is selected.
- Elevation renders only door/window items attached to the opened wall and supports drag edits: X -> moveItem (along-wall), Y -> updateItemProps.elevation.
- Integration guard added in tests/floorPlan.addItems.selection.integration.test.ts for open/close + wall-specific item filtering + floor-plan restoration.
- Selected elevation opening now exposes width/height/corner resize handles; width clamps by remaining wall span from left edge, height clamps by room height above current elevation.
- Test guard also verifies resize handles appear when an elevation opening is selected.
- Phase-1 closet-fit start: session-local multi-closet blocks per wall are modeled in FloorPlan elevation with hard collision blocking against door/window and other closet rectangles.
- Elevation now shows connected-side gray bands and an order-measurement panel (left/right gaps, nearest opening distance, total/unit widths, top clearance, bottom elevation).

## Source: /memories/repo/floorplan-pivot.md

- Floor plan pivot selection must be deterministic by inside-left endpoint; never derive anchor from click proximity.
- In FloorPlan wall selection, compute anchor with geometry (inside reference) and pass same anchor to setWallAngle.
- Draw-wall inside-side visual marker uses wall direction right-hand side in screen space; final UX uses a shadow area band (no green line) and remains independent from pivot-anchor selection logic.
- In FloorPlan angle edits, keep selected wall anchor type stable during interaction; do not recompute per step to avoid intermittent endpoint pivot flips.

- Closed-room anchor selection in FloorPlan must use winding-only (signed area) to match store insideLeftPivot; projection-based anchor selection is for open/boundary topologies only.
- Keep docs in sync with topology-aware priority to avoid regression confusion.
- Avoid relying on local `isClosed` UI flag for pivot math; use `roomStore.roomIsClosed` in anchor selection to prevent stale-state regressions.
- Added UI-level regression test: tests/floorPlan.pivot.integration.test.ts validates FloorPlan wall selection + repeated Rotate +1 updates keep wall-2 concave inner-notch pivot fixed.

- In Draw Walls mode, inside-side area clicks should route through the same wall selection path as wall body clicks to prevent stale selection before angle edits.

- Pivot/inside rules now use side-sampling against the current polygon interior (point-in-polygon at wall midpoint +/- normal) in both FloorPlan and useRoomStore, with winding fallback only for degenerate side tests.

- Unified FloorPlan mode removes Draw Walls tab; integration tests should enter drawing via `Start Drawing` or `Clear and Redraw` depending on initial closed state, and Teleport dialogs require stubbing in Vue test utils when assertions rely on wrapper text.

- Current FloorPlan draw entry button labels in UI are `Custom Room` / `Clear Drawing`; tests searching for `Start Drawing` / `Clear and Redraw` will fail until updated.

- Add Wall continuation now uses only the endpoint opposite inside-left anchor ("right" endpoint), and the button is shown only when that endpoint is free; no Add Wall fallback when no wall is selected.
