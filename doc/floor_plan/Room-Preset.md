# Floor Plan Quick Presets: Technical Implementation Notes

## Date
- April 9, 2026
- April 18, 2026 (connectivity/joint rendering addendum)

## Scope
This document describes the implementation details of Quick Room presets in Floor Plan, including:
- preset data model and room generation,
- unified sidebar/canvas behavior,
- replacement confirmation flow,
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
- Unified Draw Walls SVG rendering for both presets and custom layouts.
- Preset replacement confirmation modal for non-empty layouts.
- Architecture item placement controls (door/window) in the same sidebar.

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
- requestQuickPreset(presetId) + applyQuickPreset(presetId) in FloorPlan.vue.

Behavior:
1. User selects a preset card in the unified sidebar.
2. If the current layout has walls/items, show a custom confirmation modal.
3. On confirmation, create room via createQuickRoomFromPreset(presetId, roomStore.height).
4. Preserve current colors from roomStore.colors.
5. Preserve current room height.
6. Reset closet offsets:
	- closetOffsetX = 0
	- closetOffsetY = 0
	- closetOffsetZ = 0
7. Clear selected item/wall state and keep Draw Walls editing available.
8. Set active quickPresetId for UI state.

Design choice:
- Preset selection changes geometry only; cosmetic settings remain stable.

## 4. Unified Rendering And Editing Contract

Presets no longer render in a separate quick canvas.

Current behavior:
1. Presets and drawing share the Draw Walls canvas and styling.
2. Preset-generated walls can be selected/rotated/edited immediately.
3. Doors/windows can be added and edited in the same sidebar after preset apply.
4. Explicit drawing start rule remains unchanged (canvas clicks do not begin drawing unless Start Drawing/Add Wall activated).

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

- Quick presets are selectable from the unified sidebar.
- Non-empty layout replacement requires explicit confirmation.
- Colors and height persist across preset changes.
- Presets inherit the Draw Walls editing behavior and visuals.
- Quick resize handles and axis-lock controls are removed.

## 10. Validation Performed

Type and diagnostics:
- Vue/TS diagnostics checked after changes.

Automated tests:
- npm test
- Result: 23/23 tests passing.

Latest regression validation (April 18, 2026):
- npm test
- Result: 26/26 tests passing.

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

## 13. Open-Preset Add Wall Connectivity Addendum

Scenario covered:
1. User applies an open preset (for example U-open).
2. User selects a boundary wall with one free endpoint.
3. User clicks Add Wall and draws a connecting wall from that free endpoint.

Expected behavior:
1. Before connection, the free endpoint dot is green (`#22c55e`).
2. After the new wall is created from that endpoint, the same endpoint turns yellow (`#fbbf24`).
3. Add Wall continuation seeds from the exact continuation endpoint coordinate (no seed-time grid snap).

Why this was needed:
- Seed-time grid snapping could drift the new wall start enough that connectivity checks did not classify the endpoint as connected, leaving the dot green incorrectly.

Visual joint note:
- To reduce visible seams at the new-to-existing wall junction, wall polygons render with `stroke-linejoin="round"` and `stroke-linecap="round"`.
