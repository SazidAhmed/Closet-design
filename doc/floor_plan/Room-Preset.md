# Floor Plan Quick Presets: Technical Implementation Notes

## Date
- April 9, 2026

## Scope
This document describes the implementation details of Quick Room presets in Floor Plan, including:
- preset data model and room generation,
- quick-mode rendering pipeline,
- generic geometry resize algorithm,
- axis-lock behavior,
- visual rules currently active,
- validation and extension guidance.

## 1. Files and Responsibilities

### 1.1 src/features/closet/domain/quickRoomPresets.ts
Purpose:
- Stores quick preset definitions.
- Converts point chains into Wall objects.
- Exposes a factory to create a Room from a preset id.

Key exports:
- QUICK_ROOM_PRESETS
- DEFAULT_QUICK_ROOM_PRESET_ID
- createQuickRoomFromPreset(presetId, heightCm)

### 1.2 src/features/closet/views/FloorPlan.vue
Purpose:
- UI for preset selection.
- Quick-mode SVG rendering from room geometry.
- Drag/resize interaction.
- Axis-lock controls.
- Quick wall number badge rendering.

### 1.3 src/stores/useRoomStore.ts
Purpose:
- Owns room state.
- Performs geometry-level room scaling in resizeRoom(width, depth).

## 2. Preset Data Model

Preset source model:
- id: stable key used by UI.
- label: visible name.
- description: subtitle.
- shape: rectangular or custom.
- points: ordered 2D point chain in cm.
- closetWallIndex: index of wall flagged hasCloset.

Current presets:
- square-100
- u-open
- l-open
- top-bridge-open

Units:
- Preset definitions are written in inches then converted to cm using CM_PER_INCH.

Wall generation algorithm (wallsFromPoints):
1. Iterate consecutive point pairs start -> end.
2. Compute dx, dy, length = hypot(dx, dy).
3. Skip degenerate segments length < 1.
4. Create wall with:
	- position = start,
	- angle = atan2(dy, dx),
	- length,
	- thickness = 6,
	- label = 1..N,
	- hasCloset set by closetWallIndex.
5. Fallback: if no wall has hasCloset, set first wall as hasCloset.

## 3. Preset Apply Flow

Function:
- applyQuickPreset(presetId) in FloorPlan.vue.

Behavior:
1. Create room via createQuickRoomFromPreset(presetId, roomStore.height).
2. Preserve current colors from roomStore.colors.
3. Preserve current room height.
4. Reset closet offsets:
	- closetOffsetX = 0
	- closetOffsetY = 0
	- closetOffsetZ = 0
5. Clear selected item in quick canvas.
6. Set active quickPresetId for UI state.

Design choice:
- Preset selection changes geometry only; cosmetic settings remain stable.

## 4. Quick Mode Rendering Pipeline

Quick mode now renders from wall geometry, not from fixed rectangular assumptions.

Computed geometry inputs:
- quickBounds = roomStore.planBounds
- roomW = quickBounds.width
- roomD = quickBounds.depth
- svgViewBox centered on quickBounds.centerX / centerY with padding.

Rendered quick elements:
1. Wall segments from each wall start point to computed wall end point.
2. Wall number badges at wall midpoint using wall.label.
3. Dimension lines:
	- rectangular quick rooms: global top/right dimensions,
	- non-rectangular quick rooms: per-wall dimensions.
4. Resize handles:
	- corners and midpoints from quickBounds extents.

Current visual rule:
- No interior fill in quick mode (removed by request).

## 5. Generic Resize Algorithm

Location:
- useRoomStore.ts -> resizeRoom(width, depth)

Previous limitation:
- Worked only for strict 4-wall rectangles.

Current behavior:
- Scales any room wall chain around plan center.

Algorithm:
1. Clamp target width/depth via ROOM_CONSTRAINTS.wallLength.
2. Compute current bounds from roomPlanBounds(this.walls).
3. Compute scale factors:
	- scaleX = targetWidth / sourceWidth
	- scaleY = targetDepth / sourceDepth
4. For each wall:
	- start = wall.position
	- end = wallEndPoint(wall)
	- scale start/end around bounds center:
	  - sx' = cx + (sx - cx) * scaleX
	  - sy' = cy + (sy - cy) * scaleY
	  - ex' = cx + (ex - cx) * scaleX
	  - ey' = cy + (ey - cy) * scaleY
	- rebuild wall:
	  - position = scaledStart
	  - length = hypot(ex' - sx', ey' - sy')
	  - angle = normalizeAngle(atan2(ey' - sy', ex' - sx'))

Notes:
- This is anisotropic scaling; wall angles can change as expected.
- Connectivity is preserved because both endpoints are transformed consistently.

## 6. Resize Interaction and Axis Lock

Location:
- FloorPlan.vue quick drag handlers.

State:
- drag.active, drag.axis, drag.cornerIdx, startMouse, startW, startD.
- quickResizeAxisLock: auto | width | depth.

Modes:
- auto: use handle semantic axis (corner=both, side=single axis).
- width: apply horizontal scaling only.
- depth: apply vertical scaling only.

Drag to size conversion:
- Convert pointer screen coordinates to SVG coordinates.
- Compute dx, dy from drag start.
- Resolve sign based on active handle and lock mode.
- Produce target newW/newD and call roomStore.resizeRoom(newW, newD).

UI control:
- Quick sidebar includes lock buttons: Free, Width, Depth.

## 7. Item Placement Updates for Arbitrary Geometry

Why changed:
- Old logic assumed fixed wall index orientation.

Current logic:
1. Find active wall by id.
2. Project cursor point onto wall vector to get normalized parameter t.
3. Clamp t to [0.05, 0.95].
4. Save as item.positionAlongWall.

Item render position:
- Interpolate along wall start/end using t.

Vertical wall check:
- Derived from angle using |sin(angle)| > |cos(angle)|.

## 8. Wall Number Badges in Quick Mode

Requirement:
- Show wall numbers like draw-mode look.

Implementation:
- Added badge group at wall midpoint per quick wall:
  - circle fill #f59e0b,
  - stroke #0f172a,
  - text from wall.label (fallback idx + 1).
- pointer-events disabled on badge group to avoid drag interference.

## 9. Known Decisions and Current UX Rules

- Quick presets are selectable and immediately applied.
- Colors and height persist across preset changes.
- All presets are resizable.
- Axis lock is available during quick resizing.
- Quick mode does not show interior floor fill.
- Wall number badges are visible in quick mode.

## 10. Validation Performed

Type and diagnostics:
- Vue/TS diagnostics checked after changes.

Automated tests:
- npm test
- Result: 23/23 tests passing.

Build validation:
- npm run build
- Result: successful build.

## 11. How to Add a New Preset Later

1. Open src/features/closet/domain/quickRoomPresets.ts.
2. Add a new entry to QUICK_PRESET_DEFS with id/label/description/shape/points/closetWallIndex.
3. Keep points ordered in drawing sequence.
4. For closed polygons, include return to first point.
5. For open shapes, provide open chain only.
6. Confirm wall labels and closetWallIndex are valid.
7. Run npm test and npm run build.

## 12. Suggested Follow-Ups

- Add thumbnail previews for each quick preset card.
- Add optional "Maintain aspect ratio" lock in quick resize.
- Add tests that directly verify resizeRoom behavior on open presets.
