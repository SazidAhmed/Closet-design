# Catalog Selection & Depth-Based Cabinet Resolution

## Overview

In the Closet Designer application, closets are organized into **Categories** (e.g. *Shelves*, *Double Hanging*, *Drawers*), **Catalogs** (representing specific depth ranges, e.g. 15D, 18D, 21D), and **Cabinets** (individual catalog items with specific nominal dimensions and coverage boundaries).

When a user edits a tower's **depth**, **width**, or **height** in the Build Closet UI, the system dynamically resolves:
1. The appropriate **Catalog** using catalog depth boundaries (`minD`–`maxD`).
2. The appropriate **Cabinet** using range matching or first-cabinet selection.

---

## Key Principles

1. **Catalog Matching by Depth (`minD` / `maxD`)**:
   - Each catalog in a category carries explicit coverage bounds: `minD` and `maxD` received from the backend API.
   - `resolveCatalogForTower` matches the catalog satisfying `catalog.minD <= tower.depth <= catalog.maxD`.
   - If depth falls outside defined catalog ranges, it falls back to the nearest boundary catalog (`firstCatalog` if below minimum, `lastCatalog` if above maximum).

2. **Catalog Switch First-Cabinet Selection**:
   - When a depth edit causes a **catalog switch** (`newCatalogId !== oldCatalogId`), `refreshTowerCabinet` automatically selects the **very first cabinet** of the newly active catalog (`catalog.cabinets[0]`).
   - The tower's `cabinetId` and `cabinetCode` are updated to match the first cabinet's `id` and `code`.

3. **Same Catalog Preservation**:
   - When a depth edit remains within the **same catalog** (`newCatalogId === oldCatalogId`), standard range matching (`selectCabinet`) based on width and height continues to apply.

4. **Tower Dimension Preservation**:
   - The user's entered `width`, `height`, and `depth` are preserved as entered in user input fields, 2D floor plan, and 3D scene. They are not overwritten by nominal cabinet dimensions.

---

## Data Flow & Architecture

```
User Edits Depth in UI (BuildCloset.vue)
        │
        ▼
useClosetStore.setTowerDepth(towerId, depth)
        │
        ├─► Snap & Clamp depth (clampTowerDepth)
        │
        ├─► refreshTowerCatalog(tower)
        │     └─► resolveCatalogForTower(doorMode, categoryCode, depth)
        │           └─► Matches catalog where minD <= depth <= maxD
        │     └─► Detects catalog switch (returns { switched, catalog })
        │
        ├─► refreshTowerCabinet(tower, { catalogSwitched })
        │     ├─► If catalogSwitched === true:
        │     │     └─► tower.cabinetId = catalog.cabinets[0].id
        │     │     └─► tower.cabinetCode = catalog.cabinets[0].code
        │     │
        │     └─► Else (same catalog):
        │           └─► selectCabinet(catalog.cabinets, width, height, boxCount)
        │                 └─► Matches cabinet by minW..maxW and minH..maxH
        │
        └─► Sync attached custom parts (panels & fillers)
```

---

## Core Domain Functions

### `resolveCatalogForTower`
**Location:** `src/features/closet/domain/closetCatalogs.ts`

```ts
export function resolveCatalogForTower(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
  depth: number,
): ClosetCatalogEntry {
  const category = getCategoryByCode(doorMode, categoryCode);

  if (doorMode === "with_doors") {
    return category.catalogs[0]!;
  }

  const matchedCatalog = category.catalogs.find(
    (catalog) => depth >= catalog.minD && depth <= catalog.maxD,
  );
  if (matchedCatalog) return matchedCatalog;

  return (
    category.catalogs.find((catalog) => depth <= catalog.maxD) ??
    category.catalogs[category.catalogs.length - 1]!
  );
}
```

### `refreshTowerCatalog`
**Location:** `src/features/closet/domain/closetCatalogs.ts`

```ts
export function refreshTowerCatalog(tower: Tower): { switched: boolean; catalog: ClosetCatalogEntry } | null {
  if (!tower.doorMode || !tower.categoryCode) return null;
  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
  );
  const switched = tower.catalogId !== catalog.catalogId;
  tower.catalogId = catalog.catalogId;
  tower.catalogCode = catalog.code;
  return { switched, catalog };
}
```

### `refreshTowerCabinet`
**Location:** `src/features/closet/domain/closetCatalogs.ts`

```ts
export function refreshTowerCabinet(
  tower: Tower,
  options?: { catalogSwitched?: boolean },
): void {
  if (!tower.doorMode || !tower.categoryCode) return;

  // Auto-force 2-box if 1-box is no longer available at current dimensions
  if (
    tower.boxCount === 1 &&
    !isOneBoxAvailable(tower.doorMode, tower.categoryCode, tower.width, tower.depth)
  ) {
    tower.boxCount = 2;
  }

  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
  );

  // If depth change caused a catalog switch, select 1st cabinet in catalog
  if (options?.catalogSwitched && catalog.cabinets && catalog.cabinets.length > 0) {
    const firstCabinet = catalog.cabinets[0]!;
    tower.cabinetId = Number(firstCabinet.id ?? (firstCabinet as any).cabinet_id ?? 0);
    tower.cabinetCode = String(firstCabinet.code ?? (firstCabinet as any).cabinet_code ?? '');
    return;
  }

  // Otherwise, match best cabinet by width and height range
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

---

## Store Integration (`useClosetStore.ts`)

```ts
setTowerDepth(towerId: string, depth: number) {
  const tower = this.towers.find((t) => t.id === towerId)
  if (!tower) return
  tower.depth = snapTo16th(clampTowerDepth(tower, snapTo16th(depth)))
  const res = refreshTowerCatalog(tower)
  refreshTowerCabinet(tower, { catalogSwitched: res?.switched ?? false })

  // Sync attached parts (panels/fillers)
  this.towers
    .filter((t) => t.attachedToTowerId === towerId)
    .forEach((part) => {
      if (part.partType === 'panel') {
        part.depth = tower.depth
      } else if (part.partType === 'filler') {
        part.outset = snapTo16th((tower.outset ?? 0) + tower.depth)
      }
    })
}
```

---

## Related Files & Documentation

| File | Purpose |
| --- | --- |
| `src/features/closet/domain/closetCatalogs.ts` | Implementation of `resolveCatalogForTower`, `refreshTowerCatalog`, `refreshTowerCabinet`, `selectCabinet` |
| `src/stores/useClosetStore.ts` | Store depth action `setTowerDepth` |
| `doc/closet_plan/cabinet_selection.md` | Cabinet width/height selection rules & specs |
| `doc/closet_plan/catalog_selection_exm.md` | Concrete data model tables and step-by-step example scenarios |
| `tests/closetCatalogs.test.ts` | Vitest suite validating catalog resolution and first cabinet selection |
