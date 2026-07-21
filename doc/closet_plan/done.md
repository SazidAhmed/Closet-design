# Completed Requirements

## Cabinet Selection & Box Configuration

**Status:** Implemented

Customer will choose between 2 options:

- Without Doors
- With Doors

Once that selection is made, choices with available categories will appear.

For Without Doors, there will be 5 distinct Closet categories:

- Shelves (CAS)
- Double Hanging (CDH)
- Long Hanging (CLH)
- Drawers (CRD)
- Shoe Shelves (CSS)

Even though there are 3 catalogs within each category, the customer will see only 1 option for each category. The Min and Max dimensions for each distinct Closet category will be pulled from across 3 different catalogs.

For example:
Customer chooses Shelves (CAS). A tower with shelves appears on the wall where they chose to put the Closet. It appears by default as the smallest available option within that catalog, i.e. 12”W, 84”H, and 15”D (catalog CAS128415-459615 - ID205). They then can adjust the width, height, and depth. Those will be limited by the new columns with Min and Max dimensions that we will create for those catalogs. Once the Max is reached for 1 catalog (lets say for CAS128415-459615 - ID205 the max D is 16, but the customer chooses D to be 17, that means we are switching from CAS128415-459615 - ID205 catalog to CAS128418-459618 - ID204 catalog). Visually there is no difference, but in the background we need to keep track of which catalog is used so that later on we can identify the cabinet for pricing. Subsequently, if the customer chooses a bigger D, let’s say 21, it will switch to CAS128421-429621 - ID199 catalog for that Closet. Customer can keep increasing the desired dimension, in this case D, until they reach an absolute maximum and there is no further catalog to move to (in this case that would be 23D), that would be the absolute maximum dimension the customer can modify this Closet to.

Only D dimension will trigger a switch between catalogs, W and H remain consistent throughout the 3 catalogs in the same category.

For With Doors, there will be 8 distinct categories:

- Shelves (CAS)
- Double Hanging (CDH)
- Long Hanging (CLH)
- Rollouts (CRD)
- Shoe Shelves (CSS)
- Blind Corner Shelves (CCS)
- Blind Corner Double Hanging (CCH)
- Blind Corner Long Hanging (CCL)

For Closets With Doors, there is only 1 catalog per category.
Same logic will apply, when a category is chosen, the smallest available option from that catalog will appear and the customer can modify dimensions as per the new Min and Max column that we will create.

### Closet Properties (Box Configuration)

Without Doors:
Our closets without doors come in 2 configurations: 2 boxes (default) and 1 box (optional). By default each closet without doors will come as a 2 box option when placed on the wall. We will need to make a button which would switch the 2 box option to 1 box option. Each of these options are slightly different in terms of construction and dimensions and behave differently when changing the height of the cabinet. Height (H) is the driving factor that changes the configuration within a closet, width (W) and depth (D) have no effect on how the closet is set up inside.

One important thing to note, after a certain width (W) is reached, 1 box option becomes unavailable:

- For 15D and 18D closets - 40”W is the maximum width where 1 box option is available, anything after 40” is only available in 2 boxes (as default option).
- For 21D closets - 37”W is the maximum width where 1 box option is available, anything after 37” is only available in 2 boxes (as default option).


......... 



1. Categories & Catalogs (Without Doors vs With Doors)
   Requirement: Without Doors has 5 categories (Shelves, Double Hanging, Long Hanging, Drawers, Shoe Shelves) with 3 catalogs each. With Doors has 8 categories with 1 catalog each.
   Implementation: This is already structured in CLOSET_CATALOG_CATEGORIES inside closetCatalogs.ts.
   Requirement: Default to the smallest option (e.g. 12"W, 84"H, 15"D).
   Implementation: createTowerFromCategory pulls the absolute minimums (limits.minW, limits.minD, limits.minH) across the available catalogs to set the initial dimensions.
2. Depth-Driven Catalog Switching
   Requirement: Only the Depth (D) dimension triggers a catalog switch (e.g., reaching 17"D switches from the 15D catalog to the 18D catalog). W and H remain consistent.
   Implementation: The resolveCatalogForTower(doorMode, categoryCode, depth) function strictly looks at the depth to find the catalog where depth <= catalog.maxD. It ignores Width and Height for catalog switching, keeping them consistent exactly as requested.
3. Cabinet Resolution for Pricing (Background Tracking)
   Requirement: "Visually there is no difference, but in the background we need to keep track of which catalog is used so that later on we can identify the cabinet for pricing."
   Implementation: I added the resolveCabinetForTower function which silently runs in the background every time a dimension changes (refreshTowerCabinet). It finds the exact Cabinet ID (e.g., #4889) from the API data and attaches it to the tower state (cabinetId and cabinetCode). This is then passed to exportForBackend() so the pricing engine knows exactly what to quote.
4. 1-Box vs 2-Box Configuration
   Requirement: Without doors comes in 2 configurations: 2 boxes (default) and 1 box (optional).
   Implementation: Added a boxCount: 1 | 2 property to the Tower state, defaulting to 2. The UI now features a toggle button for this, visible only on Without Doors towers.
   Requirement: 15D and 18D closets -> 40"W maximum for 1-box.
   Requirement: 21D closets -> 37"W maximum for 1-box.
   Implementation: I built this exact logic into the isOneBoxAvailable() domain function:
