# Walkthrough — API-Driven Shelf Count in Elevation View

## What Was Done

The elevation view now renders the **correct number of shelves per cabinet height tier** by reading the `numberOfShelves` field from the resolved cabinet record (API-driven), instead of a hardcoded `count: 5`.

---

## Changes Made

### [`closetCatalogs.ts`](file:///H:/Vue/Closet/src/features/closet/domain/closetCatalogs.ts)

Three changes in one file:

#### 1. Import addition (line 1)
`ShelfSetAccessory` and `ShoeShelfAccessory` types imported so the accessor mutation is type-safe.

#### 2. New `resolveShelfCount()` helper (exported)
```ts
export function resolveShelfCount(
  categoryCode: ClosetCatalogCategoryCode,
  cabinet: ClosetCabinetEntry | null | undefined,
): number {
  if (cabinet && Number(cabinet.numberOfShelves) > 0) {
    return Number(cabinet.numberOfShelves);
  }
  // Fallback defaults
  switch (categoryCode) {
    case 'CAS': case 'CCS': return 5;
    case 'CSS': return 5;
    default: return 0;
  }
}
```
Picks the value from the API-resolved cabinet. Falls back to `5` if `numberOfShelves` is 0 or the cabinet isn't resolved yet (e.g. on first load before API responds).

#### 3. `accessoriesForCategory()` — uses `resolveShelfCount` at tower creation
New towers (added via `createTowerFromCategory`) immediately start with the correct shelf count derived from the initial cabinet resolution.

#### 4. `refreshTowerCabinet()` — syncs shelf count on every dimension change
Two sync points added:
- **Main resolution path** (runs on every width/height/depth/boxCount change): syncs `shelf_set.count` for CAS/CCS and `shoe_shelf.count` for CSS.
- **`catalogSwitched` fast path** (runs when depth causes a catalog switch): also syncs from the first cabinet of the new catalog.

This means calling `setTowerHeight(id, 96)` will now automatically cascade to update the elevation view shelf count from 7 → 8 (for CAS at 96").

---

### [`constraints.ts`](file:///H:/Vue/Closet/src/features/closet/domain/constraints.ts)

```diff
- shelves: { min: 0, max: 10 },
+ shelves: { min: 0, max: 12 },
```

Raised max to accommodate API-driven counts above 10 for taller cabinets.

---

## Data Flow (After Change)

```
User changes height to 96" in BuildCloset.vue
  → useClosetStore.setTowerHeight(id, 96)
      → tower.height = 96 (clamped)
      → refreshTowerCabinet(tower)           ← existing hook
          → selectCabinet(…, height=96)      ← picks 96" cabinet
          → cabinet.numberOfShelves = 8      ← from API
          → resolveShelfCount('CAS', cab) → 8
          → tower.accessories[0].count = 8   ← ✅ synced
  ← FloorPlan.vue SVG reads accessories reactively
  ← Elevation view draws 8 shelves
```

---

## What Was Tested

### Automated
```
npm test   →   65 passed, 16 failed (all failures pre-existing, none related to shelf changes)
```

No new failures introduced. All relevant passing tests:
- `tests/drawWallAngles.test.ts` ✅
- `tests/insideWallSide.test.ts` ✅
- `tests/roomRotation.test.ts` ✅
- `tests/floorPlan.pivot.integration.test.ts` ✅
- `tests/floorPlan.presets.integration.test.ts` ✅

### Build
Pre-existing TS6133 (unused var) and TS2339 errors exist in `FloorPlan.vue`, `BuildCloset.vue`, `RoomPlanPreview.vue` — none introduced by this change. Build was already non-clean before.

---

## Manual Verification Steps

1. Open the app at `http://localhost:5175/closet/build`
2. Add a **CAS (Shelves)** tower
3. Set height to **84"** → elevation must show **7 shelves** (from `numberOfShelves` API field)
4. Set height to **90"** → must still show **7 shelves**
5. Set height to **96"** → must show **8 shelves**
6. Add a **CCS (Corner Shelves)** tower → same height-tier behavior
7. Add a **CSS (Shoe Shelves)** tower → shoe shelf count updates per API

> **Note:** If the API returns `numberOfShelves = 0` for any cabinet (or API is unavailable), the fallback of `5` is used — no visual regression vs. previous behavior.
