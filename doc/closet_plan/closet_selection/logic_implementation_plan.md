# Closet Cabinet Selection & Box Configuration

## Background

The Build Closet UI currently lets customers choose a door mode (Without Doors / With Doors) and add towers by category. The API already returns **cabinets** nested inside each catalog, but the frontend ignores them. We need to:

1. **Use cabinets from the API** to resolve the correct cabinet record (for pricing) based on the customer's chosen W × H × D dimensions.
2. **Implement 1-box / 2-box toggle** for "Without Doors" categories, since cabinets come in two `options` variants: `"2 Boxes (Standard), Single Box"` and `"2 Boxes (Standard)"`.
3. **Depth-driven catalog switching** is already implemented via `resolveCatalogForTower()` and `refreshTowerCatalog()` — we will layer **cabinet resolution** on top of this.

---

## User Review Required

> [!IMPORTANT]
> **Cabinet resolution approach**: The plan proposes resolving the active cabinet ID automatically every time width, height, or depth changes — matching the closest cabinet record from the resolved catalog. This keeps the experience seamless (no extra user input) while silently tracking the right pricing unit.

> [!IMPORTANT]
> **1-Box / 2-Box behavior**: The `options` column in the `cabinets` DB table contains strings like `"2 Boxes (Standard), Single Box"` or just `"2 Boxes (Standard)"`. The plan assumes:
> - If a cabinet record has `"Single Box"` in its options string → it's available for 1-box mode.
> - If it only has `"2 Boxes (Standard)"` → it's only available for 2-box mode.
> - The API will include a parsed `boxOptions` field (`[1, 2]` or `[2]`) to make this easier on the frontend.

> [!WARNING]
> **1-Box width limits**: After the following widths, 1-box becomes unavailable:
> - 15D and 18D closets → max 40" W for 1-box
> - 21D closets → max 37" W for 1-box
>
> This rule is depth-dependent. The plan implements it as a computed property that auto-disables the 1-box toggle and forces 2-box when the width exceeds the threshold.

---

## Open Questions

1. **Cabinet matching strategy**: When the customer sets W=25, H=84, D=15 — should we find the single closest cabinet by exact (W, H, D) match, or find the cabinet where the dimensions fall within its `[width, width+difference_w]` × `[height, height+difference_h]` range? From the API data, each cabinet has `width`, `height`, `depth`, `difference_w`, `difference_h` — it looks like the cabinet defines a base dimension and the `difference_*` fields define the adjustment range. **I'll use the approach: find the cabinet whose base dimensions are ≤ the chosen dimensions and where chosen ≤ base + difference.**

2. **Are there separate cabinet records for 1-box vs 2-box at the same dimensions?** From the screenshot, I see two cabinet records for the same catalog (`CAS128415`): ID 4889 with `options: "2 Boxes (Standard), Single Box"` (W=12, H=84, D=15) and ID 4899 with `options: "2 Boxes (Standard), Single Box"` (W=15, H=84, D=15). This suggests cabinet records differ by W/H, not by box count. **If 1-box and 2-box share the same cabinet record (just flagged differently), we only need to track box preference on the tower and report it in the export.** If they are separate records, we filter by box option before matching.

3. **Height-driven configuration change**: The requirement says "Height (H) is the driving factor that changes the configuration within a closet" for Without Doors. Does this mean:
   - At certain heights, the internal layout (number of shelves, rod positions) changes? → This would need a configuration lookup table from cabinets.
   - Or simply that cabinet record selection changes with height? → Already covered by the matching logic.
   
   **For now, I'll implement cabinet record resolution that accounts for H, and surface the cabinet's `number_of_shelves`, `num_of_drawers` etc. so the 3D view can use them later.**

---

## Proposed Changes

### Component 1 — Backend: Parse box options & expose clean cabinet data

#### [MODIFY] [ClosetCatalogController.php](file:///h:/laragon/www/Dia-Backend/app/Http/Controllers/Product/ClosetCatalogController.php)

- In the `catalogCategories` method, for each cabinet record, parse the `options` string to extract box availability:
  - `"2 Boxes (Standard), Single Box"` → `boxOptions: [1, 2]`
  - `"2 Boxes (Standard)"` → `boxOptions: [2]`
- Add `min_w` and `max_w` columns to the cabinets table (or compute them from `width` and `difference_w`/`max_w` already present) so the frontend can filter.
- The cabinet data shape per catalog in the response becomes:
  ```json
  {
    "catalogId": 205,
    "code": "CAS128415-459615",
    "minW": 12, "maxW": 45, "minD": 15, "maxD": 16, "minH": 84, "maxH": 96,
    "cabinets": [
      {
        "id": 4889,
        "code": "CAS128415",
        "width": 12, "height": 84, "depth": 15,
        "options": "2 Boxes (Standard), Single Box",
        "boxOptions": [1, 2],
        "number_of_shelves": 7,
        "num_of_drawers": 0,
        "base_price": "329.00",
        ...
      }
    ]
  }
  ```

---

### Component 2 — Frontend Domain: Cabinet types & resolution logic

#### [MODIFY] [closetCatalogs.ts](file:///h:/Vue/Closet/src/features/closet/domain/closetCatalogs.ts)

- Add `ClosetCabinetEntry` type:
  ```ts
  export type ClosetCabinetEntry = {
    id: number
    code: string
    width: number
    height: number
    depth: number
    boxOptions: number[]  // [1, 2] or [2]
    numberOfShelves: number
    numOfDrawers: number
    numOfRollouts: number
    basePrice: string
  }
  ```

- Add `cabinets` array to `ClosetCatalogEntry`:
  ```ts
  export type ClosetCatalogEntry = {
    // ... existing fields
    cabinets: ClosetCabinetEntry[]
  }
  ```

- Add **`resolveCabinetForTower()`** function:
  ```ts
  export function resolveCabinetForTower(
    doorMode: ClosetDoorMode,
    categoryCode: ClosetCatalogCategoryCode,
    width: number,
    height: number,
    depth: number,
    boxCount: 1 | 2,
  ): ClosetCabinetEntry | null
  ```
  - First resolves the catalog via existing `resolveCatalogForTower()`.
  - Then finds the matching cabinet within that catalog based on dimensions.
  - Filters by `boxOptions` containing the requested `boxCount`.
  - Returns `null` if no match (edge case — should not happen with valid data).

- Add **`isOneBoxAvailable()`** function:
  ```ts
  export function isOneBoxAvailable(
    doorMode: ClosetDoorMode,
    categoryCode: ClosetCatalogCategoryCode,
    width: number,
    depth: number,
  ): boolean
  ```
  - For `with_doors` → always `false` (only without_doors has the box concept).
  - For `without_doors`: check the depth-dependent width thresholds:
    - Depth ≤ 20" → 1-box available if width ≤ 40"
    - Depth ≥ 21" → 1-box available if width ≤ 37"

- Add **`refreshTowerCabinet()`** function that updates `tower.cabinetId` after any dimension or box-count change.

#### [MODIFY] [tower.ts](file:///h:/Vue/Closet/src/features/closet/domain/types/tower.ts)

- Add to `Tower` type:
  ```ts
  /** 1-box or 2-box configuration (Without Doors only). Defaults to 2. */
  boxCount?: 1 | 2
  /** Active cabinet ID resolved for this tower's exact dimensions. */
  cabinetId?: number
  /** Active cabinet code for debugging/tracing. */
  cabinetCode?: string
  ```

---

### Component 3 — Closet Store: Box count actions & cabinet refresh

#### [MODIFY] [useClosetStore.ts](file:///h:/Vue/Closet/src/stores/useClosetStore.ts)

- Add `setTowerBoxCount(towerId: string, boxCount: 1 | 2)` action:
  - Validates that 1-box is available for the current W/D.
  - Falls back to 2-box if not.
  - Calls `refreshTowerCabinet()`.

- Modify `setTowerWidth`, `setTowerDepth`, `setTowerHeight` to call `refreshTowerCabinet()` after clamping (alongside the existing `refreshTowerCatalog`).

- Auto-force `boxCount = 2` in `setTowerWidth` when the new width exceeds the 1-box threshold.

- Ensure `createTowerFromCategory()` initializes `boxCount: 2` (default) and resolves initial cabinet.

---

### Component 4 — Schema Export

#### [MODIFY] [schema.ts](file:///h:/Vue/Closet/src/features/closet/domain/schema.ts)

- Include `boxCount`, `cabinetId`, and `cabinetCode` in the `exportForBackend` tower payload so the backend can identify the exact cabinet for pricing.

---

### Component 5 — Build Closet UI

#### [MODIFY] [BuildCloset.vue](file:///h:/Vue/Closet/src/features/closet/views/BuildCloset.vue)

- **Right panel (Selected Tower)**: Add a 1-Box / 2-Box toggle button row below the dimension inputs, visible only when:
  - The tower's `doorMode === 'without_doors'`
  - The tower has a `categoryCode` (is a catalog tower, not a custom part)
  
- The toggle shows:
  - **"2 Boxes"** button (always enabled — default)
  - **"1 Box"** button (disabled + tooltip when width exceeds threshold)

- When the user changes width and it exceeds the 1-box threshold, auto-switch to 2-box and show a brief notification or visual indicator.

- Display the active **cabinet ID** in a subtle debug/info line (e.g., `"Cabinet: CAS128415 #4889"`) for tracing purposes.

---

### Component 6 — API Data Mapping

#### [MODIFY] [closetApi.ts](file:///h:/Vue/Closet/src/features/closet/api/closetApi.ts)

- Map the `cabinets` array from the API response into the `ClosetCatalogEntry.cabinets` field.
- Parse `boxOptions` from the cabinet's `options` string if the backend doesn't provide it pre-parsed.
- Normalize field names (snake_case from API → camelCase in frontend types).

---

### Component 7 — Tests

#### [MODIFY] [closetCatalogs.test.ts](file:///h:/Vue/Closet/tests/closetCatalogs.test.ts)

Add test cases:
- `resolveCabinetForTower` returns correct cabinet for given W×H×D and boxCount
- `isOneBoxAvailable` returns false when width exceeds threshold for given depth
- Box count auto-forces to 2 when width is increased past threshold
- Cabinet ID is included in `exportForBackend` payload
- Catalog switching (depth) + cabinet re-resolution works in sequence

---

## Verification Plan

### Automated Tests
```bash
cd h:\Vue\Closet
npm test
```

### Build Verification
```bash
cd h:\Vue\Closet
npm run build
```

### Manual Verification
1. Open the app at `/closet/build`
2. Select "Without Doors" → add a Shelves (CAS) tower
3. Verify it starts at minimum dimensions (12"W, 84"H, 15"D) with 2-box default
4. Toggle to 1-box → verify it switches
5. Increase width past 40" → verify 1-box becomes disabled and auto-switches to 2-box
6. Increase depth past 16" → verify catalog switches from CAS128415 to CAS128418
7. Select "With Doors" → verify no box toggle appears
8. Check the review export JSON includes `cabinetId`, `cabinetCode`, and `boxCount`
