# Enforce 1/16″ (0.0625″) Increment & Rounding Standard Across All Dimensions

## Overview

In American custom closet design and manufacturing, dimensions are specified in fractional inches (in increments of 1/16″ = 0.0625″). Allowing arbitrary 4-decimal values (e.g. `0.0011″`) introduces precision mismatches, manufacturing invalidity, and customer confusion.

This plan enforces **multiples of 0.0625** (1/16″) as the strict baseline precision across all input controls, manual drag/resize interactions, store action boundaries, and UI displays.

### Conversion Grid (1/16″ Multiples)

| Fraction | Exact Decimal | Rounded Display |
| -------- | ------------- | --------------- |
| 1/16     | 0.0625        | 0.0625          |
| 2/16     | 0.1250        | 0.1250          |
| 3/16     | 0.1875        | 0.1875          |
| 4/16     | 0.2500        | 0.2500          |
| 5/16     | 0.3125        | 0.3125          |
| 6/16     | 0.3750        | 0.3750          |
| 7/16     | 0.4375        | 0.4375          |
| 8/16     | 0.5000        | 0.5000          |
| 9/16     | 0.5625        | 0.5625          |
| 10/16    | 0.6250        | 0.6250          |
| 11/16    | 0.6875        | 0.6875          |
| 12/16    | 0.7500        | 0.7500          |
| 13/16    | 0.8125        | 0.8125          |
| 14/16    | 0.8750        | 0.8750          |
| 15/16    | 0.9375        | 0.9375          |
| 16/16    | 1.0000        | 1.0000          |

### Rounding Standard

Any non-multiple value entered or generated via mouse dragging will be rounded to the nearest multiple of `0.0625`:
$$\text{snappedValue} = \text{round}\left(\frac{\text{rawInput}}{0.0625}\right) \times 0.0625$$
- Standard half-way tie breaking (if $\ge 0.03125$ remainder $\rightarrow$ round up; if $< 0.03125$ remainder $\rightarrow$ round down).
- Floating-point noise (e.g., `0.18750000000000003`) will be cleaned up using `Number(val.toFixed(4))`.

---

## User Review Required

> [!IMPORTANT]
> - All HTML number inputs (`<input type="number">`) for dimensions will have `step="0.0625"` instead of `step="0.0001"`. Using native step arrows (up/down) will increment/decrement by `0.0625"`.
> - Direct typing of numbers into input fields that are not exact multiples of 0.0625 will automatically snap to the nearest 1/16″ on `@change` / `@blur`.
> - Interactive mouse dragging (drawing walls, dragging wall endpoints, positioning doors/windows, elevation resizing, moving cabinets along walls) will snap all lengths and offsets to 0.0625″ increments.

---

## Open Questions

*None at this time based on explicit user requirements.*

---

## Proposed Changes

### Core Utilities & Helpers

#### [NEW] [snapUtils.ts](file:///h:/Vue/Closet/src/features/closet/domain/snapUtils.ts)
- Create a canonical unit snapping utility:
  ```ts
  export const INCH_STEP = 0.0625; // 1/16"

  export function snapTo16th(val: number): number {
    if (!Number.isFinite(val)) return 0;
    const snapped = Math.round(val / INCH_STEP) * INCH_STEP;
    return Number(snapped.toFixed(4));
  }
  ```

---

### Room State Management

#### [MODIFY] [useRoomStore.ts](file:///h:/Vue/Closet/src/stores/useRoomStore.ts)
- Apply `snapTo16th` in all room store dimension actions:
  - `setWallLength(id, length)`: snap `length`.
  - `setWallThickness(id, thickness)`: snap `thickness`.
  - `setHeight(height)`: snap `height`.
  - `updatePlacedItem(id, partial)`: snap `width`, `height`, `leftPosition`, `elevation`, `offset`.
  - `updateWallProps(id, props)`: snap numerical property updates.

---

### Closet State Management

#### [MODIFY] [useClosetStore.ts](file:///h:/Vue/Closet/src/stores/useClosetStore.ts)
- Apply `snapTo16th` in all closet store dimension actions:
  - `setTowerWidth(towerId, width, wallLength)`: snap `width` before and after clamping.
  - `setTowerDepth(towerId, depth)`: snap `depth`.
  - `setTowerHeight(towerId, height)`: snap `height`.
  - `setTowerOutset(towerId, outset)`: snap `outset`.
  - `setTowerElevation(towerId, elevation)`: snap `elevation`.
  - `moveTowerAlongWall(towerId, delta, wallLength)`: snap resulting position / clearance offset to 1/16″ multiples.

---

### View Components & UI Inputs

#### [MODIFY] [BuildCloset.vue](file:///h:/Vue/Closet/src/features/closet/views/BuildCloset.vue)
- Update HTML input step attributes from `step="0.0001"` to `step="0.0625"` for Width, Height, Depth, Outset, Elevation, and Left/Right Clearances.
- Update `onDimensionInput` and `onClearanceInput` to pass `snapTo16th(value)` to store actions.
- Update `truncTo4` and display formatting helpers to ensure clean 4-decimal representation of snapped 1/16″ values without floating-point artifacts.
- Update elevation drag / nudge handlers (`nudgeTowerLeft`, `nudgeTowerRight`, drag handlers) to move in 0.0625″ steps.

#### [MODIFY] [FloorPlan.vue](file:///h:/Vue/Closet/src/features/closet/views/FloorPlan.vue)
- Update HTML input step attributes from `step="0.0001"` to `step="0.0625"` for Wall Length, Wall Thickness, Wall Height, Door/Window Width, Height, Left Position, Right Position, and Elevation.
- Update input change handlers (`onSelectedWallLengthInput`, `onSelectedItemSizeInput`, `onSelectedItemSideInput`, `onSelectedItemElevationInput`) to snap input values to 1/16″.
- Update wall drawing and SVG vertex drag interaction handlers to snap wall segment lengths to `0.0625"`.

#### [MODIFY] [DesignCloset.vue](file:///h:/Vue/Closet/src/features/closet/views/DesignCloset.vue)
- Update input step attributes to `step="0.0625"` and enforce `snapTo16th` on dimension change handlers.

---

## Verification Plan

### Automated Tests
- Create a new unit test suite [snapUtils.test.ts](file:///h:/Vue/Closet/tests/snapUtils.test.ts) testing `snapTo16th`:
  - Test exact 1/16 values (`0.0625`, `0.125`, `0.1875`, `0.25`, `0.3125`, `0.375`, `0.4375`, `0.5`, `0.5625`, `0.625`, `0.6875`, `0.75`, `0.8125`, `0.875`, `0.9375`, `1.0`).
  - Test rounding down (e.g. `0.02` $\rightarrow$ `0.0`), rounding up (e.g. `0.04` $\rightarrow$ `0.0625`).
  - Test arbitrary inputs like `0.0011` $\rightarrow$ `0.0`.
- Update store integration tests in `tests/roomStore.test.ts` and `tests/closetCatalogs.test.ts` to confirm wall lengths, tower dimensions, and item positions remain clean 1/16″ multiples.

### Manual Verification
- In Build Closet sidebar:
  - Input `14.503` in Width input field and press Enter/blur $\rightarrow$ snaps to `14.5000` (14 1/2″).
  - Input `14.54` in Width input field $\rightarrow$ snaps to `14.5625` (14 9/16″).
  - Click native HTML up/down arrows on number inputs $\rightarrow$ increments/decrements by `0.0625`.
- In Floor Plan sidebar:
  - Input `120.03` for wall length $\rightarrow$ snaps to `120.0313` (120 1/16″).
  - Drag wall endpoints or items $\rightarrow$ verifies snapped dimensions.
