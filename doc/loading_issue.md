# Closet Builder "Loading..." Cabinet Issue — Post-Mortem & Fix

## 1. Problem Overview & Symptoms

When clicking on a category in the Closet Builder left sidebar (e.g. `Shelves (CAS)`):
- The newly added tower displayed:
  - **Label / Title:** `Loading... 1`
  - **Subtitle:** `Loading... (CAS) - NULL_CAB [W:12, D:12, CW:undefined, Cat:0, CabId:undefined, Dbg:None]`
- The left sidebar category cards all displayed dummy depth spans:
  - `12" - 30" depth` for every category regardless of actual dimensions.
- The browser console logged:
  ```text
  [BuildCloset] Visible Categories loaded for door mode "without_doors": (5) [{...}, ...]
  resolveCabinetForTower catalog found: LOADING cabinets count: 0 closetCatalogs.ts:397
  ```

---

## 2. What Was Causing the Issue

The issue was caused by a combination of **state desynchronization** between Pinia and the domain registry, an uninitialized module variable, and how authentication tokens were routed:

### A. State Desynchronization Between Pinia and Domain Registry
- In `closetCatalogs.ts`, catalog data was queried from an isolated module-scoped array:
  ```ts
  let activeCategories: ClosetCatalogCategory[] = [];
  ```
- When the application loaded or restored state via Pinia (`useClosetStore` and `useHistoryStore`), `closet.catalogCategories` was populated with the actual categories (5 categories).
- Because `closet.catalogCategories` was populated, `BuildCloset.vue` was able to render the 5 categories on the sidebar.
- However, `activeCategories` in `closetCatalogs.ts` remained `[]` (empty) because:
  1. `_applySnapshot()` in `useHistoryStore.ts` restored Pinia state from `localStorage` without calling `setActiveCategories(closet.catalogCategories)`.
  2. `loadCatalogs(true)` in `BuildCloset.vue` was running asynchronously with `forceRefresh = true`, which bypassed the synchronous cache check and left `activeCategories` empty until the API call completed.

### B. Fallback to Dummy "LOADING" Object
- When the user clicked on a category button, `addCategoryTower(category)` called:
  ```ts
  closet.addTowerFromCatalog(category.doorMode, category.categoryCode);
  ```
- This delegated to `createTowerFromCategory()`, which invoked:
  ```ts
  const category = getCategoryByCode(doorMode, categoryCode);
  ```
- Because `getCategoryByCode()` **only** searched `activeCategories` (which was empty), it returned the hardcoded fallback placeholder:
  ```ts
  {
    doorMode,
    categoryCode,
    categoryName: "Loading...",
    catalogs: [
      {
        catalogId: 0,
        code: "LOADING",
        minW: 12, maxW: 120,
        minD: 12, maxD: 30,
        minH: 84, maxH: 108,
        cabinets: [] // <-- 0 cabinets!
      }
    ]
  }
  ```
- Consequently:
  - The tower was created with `label: "Loading... 1"`, `categoryName: "Loading..."`, and `catalogCode: "LOADING"`.
  - `resolveCabinetForTower` received a catalog with 0 cabinets, logged `catalog found: LOADING cabinets count: 0`, and returned `null`.
  - The UI rendered `NULL_CAB`.

### C. Missing Auth Token in Pinia Store
- The token sent from `Dia-Website` via URL query parameter (`?token=...`) was only persisted to `localStorage.access_token`.
- `http-common.ts` and `closetApi.ts` were looking strictly in `localStorage`. If the user saved or expected the token in Pinia, there was no reactive store state holding the token or providing a setter.

---

## 3. What Has Been Fixed

### 1. Multi-Tier Resolution in `getCategoryByCode` (`closetCatalogs.ts`)
Updated `getCategoryByCode()` with a 4-tier fallback lookup before ever returning the dummy placeholder:
1. **Tier 1:** Search `activeCategories`.
2. **Tier 2 (Pinia Store):** If not found or if the entry is the dummy `LOADING` object, inspect `getActivePinia()?.state?.value?.closet?.catalogCategories`. If found, call `setActiveCategories(storeCats)` immediately.
3. **Tier 3 (LocalStorage Cache):** Inspect `localStorage.getItem('closet-catalog-categories-cache-v6')` and sync `setActiveCategories(parsed)`.
4. **Tier 4 (Static Baseline):** Re-exported `CLOSET_CATALOG_CATEGORIES` with full baseline category/catalog metadata and fall back to it.

### 2. Immediate Domain Sync in Stores & Views
- **`useClosetStore.ts`**:
  - `catalogCategoriesForMode`: Automatically calls `setActiveCategories(state.catalogCategories)` whenever categories are queried.
  - `addTowerFromCatalog`: Ensures `setActiveCategories(this.catalogCategories)` is called before creating a new tower.
  - `loadCatalogs`: Syncs `setActiveCategories(this.catalogCategories)` upfront so in-flight API requests do not leave the domain registry empty.
- **`useHistoryStore.ts`**:
  - `_applySnapshot()`: Calls `setActiveCategories(closet.catalogCategories)` whenever rehydrating state from storage or across tabs.
- **`BuildCloset.vue`**:
  - `addCategoryTower()`: Syncs `setActiveCategories(visibleCategories.value)` prior to placing the tower.
  - `categoryDepthRange()`: Computes `minD` and `maxD` directly from `category.catalogs` when present.

### 3. Auto-Healing of Temporary "Loading..." Towers
- In `refreshTowerCatalog()` (`closetCatalogs.ts`), added automatic healing logic:
  - Once real categories are resolved, if a tower has `categoryName === "Loading..."` or `label.startsWith("Loading...")`, it updates them with the actual category name (e.g. `Shelves 1`).

### 4. Auth Token Stored and Retrieved from Pinia
- **`useAppStore.ts`**: Added `token` to state and added `setToken(token: string)` action (synced with `localStorage`).
- **`App.vue` & `router/index.ts`**: When an auth token is detected in the URL query (`?token=...`), it is now saved to both `localStorage` and `useAppStore().setToken(token)`.
- **`http-common.ts` & `closetApi.ts`**: Injected `Authorization: Bearer <token>` from `localStorage` with fallback to `getActivePinia()?.state?.value?.app?.token`.

### 5. Standard vs. Corner Catalog Filter
- In `resolveCatalogForTower` and `getCategoryLimits`, filtered out corner catalogs (`CRB`, `CLB`) when querying for standard cabinet categories to prevent corner catalogs from overriding standard catalogs or corrupting width/depth boundaries.

---

## 4. Verification

1. **Unit Tests**:
   - `npx vitest run tests/closetCatalogs.test.ts` passed 12/12 tests.
2. **Build Verification**:
   - `npx vite build` succeeded with no errors.
3. **API Integrity**:
   - Verified that `GET /api/closet/catalog-categories` with Bearer authentication returns all 5 categories with 36 cabinets per catalog.
