# Closet Configurator — Completed Features

> **Tech stack**: Vue 3 · Vite · Pinia · TresJS/Three.js · Tailwind v4
> **Reference**: 17Squares closet design tool

---

## Application Flow

All 4 steps of the workflow are implemented with working routing:

```
/ → /closet/type → /closet/floorplan → /closet/design → /closet/review
```

State persists across steps via Pinia stores. Users can navigate forward and back freely.

---

## Step 1 — Select Closet Type (`/closet/type`)

- [x] Card-based landing page with 3 closet type options
- [x] **Reach-In** — single wall, 6'×2'×8' default room
- [x] **Walk-In** — rectangular room, 8'×8'×8' with 4 towers
- [x] **Custom** — blank room, single tower, full control
- [x] Each type pre-populates room dimensions, cabinet, and towers in Pinia stores
- [x] Navigates to `/closet/floorplan` on selection
- [x] Responsive grid layout (3 columns → 1 on mobile)
- [x] Premium dark UI with gradient backgrounds, icon wrappers, and hover animations

---

## Step 2 — Floor Plan Editor (`/closet/floorplan`)

### 2D SVG Canvas (Center)

- [x] **Room shape rendering** — rectangular room drawn with walls in SVG
- [x] **Dynamic floor color** — SVG room rect reads `roomStore.colors.floorColor`
- [x] **Dynamic wall color** — wall strokes derived from `roomStore.colors.wallColor` (auto-darkened)
- [x] **Dimension labels** — width and depth shown in imperial format (e.g. `8' 0"`)
- [x] **Resize handles** — corner handles (yellow) and mid-wall handles (blue) rendered
- [x] **Arrow markers** — dimension lines with SVG arrow markers

### Left Sidebar: Add Architecture

- [x] **Change Room Height** button (UI present)
- [x] **Door catalog** — Wall Opening, Double Door, Single Door, Sliding Door, Bi-Fold Door
- [x] **Architecture catalog** — Rectangular Column, Round Column, Interior Wall
- [x] **Wall Decorator catalog** — Window, Vent, Outlet, Light Switch, Wall Photo, Floor Photo
- [x] Each item rendered as a card with emoji icon and label in a 3-column grid

### Right Sidebar: Room Options

- [x] **Floor Finish** — swatch grid from `FLOOR_MATERIALS` catalog (Hardwood, Tile, Carpet, Default)
- [x] **Wall Color** — swatch grid from `WALL_COLORS` catalog (8 options: Linen, Sand, Cream, Stone, White, Sage, Pearl, Dove Grey)
- [x] **Trim Color** — swatch grid from `TRIM_COLORS` catalog (5 options: White, Ivory, Sand, Taupe, Charcoal)
- [x] All swatches have active state ring and update `useRoomStore` on click
- [x] **Door Handle** — swatch grid from `HANDLE_STYLES` catalog (None, Polished Chrome, Brushed Chrome, Brass, Nickel, Bronze, Black Metal) → updates `closetStore.doorOptions.handleFinish`
- [x] **Door Finish** — swatch grid from `DOOR_MATERIALS` catalog (Bronze, Walnut, White) → updates `closetStore.doorOptions.doorFinishId`

### Footer Navigation

- [x] ← Back to Select Closet Type / Design Closet → buttons
- [x] View Mode Toggle (Overhead | Wall | 3D)

---

## Step 3 — Design Closet (`/closet/design`)

### 3D Viewport (Center)

- [x] **TresJS/Three.js canvas** with perspective camera and orbit controls
- [x] **Room3D component** — dynamic floor, back wall, left/right walls, trim strips using room store colors
- [x] **Cabinet3D component** — multi-tower 3D rendering with material-aware colors
  - [x] Carcass panels (left, right, top, bottom, back) + dividers
  - [x] Shelves + shoe shelves (angled)
  - [x] Hanging rods (cylinders)
  - [x] Drawer boxes
- [x] **Material-aware rendering** — parts resolve material colors/roughness/metalness from catalog
- [x] Ambient + directional lighting
- [x] Orbit controls (drag to rotate, scroll to zoom)
- [x] Camera position auto-scales based on cabinet dimensions

### Left Sidebar: 3 Tabs

#### Tab 1: Auto Create

- [x] 5 preset configurations:
  - Basic Shelves — shelving towers across full width
  - Hanging + Shelves — alternating rod and shelf towers
  - Double Hang — two rods stacked per tower
  - Drawers + Shelves — alternating drawer and shelf towers
  - Shoe Closet — shoe shelves with hanging rods above
- [x] Each preset generates towers dynamically based on cabinet inner width
- [x] **Clear Room** button — removes all towers

#### Tab 2: Towers

- [x] Tower list with selectable cards showing label and dimensions
- [x] Selected tower highlighted with yellow accent border
- [x] **Add Tower** button — adds tower using remaining cabinet width
- [x] **Remove Tower** button (trash icon per card)
- [x] **Tower Depth** dropdown (35.5, 40.6, 50.8, 61 cm)
- [x] **Tower Height** dropdown (213.4, 243.8 cm)

#### Tab 3: Edit Components

- [x] Per-tower accessory configuration when tower selected
- [x] **Rods** — displays current level (None / Medium / High)
- [x] **Shelves** — slider 0–8 with live count display
- [x] **Drawers** — slider 0–6 with live count display
- [x] **Shoe Shelves** — slider 0–6 with live count display
- [x] **Clear Components** button — removes all accessories from selected tower

### Right Sidebar: Options

#### Closet Options

- [x] **Finish** — swatch grid from `FINISH_MATERIALS` (10 options: Miami Linen, Classic White, Driftwood, Espresso, Walnut, Storm Grey, Midnight Blue, Chocolate, Ivory, Charcoal)
- [x] **Backing** — swatch grid from `BACKING_MATERIALS` (White, Match Finish, No Backing)
- [x] **Handle Style** — swatch grid from `HANDLE_STYLES` (None + 6 finishes)
- [x] All swatches have active selection state and update `useClosetStore`

#### Room Options

- [x] **Wall Color** — swatch grid from `WALL_COLORS` catalog → updates `roomStore`
- [x] **Floor Finish** — swatch grid from `FLOOR_MATERIALS` catalog → updates `roomStore`
- [x] **Trim Color** — swatch grid from `TRIM_COLORS` catalog → updates `roomStore`

#### Quote Panel

- [x] Debounced quote requests to `/api/quote` on state change
- [x] Displays: Loading / Error / Ready / Fix errors states
- [x] Total price with currency display

### Validation Panel

- [x] Real-time validation displayed in left sidebar
- [x] Error and warning badges with severity-colored styling
- [x] Blocks quote requests when errors are present

### Footer Navigation

- [x] ← Back to Floor Plan / Continue to Review → buttons
- [x] Estimated List Price display
- [x] Share Design button
- [x] View Mode Toggle

---

## Step 4 — Review & Share (`/closet/review`)

- [x] **Closet Overview** card — type, dimensions (W×H×D), finish, backing, handle style
- [x] **Tower Details** card — per-tower listing with dimensions and accessories
- [x] **Room** card — shape, walls count, ceiling height, placed items count
- [x] **Download Design (JSON)** — exports full closet state as `.closet.json` file
- [x] **Share Design** button (UI present)
- [x] **Submit for Quote** button (UI present)
- [x] ← Back to Design Closet / Start Over navigation

---

## Shared Components

### TopToolbar

- [x] Logo with home navigation
- [x] New / Open / Save / Undo / Redo / Share action buttons
- [x] Fullscreen / Settings / Help buttons
- [x] Sign In button with accent styling
- [x] Dynamic title slot per page

### FooterBar

- [x] Back / Forward navigation with route props
- [x] View Mode Toggle integration
- [x] Estimated List Price with USD formatting
- [x] Share Design button (conditional)

### ViewModeToggle

- [x] Overhead | Wall | 3D toggle buttons
- [x] Syncs with `useAppStore.viewMode`

### Room3D

- [x] Floor plane with dynamic `floorColor`
- [x] Back wall, left wall, right wall with dynamic `wallColor`
- [x] Trim strips along floor edges with dynamic `trimColor`
- [x] All colors reactive from `useRoomStore`

### Cabinet3D

- [x] Rendered from `buildParts()` — converts closet state into renderable 3D parts
- [x] Material resolution from catalog (color, roughness, metalness)
- [x] Fallback colors for materials not found in catalog

### UI Components

- [x] `Button` — reusable button component
- [x] `Slider` — range slider for accessory counts

---

## Domain Model (Schema V2)

### Types

- [x] `ClosetStateV2` — full state: units, closet type, room, cabinet, towers, materials, door options
- [x] `Room` — shape, walls, height, placed items, colors
- [x] `Wall` — id, length, position, angle, hasCloset flag
- [x] `PlacedItem` — id, type, category, wallId, position, width, height
- [x] `Tower` — id, label, width, depth, height, accessories
- [x] `Accessory` — rod (position + count), shelf_set, shoe_shelf, drawer (count + height), prop
- [x] `Material` — id, label, category, colorHex, textureUrl, roughness, metalness, pricePerSqFt
- [x] `HandleStyle` — id, label, colorHex, textureUrl, price
- [x] `ClosetMaterials` — finishId, backingId, handleStyleId
- [x] `ArchitecturalDoorOptions` — handleFinish, doorFinishId, doorColor, plainPanels
- [x] `RoomColors` — floorFinishId, floorColor, wallColor, trimColor

### Material Catalog

- [x] 10 finish materials (carcass/panel surfaces)
- [x] 3 backing materials
- [x] 4 floor materials
- [x] 3 door materials
- [x] 7 handle styles (including None)
- [x] 8 wall color swatches
- [x] 5 trim color swatches
- [x] `getMaterial()` and `getHandle()` lookup helpers

### Build System

- [x] `buildParts()` — converts v2 state into renderable `ClosetPart[]`
- [x] Generates: carcass panels, dividers, shelves, rods, drawers, shoe shelves
- [x] Per-tower accessory builders: `buildShelves`, `buildRods`, `buildDrawers`, `buildShoeShelves`
- [x] 3D coordinate system: X (left/right), Y (bottom/top), Z (back/front)

### Validation

- [x] Cabinet dimension range checks (width, height, depth, thickness)
- [x] Inner volume sanity warnings (non-positive interior)
- [x] Tower count limits (max per closet)
- [x] Tower width sum vs. inner cabinet width (overflow error + gap warning)
- [x] Per-tower width range check
- [x] Per-accessory count range checks (shelves, drawers, shoe shelves)

### Constraints

- [x] `CABINET_CONSTRAINTS` — min/max for width, height, depth, thickness
- [x] `TOWER_CONSTRAINTS` — maxPerCloset, width min/max
- [x] `ACCESSORY_CONSTRAINTS` — shelves, drawers, shoeShelf min/max

### Schema Migration

- [x] `migrateV1toV2()` — converts legacy single-shelf config to tower-based v2

---

## Pinia Stores

| Store               | Status | Responsibility                                             |
| ------------------- | ------ | ---------------------------------------------------------- |
| `useAppStore`       | ✅     | Current step, view mode, units toggle                      |
| `useRoomStore`      | ✅     | Room shape, walls, placed items, room colors               |
| `useClosetStore`    | ✅     | Cabinet dims, towers, accessories, materials, door options |
| `useQuoteStore`     | ✅     | Debounced pricing via `/api/quote`                         |
| `useSelectionStore` | ✅     | Currently selected tower ID / placed item ID               |

---

## API

- [x] `fetchQuote()` — POST to `/api/quote` with exported state
- [x] `QuoteResponse` type with currency, total, line items, warnings
- [x] `buildQuoteRequestFromState()` — convenience wrapper
- [x] `exportForBackend()` — JSON-safe clamped payload for backend

---

## Routing

- [x] 4 lazy-loaded routes with `createWebHistory`
- [x] Root `/` redirects to `/closet/type`

---

## What's NOT Yet Implemented

- [ ] Drag-to-resize walls in floor plan
- [ ] Drag-and-drop items from sidebar to floor plan
- [ ] Item placement, repositioning, and deletion on walls
- [ ] Change Room Height dialog functionality
- [ ] Wall / 3D / Overhead view mode rendering (toggle UI exists, views not yet differentiated)
- [ ] Camera presets with animated transitions
- [ ] Measurement overlays in 3D
- [ ] Tower drag-and-reorder
- [ ] Props (decorative items like clothes, shoes)
- [ ] PDF export
- [ ] Save/load to localStorage
- [ ] Undo/redo history
- [ ] Units toggle (cm ↔ inches) throughout UI
- [ ] Submit for Quote backend integration
- [ ] User authentication
