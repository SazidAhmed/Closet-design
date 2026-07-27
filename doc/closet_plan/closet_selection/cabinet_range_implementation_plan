# Range-Based Cabinet Selection

## Problem

Currently, `resolveCabinetForTower` picks a cabinet by comparing the cabinet's own `width`/`height`/`depth` against the tower's dimensions (finding the largest cabinet that fits **under** the tower). This is wrong — cabinets should be selected by checking whether the user-entered width/height falls **within that cabinet's `min_w`–`max_w` / `min_h`–`max_h` range**.

From the API, each cabinet object carries its own range fields:

```
"min_w": "6.0000",  "max_w": "13.0000",
"min_h": "80.0000", "max_h": "85.0000",
"min_d": "6.0000",  "max_d": "16.0000"
```

These fields are **not** currently stored in the `ClosetCabinetEntry` type.

## Proposed Changes

### 1. Domain Types

#### [MODIFY] [closetCatalogs.ts](file:///h:/Vue/Closet/src/features/closet/domain/closetCatalogs.ts)

**Step 1 — Extend `ClosetCabinetEntry` with range fields:**

Add `minW`, `maxW`, `minH`, `maxH`, `minD`, `maxD` to the type so the API values are preserved on each cabinet object.

```diff
 export type ClosetCabinetEntry = {
   id: number;
   code: string;
   width: number;
   height: number;
   depth: number;
+  minW: number;
+  maxW: number;
+  minH: number;
+  maxH: number;
+  minD: number;
+  maxD: number;
   boxOptions: number[];
   numberOfShelves: number;
   numOfDrawers: number;
   numOfRollouts: number;
   basePrice: string;
 };
```

The API already returns these fields on every cabinet — we just need to type them and make sure the mapping in `loadCatalogCategories` preserves them (it already does because `catalog.cabinets ?? []` passes them through unmodified).

**Step 2 — Create a new isolated `selectCabinet` function:**

This is the core of the change. A pure function with a clear, extensible signature:

```ts
/**
 * Select the best-matching cabinet from a catalog's cabinet array
 * based on the user-entered width and height (range matching).
 *
 * Selection logic:
 *  1. Filter cabinets by boxCount preference.
 *  2. Find cabinets whose min_w ≤ width ≤ max_w AND min_h ≤ height ≤ max_h.
 *  3. If multiple match, pick the one with the tightest range (smallest span).
 *  4. If none match, fall back to the cabinet whose range is closest.
 *
 * Kept isolated so more selection rules can be layered in later.
 */
export function selectCabinet(
  cabinets: ClosetCabinetEntry[],
  width: number,
  height: number,
  boxCount: 1 | 2 = 2,
): ClosetCabinetEntry | null
```

This function will:
- Take the flat array of cabinets from the resolved catalog
- Filter by `boxCount` first (fall back to all if no match)
- Find the cabinet whose `minW ≤ width ≤ maxW` **and** `minH ≤ height ≤ maxH`
- If multiple candidates match, prefer the one with the tightest width range
- If no exact range match, pick the nearest cabinet (closest range boundary)

**Step 3 — Replace usage in `resolveCabinetForTower`:**

Gut the old comparison logic and delegate to `selectCabinet`:

```ts
export function resolveCabinetForTower(...): ClosetCabinetEntry | null {
  const catalog = resolveCatalogForTower(doorMode, categoryCode, depth);
  if (!catalog.cabinets || catalog.cabinets.length === 0) return null;
  return selectCabinet(catalog.cabinets, width, height, boxCount);
}
```

**Step 4 — Keep `refreshTowerCabinet` snapping tower dims to cabinet dims:**

The existing logic from the previous change stays — once `selectCabinet` returns a cabinet, the tower's `width`/`height`/`depth` get set to the cabinet's actual dimensions. No changes needed here.

---

## Example Walkthrough

Given the API response with two cabinets in a catalog:

| Cabinet | width | height | depth | min_w | max_w | min_h | max_h |
|---------|-------|--------|-------|-------|-------|-------|-------|
| #4089   | 12    | 84     | 15    | 6     | 13    | 80    | 85    |
| #4090   | 16    | 84     | 15    | 13.8625 | 16  | 80    | 85    |

- User enters width **12**, height **84** → `6 ≤ 12 ≤ 13` → cabinet **#4089** selected, tower snaps to `{w:12, h:84, d:15}`
- User changes width to **13** → `6 ≤ 13 ≤ 13` → still cabinet **#4089**, tower stays `{w:12, h:84, d:15}`

> [!IMPORTANT]
> **Clarification needed:** When the user enters **13**, it still falls within #4089's range (max_w = 13). So the cabinet doesn't change and the tower snaps back to cabinet's `width: 12`. Is this the expected behavior? Or should the tower keep the user-entered value of 13 (since it's within range) and only snap to the cabinet's base dimensions for pricing/identification purposes?

- User changes width to **13.1** → `13.1 > 13` so #4089 doesn't match, `13.8625 ≤ 13.1`... actually 13.1 < 13.8625, so it's in a gap between cabinets → falls back to **nearest** → likely #4089 (closer boundary)

> [!IMPORTANT]
> **Gap handling:** There's a gap between cabinet #4089's max_w (13) and #4090's min_w (13.8625). What should happen when the user enters a value in this gap (e.g. 13.5)? Options:
> 1. Select the cabinet with the closest boundary (13.5 is closer to 13.8625, so pick #4090)
> 2. Select the lower cabinet (#4089, since we just exceeded its max)
> 3. Select the upper cabinet (#4090, since the user is trying to go wider)
>
> I'll default to option **3** (pick the next wider cabinet) unless you say otherwise — this feels most natural when a user is increasing width.

- User changes width to **17.5** → `13.8625 ≤ 17.5`... but 17.5 > 16 (max_w of #4090). If there's a third cabinet with range covering 17.5, select that. Otherwise falls back to the largest available cabinet.

## Open Questions

> [!IMPORTANT]
> 1. **Should the tower's width/height snap to the cabinet's base dimensions, or keep the user-entered value?** Currently we snap (from the previous change). If the user types 13, the cabinet is #4089 (width: 12), and the input would snap to 12. This might feel jarring. An alternative: keep the user value in the tower, only use the cabinet match for pricing/identification.
> 2. **Gap handling** (see above): Which cabinet wins when width falls between two ranges?

## Verification Plan

### Automated Tests
- `npm run build` — type-check passes with the new fields on `ClosetCabinetEntry`
- `npm test` — existing tests still pass (no floor-plan/rotation regressions)

### Manual Verification
- On the Build Closet page, select a tower, change width gradually from 12 → 13 → 14 → 16 → 17
- Confirm the "Cabinet: CASxxxxx #yyyy" label updates to the correct cabinet at each range boundary
- Confirm width/height/depth inputs reflect the resolved cabinet's dimensions
