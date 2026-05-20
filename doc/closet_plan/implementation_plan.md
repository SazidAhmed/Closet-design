# Build Closet UI Implementation Plan

This plan outlines the steps to implement the "Build Closet" (Design Closet) UI features as analyzed from the reference video, following the technical mapping in `video_analysis.md`.

## User Review Required
> [!IMPORTANT]
> Please review this plan to ensure it aligns with your expectations before we proceed. The plan involves substantial updates to state management, the UI layout, and the introduction of new domain models.

## Proposed Changes

---

### Phase 1: Database, Schema, and Domain Types

We need to establish the foundational domain models for the catalog and placed cabinets to enforce validation constraints.

#### [NEW] `src/features/closet/domain/types/catalog.ts`
Define catalog schema types:
- `CabinetCategoryCode`, `BoxConfig`, `DoorOption`.
- `CatalogEntry` interface including base dimensions, constraints (min/max), and depth suffix for dynamic switching.
- `CabinetCategory` interface for aggregating options and variations.

#### [MODIFY] `src/features/closet/domain/types/tower.ts`
Extend the existing `Tower` interface to create `PlacedCabinet`:
- Add properties connecting the cabinet to a wall segment (`wallId`).
- Include sizing properties: `width`, `height`, `depth`, `elevation`, `outset`, `positionAlongWall`.
- Include active configuration properties: `activeCatalogId`, `activeCatalogCode`, `positionMode`, `finEnds`, `hingeDirection`.

---

### Phase 2: Pinia Store Upgrades

We will update the `useClosetStore` to manage the new placed cabinet state, applying catalog constraints and wall association.

#### [MODIFY] `src/stores/useClosetStore.ts`
- **State**: Add `placedCabinets` array and `catalogRegistry` array.
- **Actions**:
  - `addCabinet`
  - `updateCabinetDimensions` with dynamic catalog switching based on depth.
  - `removeCabinet`
  - `repositionCabinet`
  - `autofillWall`
  - `setFinEnds`, `reHinge`
- **Getters**:
  - `cabinetsByWallId`, `clearancesForCabinet`, `resolvedCatalogForCabinet`

---

### Phase 3: UI Layout & Double Viewport Integration

Update the existing `DesignCloset.vue` interface to support side-by-side or toggled views for floorplan and elevation.

#### [MODIFY] `src/features/closet/views/DesignCloset.vue`
- Enhance the `ViewModeToggle` component.
- Integrate the two new/updated 2D canvases: Overhead 2D Canvas and Elevation View Canvas.

#### [NEW] `src/components/floorplan/OverheadDesigner.vue`
- Render the 2D room layout.
- Render placed cabinets with sequential labels.
- Implement selection behavior with red borders and width/depth resizing handles.

#### [NEW] `src/components/floorplan/ElevationDesigner.vue`
- Render front-facing wall view.
- Render wall decorators (windows, doors).
- Render cabinets with height/width resizing handles and visual shelf representations.
- Show clearance dimensions.

---

### Phase 4: Left-Sidebar Catalog Component

Implement the product library for selecting and placing cabinets.

#### [NEW] `src/features/closet/components/CatalogSidebar.vue`
- Render a hierarchical catalog tree: "Without Doors" vs "With Doors", categorized by CAS, CDH, etc.
- Show product thumbnails on hover/selection.
- Implement "Click-to-Place" handlers (select wall -> click catalog item -> place cabinet).
- *Optional:* Drag & Drop placement handlers.

---

### Phase 5: Cabinet Internal SVG Templates

Create components to visually differentiate cabinet categories in Elevation View.

#### [NEW] `src/components/floorplan/svg/CabinetShelvesSvg.vue`
#### [NEW] `src/components/floorplan/svg/CabinetDoubleHangingSvg.vue`
#### [NEW] `src/components/floorplan/svg/CabinetLongHangingSvg.vue`
#### [NEW] `src/components/floorplan/svg/CabinetRodDrawersSvg.vue`
#### [NEW] `src/components/floorplan/svg/CabinetShoeShelvesSvg.vue`

---

### Phase 6 & 7: Properties Panels

#### [NEW] `src/features/closet/components/CabinetPropertiesPanel.vue`
- Display context-aware fields when a cabinet is selected.
- Inputs for Width, Height, Depth, Elevation, Outset.
- Display clearance values, wall association dropdown.
- Quick action buttons (Edit, Autofill, Ends, Re Hinge).

#### [NEW] `src/features/closet/components/WallPropertiesPanel.vue`
- Display when a wall without cabinets is selected.
- Inputs for Length, Height, End Caps, Rotation, Bulge.
- Action buttons to add walls, view faces, etc.

---

### Phase 8: Quote and Validation Integration

Update pricing calculations based on the placed cabinet configurations.

#### [MODIFY] `src/features/closet/stores/quoteStore.ts` (or `useQuoteStore.ts`)
- Trigger quote recalculation debounced after cabinet placements/edits.
- Include `activeCatalogId` in payloads.
- Implement constraint validation checks (e.g. overlap warnings, bounds warnings).

---

### Phase 9: Product Editor Dialog

#### [NEW] `src/features/closet/components/ProductEditorDialog.vue`
- Detailed modal triggered by double-clicking a cabinet.
- Shows granular constraint information (Min/Max values vs current values).
- Stretching capability checkboxes and various property tabs.

## Verification Plan

### Automated Tests
- Extend the unit test suite (`npm test`) specifically testing the Pinia store mutations.
  - Verify dimension updates correctly clamp to min/max constraints.
  - Verify `activeCatalogId` dynamically switches when depth thresholds are crossed.
  - Verify overlap detection logic.

### Manual Verification
- Launch the application (`npm run dev`).
- Navigate to the Design Closet step.
- Test the ViewMode Toggle.
- Verify placing cabinets onto specific walls.
- Verify handles allow resizing up to catalog constraints and switch correctly for depth.
- Ensure the Elevation View correctly visualizes cabinet contents.
