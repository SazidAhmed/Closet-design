# Closet Catalog Implementation Completed So Far

This document records the implementation work completed for the catalog-driven
Closets app flow.

## Implemented

### Floor Plan Entry Point

- Added a `Build Closet` button in the floor plan tools panel.
- The button links to the new route:

```text
/closet/build
```

Changed file:

- `src/features/closet/views/FloorPlan.vue`

### Build Closet Route

- Added a new route for the catalog-driven builder UI.

Changed file:

- `src/router/index.ts`

New route:

```ts
{
  path: '/closet/build',
  name: 'BuildCloset',
  component: () => import('../features/closet/views/BuildCloset.vue'),
}
```

### Build Closet UI

- Added a new `BuildCloset.vue` screen.
- The screen currently supports:
  - Door mode selection:
    - Without Doors
    - With Doors
  - Category list based on selected door mode.
  - Adding catalog-driven towers from category buttons.
  - Displaying active category and catalog ID per tower.
  - Selecting a tower.
  - Removing a tower.
  - Editing width, depth, and height with category min/max limits.
  - Updating the active catalog ID when depth changes.
  - Clearing default legacy towers on first entry so the builder starts with a
    catalog-driven workflow.

Changed file:

- `src/features/closet/views/BuildCloset.vue`

### Catalog Domain Layer

- Added a static catalog metadata layer for the first frontend implementation.
- Added types for:
  - `ClosetDoorMode`
  - `ClosetCatalogCategoryCode`
  - `ClosetCatalogEntry`
  - `ClosetCatalogCategory`
  - `ClosetCatalogLimits`
- Added catalog data for:
  - Without Doors categories:
    - CAS
    - CDH
    - CLH
    - CRD
    - CSS
  - With Doors categories:
    - CAS
    - CDH
    - CLH
    - CRD
    - CSS
    - CCS
    - CCH
    - CCL
- Added helper functions:
  - `getCategoriesForDoorMode`
  - `getCategoryByCode`
  - `getCategoryLimits`
  - `resolveCatalogForTower`
  - `clampTowerWidth`
  - `clampTowerDepth`
  - `clampTowerHeight`
  - `refreshTowerCatalog`
  - `createTowerFromCategory`

Depth-based catalog switching is implemented for doorless towers. For example:

- CAS depth around 15 in resolves to catalog `205`.
- CAS depth around 17 in resolves to catalog `204`.
- CAS depth around 21 in resolves to catalog `199`.

Changed file:

- `src/features/closet/domain/closetCatalogs.ts`

### Tower Model

- Extended `Tower` with optional catalog metadata:
  - `doorMode`
  - `categoryCode`
  - `categoryName`
  - `catalogId`
  - `catalogCode`
  - `isCorner`

These fields are optional so existing/default towers and saved v2 payloads remain
compatible.

Changed file:

- `src/features/closet/domain/types/tower.ts`

### Closet Store

- Added `addTowerFromCatalog`.
- Updated dimension actions:
  - `setTowerWidth`
  - `setTowerDepth`
  - `setTowerHeight`
- Catalog-driven towers now clamp dimensions against the selected category
  limits.
- Depth changes refresh the active catalog ID and catalog code.

Changed file:

- `src/stores/useClosetStore.ts`

### Export Payload

- Updated `exportForBackend` so each tower includes catalog metadata:
  - `doorMode`
  - `categoryCode`
  - `categoryName`
  - `catalogId`
  - `catalogCode`
  - `isCorner`

This is the current pricing/export integration point.

Changed file:

- `src/features/closet/domain/schema.ts`

### Validation

- Added validation for catalog-driven towers:
  - Error when a catalog-driven tower is missing `catalogId`.
  - Error when dimensions are outside selected category min/max limits.
  - Error when catalog category metadata is unknown.
  - Warning for legacy towers without catalog metadata.

Changed file:

- `src/features/closet/domain/validateCloset.ts`

### Review Page

- Review now displays catalog identity for catalog-driven towers.
- Example:

```text
Shelves (CAS) - Catalog 205
```

Changed file:

- `src/features/closet/views/ReviewPage.vue`

### Tests

- Added catalog tests covering:
  - Doorless CAS depth-based catalog switching.
  - With-doors CAS single-catalog behavior.
  - Catalog-driven tower creation.
  - Store depth edits refreshing active catalog ID.
  - Export payload including catalog ID.

Changed file:

- `tests/closetCatalogs.test.ts`

## Verification Completed

Commands run:

```bash
npm test
npm run build
```

Results:

- `npm test` passed.
- `npm run build` passed.

Browser checks completed:

- Verified `Build Closet` button appears on:

```text
http://localhost:5173/closet/floorplan
```

- Verified the builder UI renders at:

```text
http://localhost:5173/closet/build
```

- Verified adding Shelves creates a catalog-driven tower with catalog `205`.
- Verified increasing depth to about 21 inches switches the active catalog to
  `199`.

## Notes

- The catalog data is currently static in the frontend domain layer.
- The next backend-ready step is to replace static catalog metadata with an API
  response using the same shape.
- GitNexus checks were attempted with `npx gitnexus`, but the commands timed
  out in this environment, so no GitNexus impact/detect report was available.
