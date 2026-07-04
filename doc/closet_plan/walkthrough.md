# Walkthrough — Closet Catalog from Database

## What Was Built

A complete end-to-end pipeline that fetches **closet catalog categories from the backend database** and replaces the static hardcoded array in the frontend. The app **always works** — if the API is unavailable, it falls back to the static data automatically.

---

## Backend Changes (`h:\laragon\www\Dia-Backend`)

### New Files

| File | Purpose |
|------|---------|
| [2026_06_28_000001_add_closet_dimensions_to_catalogs_table.php](file:///h:/laragon/www/Dia-Backend/database/migrations/2026_06_28_000001_add_closet_dimensions_to_catalogs_table.php) | Adds `min_w`, `max_w`, `min_d`, `max_d`, `min_h`, `max_h` columns to `catalogs` table |
| [2026_06_28_000002_create_closet_catalog_groups_table.php](file:///h:/laragon/www/Dia-Backend/database/migrations/2026_06_28_000002_create_closet_catalog_groups_table.php) | Creates `closet_catalog_groups` mapping table |
| [ClosetCatalogGroupsSeeder.php](file:///h:/laragon/www/Dia-Backend/database/seeders/ClosetCatalogGroupsSeeder.php) | Seeds all 25 catalog group rows (15 without-doors + 8 with-doors + 2 corner) |
| [ClosetCatalogGroup.php](file:///h:/laragon/www/Dia-Backend/app/Models/ClosetCatalogGroup.php) | Eloquent model for the new mapping table |
| [ClosetCatalogController.php](file:///h:/laragon/www/Dia-Backend/app/Http/Controllers/Product/ClosetCatalogController.php) | Controller with `GET /api/closet/catalog-categories?doorMode=` endpoint |

### Modified Files

| File | Change |
|------|--------|
| [Catalog.php](file:///h:/laragon/www/Dia-Backend/app/Models/Catalog.php) | Added `min_w/max_w/min_d/max_d/min_h/max_h` to `$fillable` and `$casts` |
| [api.php](file:///h:/laragon/www/Dia-Backend/routes/api.php) | Registered `GET /closet/catalog-categories` route |

---

## Frontend Changes (`h:\Vue\Closet`)

### New Files

| File | Purpose |
|------|---------|
| [.env](file:///h:/Vue/Closet/.env) | `VITE_API_BASE_URL=http://localhost/api` |
| [closetApi.ts](file:///h:/Vue/Closet/src/features/closet/api/closetApi.ts) | Fetches catalog categories from backend using auth token from localStorage |

### Modified Files

| File | Change |
|------|--------|
| [closetCatalogs.ts](file:///h:/Vue/Closet/src/features/closet/domain/closetCatalogs.ts) | Added `loadCatalogCategories()` async function — API fetch with static fallback |
| [useClosetStore.ts](file:///h:/Vue/Closet/src/stores/useClosetStore.ts) | Added `catalogCategories` state, `catalogsLoading` state, `catalogCategoriesForMode` getter, `loadCatalogs()` action |
| [DesignCloset.vue](file:///h:/Vue/Closet/src/features/closet/views/DesignCloset.vue) | Full Towers tab redesign: door mode toggle, catalog category list with + buttons, tower cards with catalog badge, numeric inputs with catalog min/max constraints |

---

## API Endpoint

```
GET /api/closet/catalog-categories?doorMode=without_doors
GET /api/closet/catalog-categories?doorMode=with_doors
```

**Authentication**: Bearer token from `Authorization` header (same token stored in `localStorage.access_token`).

**Response shape** matches `ClosetCatalogCategory[]` from the frontend types.

---

## Manual Steps Required

> [!IMPORTANT]
> The terminal sandbox blocked all commands. You need to run these manually:

### Backend (run in `h:\laragon\www\Dia-Backend`)

```bash
php artisan migrate --force
php artisan db:seed --class=ClosetCatalogGroupsSeeder
```

### Frontend (run in `h:\Vue\Closet`)

```bash
npm run build
npm test
```

---

## How the API Dimension Data Gets Populated

The `closet_catalog_groups` table maps catalog IDs to door mode + category. The `catalogs` table now has `min_w/max_w/min_d/max_d/min_h/max_h` columns — **these need to be populated from cabinet data**.

After migrating, run this SQL to populate them from the `cabinets` table:

```sql
UPDATE catalogs
JOIN (
  SELECT
    catalog_id,
    MIN(width)  AS min_w,
    MAX(width)  AS max_w,
    MIN(depth)  AS min_d,
    MAX(depth)  AS max_d,
    MIN(height) AS min_h,
    MAX(height) AS max_h
  FROM cabinets
  GROUP BY catalog_id
) cabinet_dims ON cabinet_dims.catalog_id = catalogs.id
SET
  catalogs.min_w = cabinet_dims.min_w,
  catalogs.max_w = cabinet_dims.max_w,
  catalogs.min_d = cabinet_dims.min_d,
  catalogs.max_d = cabinet_dims.max_d,
  catalogs.min_h = cabinet_dims.min_h,
  catalogs.max_h = cabinet_dims.max_h
WHERE catalogs.id IN (
  190,191,192,193,194,195,196,197,
  199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215
);
```

> [!NOTE]
> If the `catalogs.min_*` / `max_*` columns are NULL (not yet populated from cabinets), the API will return `0` for dimensions and the frontend will fall back to static catalog data which has the correct values hardcoded.

---

## UI Changes (Towers Tab)

The Towers tab in the Design Closet view now shows:

1. **Door Mode toggle** — Without Doors / With Doors segmented control
2. **CATEGORIES section** — live list from the API (or static fallback), each with a **+** button to place a tower
3. **Closet Towers section** — placed towers with catalog badge (`Shelves (CAS) · Catalog 205`)
4. **Tower config inputs** — numeric width/depth/height inputs with min/max bounds from the category catalog limits (replacing the old hardcoded dropdown options)
