# Closet Catalog Implementation Plan

This plan describes how to implement catalog-driven closet towers in the current
Vue Closets app.

Related database/table notes are in:

- `doc/closet_plan/table.md`

## Goal

Closet towers should be selected by customer-facing category, while the app keeps
the active catalog ID in the background for pricing/export.

The customer flow is:

1. Choose door mode:
   - Without Doors
   - With Doors
2. Choose a visible closet category for that mode.
3. The app creates a tower with the smallest valid dimensions for that category.
4. The customer edits width, depth, and height within category limits.
5. For doorless categories, depth changes can switch the active catalog ID.
6. Export/quote payload includes the active catalog ID for every tower.

## Current App Context

Relevant files:

- `src/features/closet/domain/types/tower.ts`
- `src/features/closet/domain/schema.ts`
- `src/stores/useClosetStore.ts`
- `src/features/closet/views/DesignCloset.vue`
- `src/features/closet/views/ReviewPage.vue`
- `src/features/closet/domain/validateCloset.ts`

Current tower state has dimensions and accessories, but does not yet track:

- door mode
- catalog category
- active catalog ID
- active catalog code
- corner cabinet state

## Data Model Changes

Add a catalog domain file:

```text
src/features/closet/domain/closetCatalogs.ts
```

Suggested types:

```ts
export type ClosetDoorMode = 'without_doors' | 'with_doors'

export type ClosetCatalogCategoryCode =
  | 'CAS'
  | 'CDH'
  | 'CLH'
  | 'CRD'
  | 'CSS'
  | 'CCS'
  | 'CCH'
  | 'CCL'

export type ClosetCatalogEntry = {
  catalogId: number
  code: string
  minW: number
  maxW: number
  minD: number
  maxD: number
  minH: number
  maxH: number
}

export type ClosetCatalogCategory = {
  doorMode: ClosetDoorMode
  categoryCode: ClosetCatalogCategoryCode
  categoryName: string
  catalogs: ClosetCatalogEntry[]
  cornerCatalogIds?: number[]
}
```

At first, this file can contain static catalog definitions from
`doc/closet_plan/table.md`. Later, the same shape can be populated from the
backend.

Extend `Tower` in `src/features/closet/domain/types/tower.ts`:

```ts
import type {
  ClosetDoorMode,
  ClosetCatalogCategoryCode,
} from '../closetCatalogs'

export type Tower = {
  id: string
  label: string
  width: number
  depth: number
  height: number
  doorMode?: ClosetDoorMode
  categoryCode?: ClosetCatalogCategoryCode
  categoryName?: string
  catalogId?: number
  catalogCode?: string
  isCorner?: boolean
  accessories: Accessory[]
}
```

Keep these fields optional during the first implementation so existing saved
designs and default towers remain compatible.

## Catalog Domain Helpers

Add helpers in `closetCatalogs.ts`.

Required helpers:

```ts
getCategoriesForDoorMode(doorMode)
getCategoryByCode(doorMode, categoryCode)
getCategoryLimits(doorMode, categoryCode)
resolveCatalogForTower(doorMode, categoryCode, depth)
createTowerFromCategory(doorMode, categoryCode, index)
```

Runtime rules:

- `with_doors` categories have one catalog, so catalog resolution always returns
  that catalog.
- `without_doors` categories can have 3 catalogs.
- For `without_doors`, only depth chooses the active catalog.
- Width and height are clamped to the category's absolute min/max range.
- Depth is clamped to the category's absolute min/max range.

Example resolver:

```ts
export function resolveCatalogForTower(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
  depth: number,
): ClosetCatalogEntry {
  const category = getCategoryByCode(doorMode, categoryCode)

  if (doorMode === 'with_doors') {
    return category.catalogs[0]!
  }

  return (
    category.catalogs.find(
      (catalog) => depth >= catalog.minD && depth <= catalog.maxD,
    ) ?? category.catalogs[category.catalogs.length - 1]!
  )
}
```

## Store Changes

Update `src/stores/useClosetStore.ts`.

Add an action to create a catalog-driven tower:

```ts
addTowerFromCatalog(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
) {
  const idx = this.towers.length + 1
  const tower = createTowerFromCategory(doorMode, categoryCode, idx)
  this.towers.push(tower)
}
```

Update dimension actions so they enforce catalog limits:

```ts
setTowerWidth(towerId: string, width: number) {
  const tower = this.towers.find((t) => t.id === towerId)
  if (!tower) return

  tower.width = clampTowerWidth(tower, width)
}

setTowerDepth(towerId: string, depth: number) {
  const tower = this.towers.find((t) => t.id === towerId)
  if (!tower) return

  tower.depth = clampTowerDepth(tower, depth)
  refreshTowerCatalog(tower)
}

setTowerHeight(towerId: string, height: number) {
  const tower = this.towers.find((t) => t.id === towerId)
  if (!tower) return

  tower.height = clampTowerHeight(tower, height)
}
```

`refreshTowerCatalog` should:

1. Check `tower.doorMode` and `tower.categoryCode`.
2. Resolve the active catalog from the current depth.
3. Update `tower.catalogId` and `tower.catalogCode`.

Do not mutate room, selection, quote, or history state from these helpers. Keep
catalog mutations inside `useClosetStore`.

## Design UI Changes

Update `src/features/closet/views/DesignCloset.vue`.

Replace or extend the generic Add Tower flow with:

1. Door mode segmented control:
   - Without Doors
   - With Doors
2. Category list based on selected door mode.
3. Add button per category.

Suggested local state:

```ts
const selectedDoorMode = ref<ClosetDoorMode>('without_doors')

const visibleCatalogCategories = computed(() =>
  getCategoriesForDoorMode(selectedDoorMode.value),
)
```

Category add behavior:

```ts
function addCatalogTower(categoryCode: ClosetCatalogCategoryCode) {
  closet.addTowerFromCatalog(selectedDoorMode.value, categoryCode)
}
```

Tower cards should show category and active catalog:

```text
Shelves (CAS)
Catalog 205
```

Selected tower controls should use category limits instead of hardcoded depth
and height arrays.

Current hardcoded controls to replace:

```ts
[35.5, 40.6, 50.8, 61]
[213.4, 243.8]
```

Use numeric inputs or range controls:

- Width: category minW to maxW
- Depth: category minD to maxD
- Height: category minH to maxH

Changing depth must call `closet.setTowerDepth`, which updates the active
catalog ID.

## Accessory Defaults By Category

`createTowerFromCategory` should initialize accessories based on category.

Suggested defaults:

| Category | Default accessories |
| --- | --- |
| CAS | shelf set |
| CDH | two rods |
| CLH | one high rod |
| CRD | drawers |
| CSS | shoe shelves |
| CCS | shelf set, corner enabled |
| CCH | two rods, corner enabled |
| CCL | one high rod, corner enabled |

Exact counts can be adjusted later, but the category should determine the first
visual/internal state.

## Export And Quote Payload

Update `src/features/closet/domain/schema.ts`.

In `exportForBackend`, include catalog metadata for each tower:

```ts
towers: state.towers.map((t) => ({
  id: t.id,
  label: t.label,
  doorMode: t.doorMode,
  categoryCode: t.categoryCode,
  categoryName: t.categoryName,
  catalogId: t.catalogId,
  catalogCode: t.catalogCode,
  isCorner: t.isCorner ?? false,
  width: clamp(Number(t.width) || 0, 20, 200),
  depth: clamp(Number(t.depth) || 0, 20, 100),
  height: clamp(Number(t.height) || 0, 50, 300),
  accessories: t.accessories,
}))
```

This is the pricing integration point. The quote pipeline should keep using
`closet.exportForBackend`; do not call quote APIs directly from components.

## Review Page Changes

Update `src/features/closet/views/ReviewPage.vue`.

Show each tower's catalog identity:

```text
Shelves (CAS)
Catalog 205
```

This gives a visible check that depth changes are switching the active catalog.

## Validation Changes

Update `src/features/closet/domain/validateCloset.ts`.

Add warnings/errors for catalog-driven towers:

- Error if a catalog-driven tower has no `catalogId`.
- Error if width/depth/height is outside the category absolute limits.
- Warning if a tower has legacy/no catalog metadata.

Keep existing generic tower validation for backward compatibility.

## Tests

Add catalog domain tests:

```text
tests/closetCatalogs.test.ts
```

Minimum cases:

- Doorless CAS at 15 D resolves to catalog 205.
- Doorless CAS at 17 D resolves to catalog 204.
- Doorless CAS at 21 D resolves to catalog 199.
- With-doors CAS always resolves to catalog 190.
- Width clamps to category min/max.
- Height clamps to category min/max.
- Depth clamps to category min/max.
- `createTowerFromCategory` assigns door mode, category code, and catalog ID.

Add store/export tests if the repo has a suitable store test pattern:

- `addTowerFromCatalog` creates a catalog-driven tower.
- `setTowerDepth` updates `catalogId`.
- `exportForBackend` includes `catalogId`.

Verification:

```bash
npm test
npm run build
```

## Backend/API Follow-Up

The first frontend implementation can use static catalog data in
`closetCatalogs.ts`.

The backend-ready version should expose one endpoint that returns the same
shape:

```text
GET /api/closet/catalog-categories?doorMode=without_doors
GET /api/closet/catalog-categories?doorMode=with_doors
```

Expected response shape:

```ts
ClosetCatalogCategory[]
```

The frontend should keep all catalog selection logic in the domain helper so the
UI does not care whether data came from static config or API.

## Rollout Order

1. Add static `closetCatalogs.ts` with types, catalog data, and resolver
   helpers.
2. Extend `Tower` with optional catalog fields.
3. Update `exportForBackend` to include catalog metadata.
4. Add `useClosetStore` actions for catalog-driven tower creation and catalog
   refresh on depth changes.
5. Update `DesignCloset.vue` to show door mode and category selection.
6. Replace hardcoded tower dimension controls with category min/max controls.
7. Update `ReviewPage.vue` to show category and catalog ID.
8. Add tests for resolver, store behavior, and export payload.
9. Run `npm test`.
10. Run `npm run build`.

## Risks And Guardrails

- Do not bypass `useClosetStore` for tower mutations.
- Do not call quote APIs directly from `DesignCloset.vue`; keep using the
  existing `exportForBackend` watcher.
- Keep new tower catalog fields optional to avoid breaking saved v2 payloads.
- Keep dimensions in centimeters internally.
- Convert inches only at input/output boundaries with existing unit helpers.
- Do not touch floor-plan pivot/rotation logic for this catalog change.
