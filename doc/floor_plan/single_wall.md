# Single Wall Door/Window Side-Position Recalculation

## 1. Purpose

This document records the implementation for recalculating:

- Left Position
- Right Position

for doors and windows when the item is moved or resized on a wall.

The goal is to always show the real free space from each wall corner to the item body.


## 2. Side Definition (Important)

Side positions are tied to wall direction, not screen direction.

- Left Position = distance from the wall start corner to the item left edge (along wall direction)
- Right Position = distance from the wall end corner to the item right edge (along wall direction)

In the user example screenshot:

- green-marked side acts as Left Position
- red-marked side acts as Right Position


## 3. Units

- Wall and item geometry in store are in cm.
- Left/Right Position displayed in UI are in inches.
- Conversion constant: CM_PER_INCH = 2.54.


## 4. Recalculation Math

Given:

- wallLengthIn = wall.length / 2.54
- itemWidthIn = item.width / 2.54
- centerOffsetIn = clamp(positionAlongWall, 0, 1) * wallLengthIn

Then:

- left = max(0, centerOffsetIn - itemWidthIn / 2)
- right = max(0, wallLengthIn - (centerOffsetIn + itemWidthIn / 2))

Display precision:

- round to 0.1 inch


## 5. Worked Example

Example values:

- wall length = 100 in
- door width = 27 in

Case A (centered):

- centerOffset = 50
- left = 50 - 13.5 = 36.5
- right = 100 - (50 + 13.5) = 36.5

Case B (moved toward left/start side):

- centerOffset = 20
- left = 20 - 13.5 = 6.5
- right = 100 - (20 + 13.5) = 66.5


## 6. Where It Is Implemented

### Store logic (source of truth)

File: src/stores/useRoomStore.ts

- recalculateDoorWindowSidePositions(...)
	- calculates and stores leftPosition/rightPosition
- called from:
	- addItem(...)
	- moveItem(...)
	- updateItemProps(...)

This ensures side positions stay synced after add, drag, and width/height edits.


### Floor plan UI behavior

File: src/features/closet/views/FloorPlan.vue

- Left Position input is editable
- Right Position input is editable
- Elevation remains editable
- Reverse-input handler: onSelectedItemSideInput(...)
- Input test hooks: data-testid="left-position-input" and data-testid="right-position-input"

Rationale:

- Left/Right edits are converted into positionAlongWall updates through moveItem(...), then store-side recalculation writes the canonical left/right values.


## 7. Current Behavior Summary

1. Add door/window -> starts centered on selected wall.
2. Drag item along wall -> positionAlongWall changes.
3. Store recalculates left/right immediately.
4. Sidebar shows updated distances in inches.


## 8. Test Coverage

File: tests/floorPlan.addItems.selection.integration.test.ts

Covered assertions:

- left/right values are correct for centered add
- left/right values update correctly after moveItem(...)
- window defaults also keep correct left/right calculation
- typing Left Position moves the item and recomputes Right Position
- typing Right Position moves the item and recomputes Left Position


## 9. Reverse Input Math (Left/Right -> Position)

Current reverse behavior implementation:

1. User edits Left Position or Right Position (in inches).
2. UI converts typed value to target center offset.
3. UI converts center offset to positionAlongWall.
4. UI calls moveItem(...).
5. Store recalculates both left/right values and updates panel.

Exact conversion:

- Left input:
	- centerOffsetIn = leftInputIn + (itemWidthIn / 2)
- Right input:
	- centerOffsetIn = wallLengthIn - (rightInputIn + itemWidthIn / 2)
- Then:
	- positionAlongWall = clamp(centerOffsetIn / wallLengthIn, 0, 1)

Guardrails:

- Values clamp to keep the item inside the wall span.
- If item width exceeds wall length, item is pinned to wall center.


## 10. Validation Status

- Focused integration test for add/move/reverse-input behavior passes.
- Production build passes.
- Full test suite currently has unrelated pre-existing failures in floor plan pivot integration tests.

