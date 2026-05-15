# Closet Catalog Implementation Todo

This document lists the next steps for the catalog-driven Closets app flow.

## Immediate Frontend Todo

### 1. Confirm Catalog Dimensions

- Replace the temporary static min/max dimension assumptions in
  `src/features/closet/domain/closetCatalogs.ts` with real values from the
  database.
- Confirm whether the app should use:
  - `catalogs.min_*` / `catalogs.max_*`
  - aggregated `cabinets` dimensions
  - a new `closet_catalog_groups` mapping table

Files likely affected:

- `src/features/closet/domain/closetCatalogs.ts`
- `doc/closet_plan/table.md`

### 2. Confirm Corner Catalog Mapping

- Clarify how catalogs `214` and `215` map to doorless corner behavior.
- Decide whether `214` and `215` are:
  - shared across CAS, CDH, and CLH
  - tied to specific categories
  - selected by depth/width/height
  - selected by left/right corner orientation

After confirmation, update:

- `closetCatalogs.ts`
- `BuildCloset.vue`
- related tests

### 3. Add Corner Toggle For Eligible Doorless Towers

- For doorless CAS, CDH, and CLH towers, add a UI control to convert the tower
  into a corner cabinet.
- The toggle should update:
  - `tower.isCorner`
  - `tower.catalogId`
  - `tower.catalogCode`
- Non-eligible categories should not show the corner option.

Files likely affected:

- `src/features/closet/views/BuildCloset.vue`
- `src/features/closet/domain/closetCatalogs.ts`
- `src/stores/useClosetStore.ts`
- `tests/closetCatalogs.test.ts`

### 4. Improve Builder Layout And Visual Preview

- Add a clearer visual representation of each tower type.
- At minimum, show a compact tower preview that reflects:
  - shelves
  - rods
  - drawers/rollouts
  - shoe shelves
  - blind corner categories
- Keep the builder focused and practical, not decorative.

Files likely affected:

- `src/features/closet/views/BuildCloset.vue`

### 5. Add Better Dimension Inputs

- Current builder uses raw cm values.
- Improve inputs so they work naturally with the app's unit settings.
- Use existing `useUnit` boundaries:
  - internal values remain centimeters
  - display/input can use cm or inches

Files likely affected:

- `src/features/closet/views/BuildCloset.vue`
- `src/composables/useUnit.ts` if helper additions are needed

### 6. Preserve Catalog Towers In History And Save Slots

- Verify that localStorage autosave, undo/redo, and named design slots preserve
  new tower fields:
  - `doorMode`
  - `categoryCode`
  - `categoryName`
  - `catalogId`
  - `catalogCode`
  - `isCorner`
- Add a regression test if the current history/save-slot test setup supports it.

Files likely affected:

- `src/stores/useHistoryStore.ts`
- `tests/*`

### 7. Review Integration With Existing Design Screen

- Decide whether `/closet/design` remains a separate 3D/materials stage or
  whether the new `/closet/build` screen replaces it.
- Current state:
  - `/closet/floorplan` has `Build Closet`.
  - Footer still has `Design Closet`.
  - `/closet/build` continues to review.
- Decide final route flow.

Possible route flow:

```text
/closet/type
/closet/floorplan
/closet/build
/closet/design
/closet/review
```

Or:

```text
/closet/type
/closet/floorplan
/closet/build
/closet/review
```

Files likely affected:

- `src/router/index.ts`
- `src/features/closet/views/FloorPlan.vue`
- `src/features/closet/views/BuildCloset.vue`
- `src/features/closet/views/DesignCloset.vue`
- `src/components/FooterBar.vue` if flow controls need changes

## Backend/API Todo

### 8. Add Backend Catalog Endpoint

Create an endpoint that returns customer-facing closet categories.

Suggested endpoints:

```text
GET /api/closet/catalog-categories?doorMode=without_doors
GET /api/closet/catalog-categories?doorMode=with_doors
```

Expected response shape should match:

```ts
ClosetCatalogCategory[]
```

The frontend should keep the same helper API and swap static data for backend
data later.

### 9. Add Database Mapping/Seeder

- Add the closet-specific catalog grouping data to the database.
- Prefer a mapping table over hardcoded app logic.
- Seed:
  - door mode
  - customer-facing category code/name
  - catalog ID
  - sort order
  - corner flags

Suggested table is documented in:

- `doc/closet_plan/table.md`

### 10. Populate Catalog Min/Max Columns

- Add catalog min/max columns:
  - `min_w`
  - `max_w`
  - `min_d`
  - `max_d`
  - `min_h`
  - `max_h`
- Populate them from the `cabinets` table or admin-managed values.
- Confirm whether the values are in inches or database-native units.

## Pricing/Quote Todo

### 11. Confirm Export Payload With Pricing Backend

Current frontend export includes:

```ts
doorMode
categoryCode
categoryName
catalogId
catalogCode
isCorner
width
depth
height
accessories
```

Confirm with pricing/backend which fields are required.

Questions:

- Is `catalogId` enough?
- Is `catalogCode` required?
- Should dimensions be sent in cm, inches, or both?
- Should corner catalog orientation be included?

### 12. Update Quote Logic If Needed

- The quote store already watches `closet.exportForBackend`.
- If backend needs a different payload shape, update only
  `exportForBackend`.
- Do not call quote endpoints directly from UI components.

Files likely affected:

- `src/features/closet/domain/schema.ts`
- `src/features/closet/stores/useQuoteStore.ts` only if API behavior changes

## Testing Todo

### 13. Add UI Tests For Build Closet

Add tests for:

- Door mode switching changes visible categories.
- Adding CAS without doors creates catalog `205`.
- Changing depth switches CAS to `204` and `199`.
- With-doors CAS stays on catalog `190`.
- Dimension controls clamp to category limits.
- Review page displays catalog identity.

Likely new test file:

```text
tests/buildCloset.integration.test.ts
```

### 14. Add Backend Contract Tests Later

When backend/API exists, add tests for:

- category endpoint response shape
- correct grouping by door mode
- correct min/max aggregation
- correct corner catalog metadata

## Verification Required After Next Code Changes

Run:

```bash
npm test
npm run build
```

For frontend UI changes, also verify in browser:

```text
http://localhost:5173/closet/floorplan
http://localhost:5173/closet/build
http://localhost:5173/closet/review
```

## Guardrails

- Keep internal dimensions in centimeters.
- Keep catalog mutations inside `useClosetStore`.
- Do not mutate quote, room, history, or selection state from catalog helpers.
- Do not touch floor-plan pivot/rotation logic for catalog work.
- Keep static catalog data isolated so it can be replaced by API data later.
- Preserve existing v2 saved designs by keeping new tower metadata optional.
