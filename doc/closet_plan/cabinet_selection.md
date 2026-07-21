# Cabinet Selection Logic

## Overview

When a user edits a tower's **width** or **height** in the Build Closet UI, the system automatically selects the correct cabinet from the catalog's cabinet array using **range-based matching**. Each cabinet carries its own `minW`–`maxW` and `minH`–`maxH` range fields (from the API), and the entered value is checked against those ranges.

## Data Flow

```
User changes width/height
  → onDimensionInput()            (BuildCloset.vue)
  → closet.setTowerWidth/Height() (useClosetStore)
  → refreshTowerCabinet(tower)    (closetCatalogs.ts)
    → resolveCabinetForTower()
      → resolveCatalogForTower()  picks the catalog by depth
      → selectCabinet()           picks the cabinet by width + height range
    → snaps tower.width/height/depth to cabinet dimensions
```

## Key Types

### ClosetCabinetEntry

Each cabinet object from the API carries both its **actual dimensions** and its **valid range**:

```ts
{
  id: number
  code: string

  // Actual cabinet dimensions (used to snap the tower after selection)
  width: number
  height: number
  depth: number

  // Range this cabinet covers (used for selection matching)
  minW: number   // e.g. 6.0
  maxW: number   // e.g. 13.0
  minH: number   // e.g. 80.0
  maxH: number   // e.g. 85.0
  minD: number
  maxD: number

  boxOptions: number[]   // [1, 2] or [2]
  basePrice: string
  // ...other fields
}
```

## selectCabinet() — Core Selection Function

**Location:** `src/features/closet/domain/closetCatalogs.ts`

This is an isolated, pure function designed to be extended with more selection rules later.

### Signature

```ts
selectCabinet(
  cabinets: ClosetCabinetEntry[],
  width: number,
  height: number,
  boxCount: 1 | 2 = 2,
): ClosetCabinetEntry | null
```

### Algorithm

1. **Filter by box count** — Only consider cabinets whose `boxOptions` includes the requested `boxCount`. Falls back to all cabinets if no match.
2. **Range match** — Find cabinets where `minW ≤ width ≤ maxW` AND `minH ≤ height ≤ maxH`.

   - If exactly one matches → return it.
   - If multiple match → pick the one with the **tightest width range** (smallest `maxW - minW`).
3. **Gap fallback** — If no cabinet's range covers the entered value (the value falls in a gap between two cabinets), pick the **nearest** cabinet by combined distance to the width and height range boundaries. Tie-break: prefer the **next wider** cabinet (the one whose `minW ≥ width`).

### Example

Given two cabinets in a catalog:

| Cabinet | width | height | depth | minW    | maxW | minH | maxH |
| ------- | ----- | ------ | ----- | ------- | ---- | ---- | ---- |
| #4089   | 12    | 84     | 15    | 6.0     | 13.0 | 80   | 85   |
| #4090   | 16    | 84     | 15    | 13.8625 | 16.0 | 80   | 85   |

- User enters **width = 12** → `6 ≤ 12 ≤ 13` → **#4089** selected → tower snaps to `{w:12, h:84, d:15}`
- User enters **width = 13** → `6 ≤ 13 ≤ 13` → still **#4089** → tower stays `{w:12, h:84, d:15}`
- User enters **width = 13.5** → gap (13 < 13.5 < 13.8625) → nearest is **#4090** → tower snaps to `{w:16, h:84, d:15}`
- User enters **width = 15** → `13.8625 ≤ 15 ≤ 16` → **#4090** → tower snaps to `{w:16, h:84, d:15}`

## Dimension Snapping

After `selectCabinet` returns a cabinet, `refreshTowerCabinet` **snaps** the tower's `width`, `height`, and `depth` to the cabinet's actual dimensions:

```ts
if (cabinet) {
  tower.width = cabinet.width;
  tower.height = cabinet.height;
  tower.depth = cabinet.depth;
}
```

This means the UI input will reflect the cabinet's base dimensions, not the raw value the user typed.

## API Mapping

The API returns cabinet range fields as snake_case (`min_w`, `max_w`, etc.). These are mapped in `mapCabinet()` inside `src/features/closet/api/closetApi.ts`:

```ts
minW: Number(raw.min_w ?? raw.minW ?? 0),
maxW: Number(raw.max_w ?? raw.maxW ?? 0),
// ...same for minH, maxH, minD, maxD
```

## Files Involved

| File                                             | Role                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/features/closet/domain/closetCatalogs.ts` | `selectCabinet()`, `resolveCabinetForTower()`, `refreshTowerCabinet()`, type definitions |
| `src/features/closet/api/closetApi.ts`         | `mapCabinet()` — maps API response to `ClosetCabinetEntry`                                |
| `src/stores/useClosetStore.ts`                 | `setTowerWidth/Height/Depth` actions call `refreshTowerCabinet`                            |
| `src/features/closet/views/BuildCloset.vue`    | `onDimensionInput()` — UI event handler                                                     |
| `tests/closetCatalogs.test.ts`                 | Unit tests for cabinet resolution                                                              |

## Future Extension Points

The `selectCabinet` function is intentionally isolated and takes a flat cabinet array + user dimensions. To add new selection rules:

- Add parameters to `selectCabinet` (e.g. depth range matching, material constraints)
- Layer additional filtering steps between step 1 (box count filter) and step 2 (range match)
- The function's callers (`resolveCabinetForTower`, `refreshTowerCabinet`) don't need to change
