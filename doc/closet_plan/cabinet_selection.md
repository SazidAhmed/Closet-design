# Cabinet Selection Logic

## Overview

When a user edits a tower's **width**, **height**, or **depth** in the Build Closet UI, the system automatically selects the correct cabinet from the catalog's cabinet array using **range-based matching**. Each cabinet carries its own `minW`–`maxW` and `minH`–`maxH` range fields (from the backend API), and the entered value is checked against those ranges.

Once a matching cabinet is selected, the tower's `width`, `height`, and `depth` automatically **snap to the selected cabinet's actual nominal dimensions** (e.g. snapping from entered `13.5"` to the matched cabinet's `15.0"` width).

## Data Flow & Caching

```
1. App Mount / Load:
   loadCatalogs() (useClosetStore)
     → Checks Pinia memory state (`this.catalogCategories`)
     → Checks localStorage cache (`closet-catalog-categories-cache-v2`)
     → If uncached: GET /api/closet/catalog-categories (executed ONCE)
     → Persists in Pinia state + localStorage cache

2. User changes width / height in UI:
   onDimensionInput()            (BuildCloset.vue)
     → closet.setTowerWidth/Height() (useClosetStore)
     → refreshTowerCabinet(tower)    (closetCatalogs.ts)
       → resolveCabinetForTower()    (reads directly from Pinia in-memory categories)
         → resolveCatalogForTower()  picks catalog by depth (15D, 18D, 21D)
         → selectCabinet()           normalizes bounds & matches cabinet by range
       → updates tower.cabinetCode, tower.cabinetId
       → snaps tower.width, tower.height, tower.depth to matched cabinet dimensions
```

## Key Types

### ClosetCabinetEntry

Each cabinet object from the API carries both its **actual nominal dimensions** and its **valid coverage range**:

```ts
{
  id: number             // e.g. 4302
  code: string           // e.g. "CRD128415"

  // Actual nominal dimensions (used to snap the tower after selection)
  width: number          // e.g. 12.0
  height: number         // e.g. 84.0
  depth: number          // e.g. 15.0

  // Valid range this cabinet covers (used for selection matching)
  minW: number           // e.g. 10.0
  maxW: number           // e.g. 13.0
  minH: number           // e.g. 80.0
  maxH: number           // e.g. 85.0
  minD: number           // e.g. 13.0
  maxD: number           // e.g. 16.0

  boxOptions: number[]   // [1, 2] or [2]
  basePrice: string
  // ...other fields
}
```

## selectCabinet() — Core Selection Function

**Location:** `src/features/closet/domain/closetCatalogs.ts`

This is an isolated, pure function that normalizes cabinet bounds (`min_w` / `minW`, `max_w` / `maxW`, etc.) and performs range matching.

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

1. **Property Normalization** — Ensures `minW`, `maxW`, `minH`, `maxH`, `minD`, `maxD` are valid numbers, extracting from both camelCase and API `snake_case` fields (`min_w`, `max_w`, etc.).
2. **Filter by box count** — Only consider cabinets whose `boxOptions` includes the requested `boxCount`. Falls back to all cabinets if no match.
3. **Range match** — Find cabinets where `minW ≤ width ≤ maxW` AND `minH ≤ height ≤ maxH`.
   - If exactly one matches → return it.
   - If multiple match → pick the one with the **tightest width range** (smallest `maxW - minW`).
4. **Gap fallback** — If no cabinet's range covers the entered value (e.g. entering a value outside standard bounds), pick the **nearest** cabinet by combined distance to the width and height range boundaries. Tie-break: prefer the **next wider** cabinet (`minW ≥ width`).

### Concrete Example (API Catalog Response)

Given two cabinets in the `Drawers (CRD)` 15D catalog:

| Cabinet Code  | Cabinet ID | width | height | depth | minW (min_w) | maxW (max_w) | minH | maxH |
| ------------- | ---------- | ----- | ------ | ----- | ------------ | ------------ | ---- | ---- |
| `CRD128415` | `#4302`  | 12.0  | 84.0   | 15.0  | 10.0000      | 13.0000      | 80.0 | 85.0 |
| `CRD158415` | `#4303`  | 15.0  | 84.0   | 15.0  | 13.0625      | 16.0000      | 80.0 | 85.0 |

- User enters **width = 12** → `10.0 ≤ 12 ≤ 13.0` → matches **CRD128415** (`#4302`) → tower snaps to `{width: 12.0, height: 84.0, depth: 15.0}`
- User enters **width = 13** → `10.0 ≤ 13 ≤ 13.0` → matches **CRD128415** (`#4302`) → tower stays `{width: 12.0, height: 84.0, depth: 15.0}`
- User enters **width = 13.5** → exceeds `maxW` (13.0) of CRD128415 → falls into next range (`13.0625 ≤ 13.5 ≤ 16.0`) → matches **CRD158415** (`#4303`) → tower snaps to `{width: 15.0, height: 84.0, depth: 15.0}`
- User enters **width = 15** → `13.0625 ≤ 15 ≤ 16.0` → matches **CRD158415** (`#4303`) → tower stays `{width: 15.0, height: 84.0, depth: 15.0}`

## Dimension Snapping

After `selectCabinet` returns the matching cabinet, `refreshTowerCabinet` **snaps** the tower's `width`, `height`, and `depth` to the cabinet's actual nominal dimensions:

```ts
if (cabinet) {
  tower.width = cabinet.width;
  tower.height = cabinet.height;
  tower.depth = cabinet.depth;
}
```

This guarantees the tower's dimensions and UI input fields strictly match the selected physical cabinet payload from the backend API.

## API Mapping & Caching Architecture

1. **Snake Case Parsing**: The backend API returns cabinet range fields as `snake_case` (`min_w`, `max_w`, `min_h`, `max_h`, `min_d`, `max_d`, `catalog_id`). These are mapped during `loadCatalogCategories` in `src/features/closet/domain/closetCatalogs.ts` and normalized on-the-fly in `selectCabinet`.
2. **Persistence**: `useClosetStore.loadCatalogs()` caches the category/catalog/cabinet payload in Pinia memory state and `localStorage` (`closet-catalog-categories-cache-v2`). Subsequent interactions, calculations, and route navigations perform zero network requests.

## Files Involved

| File                                             | Role                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/features/closet/domain/closetCatalogs.ts` | `selectCabinet()`, `resolveCabinetForTower()`, `refreshTowerCabinet()`, type definitions |
| `src/features/closet/api/closetApi.ts`         | `mapCabinet()` — maps API response to `ClosetCabinetEntry`                                |
| `src/stores/useClosetStore.ts`                 | `loadCatalogs()` (Pinia + localStorage caching), `setTowerWidth/Height/Depth` actions      |
| `src/features/closet/views/BuildCloset.vue`    | UI sidebar category list and`onDimensionInput()` event handler                               |
| `tests/closetCatalogs.test.ts`                 | Unit tests for cabinet resolution                                                              |
