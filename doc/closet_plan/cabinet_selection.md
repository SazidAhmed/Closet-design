# Cabinet Selection & Dimension Logic

## Overview

When a user edits a tower's **width**, **height**, or **depth** in the Build Closet UI, the system automatically resolves the best-matching cabinet from the active catalog using **range-based matching**. Each cabinet entry in the catalog carries its own valid coverage ranges (`minW`–`maxW`, `minH`–`maxH`, `minD`–`maxD`) received from the backend API.

Key behavior principles:
1. **Catalog Resolution**: The catalog array (15D, 18D, 21D, etc.) is resolved dynamically based on the tower's `doorMode`, `categoryCode`, and entered `depth`.
2. **Box Configuration Enforcement**: If a 1-box configuration is active (`boxCount: 1`), but the entered `width` exceeds the max 1-box threshold (`40"` for 15D/18D, `37"` for 21D+), `refreshTowerCabinet` automatically forces `boxCount` to `2`.
3. **Cabinet Code & ID Assignment**: The matched cabinet's `id` and `code` are assigned to `tower.cabinetId` and `tower.cabinetCode`.
4. **Dimension Preservation**: The user's entered `width`, `height`, and `depth` are **preserved as entered** (clamped only to category boundaries). They are **not** overwritten or snapped by the nominal dimensions (`cabinet.width`, `cabinet.height`, `cabinet.depth`) of the matched cabinet.

## Data Flow & Caching

```
1. App Mount / Load:
   loadCatalogs() (useClosetStore)
     → Checks Pinia memory state (`this.catalogCategories`)
     → Checks localStorage cache (`closet-catalog-categories-cache-v2`)
     → If uncached: GET /api/closet/catalog-categories (executed ONCE)
     → Persists in Pinia state + localStorage cache

2. User changes width / height / depth in UI:
   onDimensionInput()            (BuildCloset.vue)
     → closet.setTowerWidth/Height/Depth() (useClosetStore)
     → refreshTowerCatalog(tower) [on depth change]
     → refreshTowerCabinet(tower) (closetCatalogs.ts)
       → Enforces isOneBoxAvailable(doorMode, categoryCode, width, depth)
       → resolveCabinetForTower() (reads from Pinia in-memory categories)
         → resolveCatalogForTower() picks catalog by depth (15D, 18D, 21D)
         → selectCabinet()           normalizes bounds & matches cabinet by range
       → Updates tower.cabinetCode and tower.cabinetId
       → Preserves user's entered tower.width, tower.height, tower.depth
```

## Key Types

### ClosetCabinetEntry

Each cabinet object from the API carries its **nominal dimensions**, **valid coverage range**, and **box options**:

```ts
export type ClosetCabinetEntry = {
  id: number             // e.g. 4302
  code: string           // e.g. "CRD128415"

  // Nominal cabinet dimensions
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
  numberOfShelves: number
  numOfDrawers: number
  numOfRollouts: number
  basePrice: string
}
```

## Box Count Availability (`isOneBoxAvailable`)

**Location:** `src/features/closet/domain/closetCatalogs.ts`

Determines if 1-box construction is allowed for a given tower configuration:
- `with_doors` → Always `false` (doors do not use box counts).
- `15D` & `18D` depth → 1-box available up to **40"** width.
- `21D+` depth → 1-box available up to **37"** width.

If the user increases tower width past these thresholds while `boxCount === 1`, `refreshTowerCabinet` automatically resets `boxCount` to `2`.

## selectCabinet() — Core Selection Function

**Location:** `src/features/closet/domain/closetCatalogs.ts`

This isolated, pure function normalizes cabinet bounds (`min_w` / `minW`, `max_w` / `maxW`, etc.) and performs range matching.

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

1. **Property Normalization** — Guarantees `minW`, `maxW`, `minH`, `maxH`, `minD`, `maxD` are valid numbers, supporting both camelCase and backend API `snake_case` properties.
2. **Filter by Box Count** — Filters candidates where `boxOptions` includes the requested `boxCount`. Falls back to all candidates if none support the requested count.
3. **Range Match** — Finds cabinets satisfying `minW ≤ width ≤ maxW` AND `minH ≤ height ≤ maxH`.
   - Single match → Return candidate.
   - Multiple matches → Select candidate with the **tightest width range** (smallest `maxW - minW`).
4. **Gap Fallback** — If no range covers the entered value, picks the **nearest candidate** based on Euclidean/Manhattan distance to range boundaries. Tie-breaker: prefers the **next wider** cabinet (`minW ≥ width`).

### Example Resolution Scenarios

Given two cabinets in the `Drawers (CRD)` 15D catalog:

| Cabinet Code  | Cabinet ID | width | height | depth | minW (min_w) | maxW (max_w) | minH | maxH |
| ------------- | ---------- | ----- | ------ | ----- | ------------ | ------------ | ---- | ---- |
| `CRD128415`   | `#4302`    | 12.0  | 84.0   | 15.0  | 10.0000      | 13.0000      | 80.0 | 85.0 |
| `CRD158415`   | `#4303`    | 15.0  | 84.0   | 15.0  | 13.0625      | 16.0000      | 80.0 | 85.0 |

- User enters **width = 12** → `10.0 ≤ 12 ≤ 13.0` → matches **CRD128415** (`#4302`) → tower retains `{width: 12.0, height: 84.0, depth: 15.0}`
- User enters **width = 13** → `10.0 ≤ 13 ≤ 13.0` → matches **CRD128415** (`#4302`) → tower retains `{width: 13.0, height: 84.0, depth: 15.0}`
- User enters **width = 13.5** → Exceeds `maxW` (13.0) of CRD128415 → falls into next range (`13.0625 ≤ 13.5 ≤ 16.0`) → matches **CRD158415** (`#4303`) → tower retains `{width: 13.5, height: 84.0, depth: 15.0}`
- User enters **width = 15** → `13.0625 ≤ 15 ≤ 16.0` → matches **CRD158415** (`#4303`) → tower retains `{width: 15.0, height: 84.0, depth: 15.0}`

## Tower Dimension Preservation

In `refreshTowerCabinet`, `tower.cabinetId` and `tower.cabinetCode` are assigned without overwriting `tower.width`, `tower.height`, or `tower.depth`:

```ts
export function refreshTowerCabinet(tower: Tower): void {
  if (!tower.doorMode || !tower.categoryCode) return;

  if (
    tower.boxCount === 1 &&
    !isOneBoxAvailable(tower.doorMode, tower.categoryCode, tower.width, tower.depth)
  ) {
    tower.boxCount = 2;
  }

  const cabinet = resolveCabinetForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.width,
    tower.height,
    tower.depth,
    tower.boxCount ?? 2,
  );
  tower.cabinetId = cabinet?.id;
  tower.cabinetCode = cabinet?.code;
}
```

This guarantees that custom values entered in the Build Closet UI remain active in the input fields, 2D floor plan, and 3D viewport while pointing to the appropriate backend catalog item payload.

## API Mapping & Caching Architecture

1. **Snake Case Parsing**: Backend API fields (`min_w`, `max_w`, `min_h`, `max_h`, `min_d`, `max_d`, `catalog_id`, `door_mode`, `category_code`) are normalized into standard camelCase properties during `loadCatalogCategories` in `src/features/closet/domain/closetCatalogs.ts`.
2. **Persistence**: `useClosetStore.loadCatalogs()` caches the category/catalog/cabinet payload in Pinia state and `localStorage` (`closet-catalog-categories-cache-v2`).

## Primary Files

| File | Role |
| --- | --- |
| `src/features/closet/domain/closetCatalogs.ts` | Core domain functions: `selectCabinet()`, `resolveCabinetForTower()`, `refreshTowerCabinet()`, `isOneBoxAvailable()`, API loading & caching |
| `src/features/closet/api/closetApi.ts` | Network request helpers and API types |
| `src/stores/useClosetStore.ts` | Store state and dimension actions (`setTowerWidth`, `setTowerHeight`, `setTowerDepth`, `setTowerBoxCount`, `loadCatalogs`) |
| `src/features/closet/views/BuildCloset.vue` | Build Closet UI view, dimension control inputs, clearance logic, and box-count toggles |
| `tests/closetCatalogs.test.ts` | Comprehensive Vitest suite covering catalog resolution, box-count enforcement, and dimension preservation |

