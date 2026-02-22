# Closet Configurator — Full Implementation Plan

> **Reference**: 17Squares (17squares.com) closet design tool  
> **Tech stack**: Vue 3 · Vite · Pinia · TresJS/Three.js · Tailwind v4  
> **Goal**: Replicate the complete 17Squares workflow and feature set

---

## Application Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Select       │     │  2. Floor Plan   │     │  3. Design       │     │  4. Review       │
│  Closet Type     │ ──► │  (2D Room        │ ──► │  Closet          │ ──► │  & Share         │
│                  │     │   Editor)        │     │  (3D Config)     │     │                  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

Each step is a route. Users can navigate back and forth. State persists in Pinia stores.

---

## Step 1 — Select Closet Type (`/closet/type`)

### What the user sees

A landing page with closet type cards to choose from.

### Closet Types

- [ ] **Reach-In** — single wall, standard dimensions (e.g. 8' × 2' × 8')
- [ ] **Walk-In** — rectangular room, multiple walls for closet placement
- [ ] **Custom** — user defines an arbitrary room shape (polygon editor — stretch goal)

### Behavior

- Selecting a type pre-populates the room dimensions and wall layout in the floor plan store.
- "Walk-In" creates a full rectangular room (4 walls).
- "Reach-In" creates a single-wall room with reduced depth.
- Navigates to `/closet/floorplan`.

### Files

```
features/closet/views/SelectClosetType.vue     ← NEW
features/closet/domain/closetTypes.ts           ← NEW: type definitions + defaults
```

---

## Step 2 — Floor Plan Editor (`/closet/floorplan`)

### What the user sees (from screenshots)

```
┌──────────────────────────────────────────────────────┐
│  Top Toolbar: logo · new · open · save · undo/redo   │
│  · share · fullscreen · settings · help · sign in    │
├──────────┬──────────────────────────┬────────────────┤
│  Left    │                          │  Right         │
│  Sidebar │   2D Floor Plan Canvas   │  Sidebar       │
│          │   (top-down room view)   │  (Room Options)│
│          │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│  ← Back to Select Closet Type |Overhead|Wall|3D| Design Closet → │
│            Estimated List Price: $0.00               │
└──────────────────────────────────────────────────────┘
```

### 2.1 — 2D Canvas (Center)

The floor plan is rendered as a **2D SVG or Canvas** showing the room from overhead.

- [ ] **Room shape rendering** — rectangular room drawn with walls, dimensions shown on each side.
- [ ] **Resize handles** — drag handles on walls and corners to resize the room.
- [ ] **Dimension labels** — e.g. `8' 0"` displayed along each wall, auto-update on drag.
- [ ] **Snap-to-grid** — walls snap to 1-inch or 1-cm increments.
- [ ] **Placed items** — doors, windows, columns etc. are rendered as 2D symbols on the room walls.
- [ ] **Drag-and-drop** — items from left sidebar can be dropped onto walls.

### 2.2 — Left Sidebar: Add Architecture

#### Change Room Height

- [ ] **Change Room Height** button — opens a dialog/dropdown to set ceiling height.

#### Add Door (drag onto wall)

- [ ] Wall Opening
- [ ] Double Door
- [ ] Single Door
- [ ] Sliding Door
- [ ] Bi-Fold Door

#### Add Architecture (drag onto floor plan)

- [ ] Rectangular Column
- [ ] Round Column
- [ ] Interior Wall

#### Add Wall Decorator (drag onto wall)

- [ ] Window
- [ ] Vent
- [ ] Outlet
- [ ] Light Switch
- [ ] Wall Photo (image placeholder)
- [ ] Floor Photo (image placeholder)

Each item:

- Renders as a 2D icon in the sidebar.
- Can be dragged onto a wall (doors, decorators) or onto the floor (columns).
- Once placed, can be repositioned by dragging along the wall.
- Can be deleted with right-click or a delete button.

### 2.3 — Right Sidebar: Room Options

- [ ] **Pick a Color** — opens color picker for the selected item.
- [ ] **Floor Finish** — swatch grid (e.g. hardwood, tile, carpet textures).
- [ ] **Floor Color** — color swatch selector.
- [ ] **Wall Color** — color swatch selector.
- [ ] **Trim Color** — color swatch selector.
- [ ] **Architectural Door Options**:
  - Door Handle style: Polished Chrome, Brushed Chrome, Brass, Nickel, Bronze, Black Metal
  - Door Finish: swatch (e.g. Bronze, Walnut)
  - Door Color: swatch
  - Plain Panels option

### 2.4 — View Modes (Bottom Bar)

- [ ] **Overhead** — 2D top-down (default for floor plan page).
- [ ] **Wall** — 2D front/wall elevation view.
- [ ] **3D** — perspective 3D room view (empty room, no closet yet).

### 2.5 — Footer Navigation

- [ ] **← Back to Select Closet Type** — navigates back.
- [ ] **Design Closet →** — navigates to step 3.
- [ ] **Estimated List Price: $0.00** — running total.

### Files

```
features/closet/views/FloorPlan.vue             ← NEW: layout shell
features/closet/components/FloorPlanCanvas.vue   ← NEW: 2D SVG/Canvas renderer
features/closet/components/RoomItem2D.vue        ← NEW: placed door/window/column
features/closet/components/DimensionLabel.vue    ← NEW: measurement labels
features/closet/components/ArchitectureSidebar.vue ← NEW: left panel
features/closet/components/RoomOptionsSidebar.vue  ← NEW: right panel
features/closet/domain/room.ts                   ← NEW: room shape, walls, placed items
features/closet/domain/architectureItems.ts      ← NEW: door/window/column definitions
stores/useRoomStore.ts                           ← NEW: room state (walls, items, colors)
```

---

## Step 3 — Design Closet (`/closet/design`)

### What the user sees (from first screenshot)

```
┌──────────────────────────────────────────────────────┐
│  Top Toolbar: logo · new · open · save · undo/redo   │
│  · share · fullscreen · settings · help · sign in    │
├──────────┬──────────────────────────┬────────────────┤
│  Left    │                          │  Right         │
│  Sidebar │   3D Closet Viewport     │  Sidebar       │
│ (config) │                          │  (Options)     │
│          │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│ ← Back to Floor Plan |Overhead|Wall|3D| Continue to Review → │
│            Estimated List Price: $0.00  [Share Design]│
└──────────────────────────────────────────────────────┘
```

### 3.1 — Left Sidebar: 3 Tabs

#### Tab 1: Auto Create

- [ ] Preset quick-start configurations:
  - "Standard Reach-In" — 2 towers, rods + shelves
  - "Walk-In Basic" — 4 towers on 2 walls
  - "Full Custom" — start empty
- [ ] **Recreate Closet** button — re-applies the selected preset (resets customizations).

#### Tab 2: Towers

- [ ] **Tower list** — each tower shown as a card with width label.
- [ ] **Add Tower** / **Remove Tower** buttons.
- [ ] **Tower Width** — slider or input per tower.
- [ ] **Tower Depth** dropdown (e.g. 14", 16", 20", 24").
- [ ] **Tower Height** dropdown (e.g. 84", 96").
- [ ] Drag-and-reorder towers.
- [ ] Visual highlight on 3D model when tower is selected.

#### Tab 3: Edit Components (per-tower accessories)

When a tower is selected:

- [ ] **Rods** — slider: None / Low / Medium / High (maps to rod count + position).
- [ ] **Shoe Shelves** — slider: None / Low / Medium / High.
- [ ] **Drawers** — slider: None / Low / Medium / High.
- [ ] **Props** — slider: None (decorative items like clothes, shoes — cosmetic).
- [ ] **Add Props** button — add decorative items.
- [ ] **Remove All Props** button.
- [ ] **Clear Room** button.

### 3.2 — Right Sidebar: Options

#### Closet Options

- [ ] **Finish** — swatch grid for carcass material (Miami Linen, White, Driftwood, Espresso, Walnut, etc.).
- [ ] **Backing** — swatch for back panel finish.
- [ ] **Handle Style** — choosing from None or handle types.

#### Room Options (cosmetic — same as floor plan)

- [ ] **Floor Finish** + **Floor Color**
- [ ] **Wall Color** + **Trim Color**

#### Architectural Door Options

- [ ] **Door Handle** (Polished Chrome, Brushed Chrome, etc.)
- [ ] **Door Finish** + **Door Color**
- [ ] **Plain Panels**

### 3.3 — 3D Viewport (Center)

- [ ] **Render closet** — towers with dividers, shelves, rods, drawers, shoe shelves.
- [ ] **Render room** — walls, floor, ceiling with selected colors/finishes.
- [ ] **Render doors** — architectural doors placed in floor plan step.
- [ ] **Render props** — decorative items (clothes on rods, shoes on shelves).
- [ ] **Measurement overlays** — dimension lines on closet (width, height, depth, tower widths).
- [ ] **Camera presets** (Overhead / Wall / 3D) with animated transitions.
- [ ] **Orbit controls** — drag to rotate, scroll to zoom (in 3D mode).
- [ ] **Reset Camera** button (gizmo cube in corner).

### 3.4 — Footer

- [ ] **← Back to Floor Plan**
- [ ] **Overhead | Wall | 3D** view toggle
- [ ] **Estimated List Price: $X,XXX.XX**
- [ ] **Share Design** button
- [ ] **Continue to Review →**

### Files

```
features/closet/views/DesignCloset.vue           ← REFACTOR from Configurator.vue
features/closet/components/AutoCreateTab.vue      ← NEW
features/closet/components/TowersTab.vue          ← NEW
features/closet/components/EditComponentsTab.vue  ← NEW
features/closet/components/ClosetOptionsSidebar.vue ← NEW
features/closet/components/TowerCard.vue          ← NEW
components/Cabinet3D.vue                          ← EXPAND: towers, accessories, props
components/Room3D.vue                             ← NEW: room context
components/MeasurementOverlay.vue                 ← NEW
components/CameraControls.vue                     ← NEW: preset switching
```

---

## Step 4 — Review & Share (`/closet/review`)

### What the user sees

A summary page showing the complete closet design with multiple views and options to share/print/order.

### Features

- [ ] **Design summary** — all towers listed with their accessories.
- [ ] **Multiple rendered views** — overhead, wall, and 3D screenshots/captures.
- [ ] **Room dimensions** — from floor plan.
- [ ] **Wall dimensions** — per-wall breakdown.
- [ ] **Material & finish selections** — summary table.
- [ ] **Estimated List Price** — total with line-item breakdown.
- [ ] **PDF Export** — generate a printable PDF with all views + specs.
- [ ] **Share Design** — generate a shareable link or download.
- [ ] **Submit for Quote** — send to a closet professional (POST to backend).
- [ ] **← Back to Design Closet** navigation.

### Files

```
features/closet/views/ReviewPage.vue             ← NEW
features/closet/components/DesignSummary.vue      ← NEW
features/closet/components/PriceBreakdown.vue     ← NEW
```

---

## Shared Components & Infrastructure

### Top Toolbar (shared across all steps)

```
┌─────────────────────────────────────────────────────┐
│ [logo] │ New │ Open │ Save │ Undo │ Redo │ Share │  │
│        │     │      │      │      │      │       │  │
│        │  fullscreen  │  settings  │  help  │ Sign In │
└─────────────────────────────────────────────────────┘
```

- [ ] **New** — reset everything, go to step 1.
- [ ] **Open** — load a saved design.
- [ ] **Save** — save current design (localStorage or backend).
- [ ] **Undo / Redo** — state history with Ctrl+Z / Ctrl+Shift+Z.
- [ ] **Share** — copy link / download JSON.
- [ ] **Fullscreen** — toggle fullscreen mode.
- [ ] **Settings** — units (cm/inches), grid snap, etc.
- [ ] **Help** — tooltips / guided tour.
- [ ] **Sign In** — user accounts (future / placeholder).

### Files

```
components/TopToolbar.vue                        ← NEW
components/FooterBar.vue                         ← NEW
components/ViewModeToggle.vue                    ← NEW: Overhead|Wall|3D buttons
```

---

## Domain Model (Schema V2)

### Core Types

```typescript
// Room
type Room = {
  shape: "rectangular" | "custom";
  walls: Wall[];
  height: number; // ceiling height
  items: PlacedItem[]; // doors, windows, columns, decorators
  colors: RoomColors;
};

type Wall = {
  id: string;
  length: number;
  position: Vec2; // start point
  angle: number; // rotation
  hasCloset: boolean; // whether closet is placed on this wall
};

type PlacedItem = {
  id: string;
  type:
    | "wall_opening"
    | "double_door"
    | "single_door"
    | "sliding_door"
    | "bifold_door"
    | "rect_column"
    | "round_column"
    | "interior_wall"
    | "window"
    | "vent"
    | "outlet"
    | "light_switch"
    | "wall_photo"
    | "floor_photo";
  wallId: string; // which wall it's on (null for floor items)
  positionAlongWall: number;
  width: number;
  height: number;
};

type RoomColors = {
  floorFinish: string; // material ID
  floorColor: string; // hex
  wallColor: string; // hex
  trimColor: string; // hex
};

// Closet
type ClosetStateV2 = {
  schemaVersion: 2;
  units: "cm" | "in";
  room: Room;
  closetType: "reach_in" | "walk_in" | "custom";
  cabinet: CabinetDimensions;
  towers: Tower[];
  materials: ClosetMaterials;
  doorOptions: ArchitecturalDoorOptions;
};

type Tower = {
  id: string;
  width: number;
  depth: number;
  heightOverride?: number;
  accessories: Accessory[];
};

type Accessory =
  | { type: "rod"; position: "high" | "medium" | "low"; count: number }
  | { type: "shelf_set"; count: number }
  | { type: "shoe_shelf"; count: number }
  | { type: "drawer"; count: number; drawerHeight: number }
  | { type: "prop"; propId: string };

type ClosetMaterials = {
  finish: string; // material catalog ID
  backing: string; // material catalog ID
  handleStyle: string; // handle catalog ID
};

type ArchitecturalDoorOptions = {
  handleFinish: string; // 'polished_chrome' | 'brushed_chrome' | 'brass' | etc.
  doorFinish: string; // material ID
  doorColor: string; // hex
  plainPanels: boolean;
};
```

### Material Catalog

```typescript
type Material = {
  id: string;
  label: string; // "Miami Linen", "Walnut", etc.
  category: "finish" | "backing" | "floor" | "door";
  colorHex: string;
  textureUrl?: string;
  roughness: number;
  metalness: number;
  pricePerSqFt: number;
};

type HandleStyle = {
  id: string;
  label: string; // "Polished Chrome", "Brushed Chrome", etc.
  colorHex: string;
  textureUrl?: string;
  price: number;
};
```

### Files

```
features/closet/domain/
  schema.ts              ← v2 with room + towers + accessories
  types/
    room.ts              ← Room, Wall, PlacedItem, RoomColors
    tower.ts             ← Tower, Accessory
    material.ts          ← Material, HandleStyle
    architectureItem.ts  ← PlacedItem type definitions
  materials/
    catalog.ts           ← seeded material + handle catalog
  presets.ts             ← closet type presets + auto-create presets
  buildParts.ts          ← expanded: towers, dividers, rods, drawers, shelves
  validateCloset.ts      ← extended: per-tower + room validation
  constraints.ts         ← extended with tower/accessory limits
```

---

## Pinia Stores

| Store               | Responsibility                                                  |
| ------------------- | --------------------------------------------------------------- |
| `useAppStore`       | Current step (1-4), view mode (overhead/wall/3D), units setting |
| `useRoomStore`      | Room shape, walls, placed items, room colors                    |
| `useClosetStore`    | Cabinet dims, towers, accessories, materials, door options      |
| `useQuoteStore`     | Debounced pricing from backend                                  |
| `useProjectStore`   | Save/load, undo/redo history, project metadata                  |
| `useSelectionStore` | Currently selected tower, selected placed item (for editing)    |

---

## Routing

```typescript
const routes = [
  { path: "/", redirect: "/closet/type" },
  {
    path: "/closet/type",
    name: "SelectClosetType",
    component: SelectClosetType,
  },
  { path: "/closet/floorplan", name: "FloorPlan", component: FloorPlan },
  { path: "/closet/design", name: "DesignCloset", component: DesignCloset },
  { path: "/closet/review", name: "Review", component: ReviewPage },
];
```

---

## Execution Phases

### Phase 1 — Foundation & Domain (2-3 days)

- [ ] Schema v2 types (room, towers, accessories, materials)
- [ ] Material catalog with 8-10 finishes + 6 handle styles
- [ ] Closet type presets (reach-in, walk-in)
- [ ] Extended `buildParts` for towers + dividers + shelves
- [ ] Extended `validateCloset` for towers
- [ ] Migration helper v1 → v2
- [ ] Routing for all 4 steps
- [ ] Shared `TopToolbar` and `FooterBar` components
- [ ] `ViewModeToggle` component (Overhead | Wall | 3D)

### Phase 2 — Select Closet Type Page (1 day)

- [ ] `SelectClosetType.vue` — card-based layout
- [ ] Closet type cards with preview images
- [ ] Wire to stores → navigates to floor plan

### Phase 3 — Floor Plan Editor (4-5 days)

This is the most complex new feature.

- [ ] `FloorPlanCanvas.vue` — 2D SVG room renderer
- [ ] Room wall rendering with dimension labels
- [ ] **Drag-to-resize walls** (resize handles on walls + corners)
- [ ] Snap-to-grid (1" / 1cm increments)
- [ ] Left sidebar: Architecture items catalog
  - [ ] Door items (Wall Opening, Double Door, Single Door, Sliding Door, Bi-Fold Door)
  - [ ] Architecture items (Rectangular Column, Round Column, Interior Wall)
  - [ ] Wall Decorators (Window, Vent, Outlet, Light Switch, Wall Photo, Floor Photo)
- [ ] **Drag-and-drop** items from sidebar to floor plan
- [ ] Item placement along walls (doors, windows snap to walls)
- [ ] Item selection, repositioning, deletion
- [ ] **Change Room Height** dialog
- [ ] Right sidebar: Room Options
  - [ ] Floor Finish + Floor Color pickers
  - [ ] Wall Color + Trim Color pickers
  - [ ] Architectural Door Options (handle finish, door finish, door color)
- [ ] View mode switching (Overhead → default, Wall, 3D preview of empty room)
- [ ] Footer navigation (← Back to Type, Design Closet →)

### Phase 4 — Design Closet (3-4 days)

Expand the existing configurator significantly.

- [ ] **Refactor `Configurator.vue` → `DesignCloset.vue`** with new layout
- [ ] Left sidebar with 3 tabs:
  - [ ] **Auto Create tab** — preset cards, "Recreate Closet" button
  - [ ] **Towers tab** — tower list, add/remove, width/depth/height per tower
  - [ ] **Edit Components tab** — per-tower accessory sliders (Rods, Shoe Shelves, Drawers, Props)
- [ ] Right sidebar:
  - [ ] Closet Options (Finish swatch grid, Backing swatch, Handle Style)
  - [ ] Room Options (Floor Finish, Floor Color, Wall Color, Trim Color)
  - [ ] Architectural Door Options
- [ ] **3D viewport enhancements**:
  - [ ] Render multi-tower cabinets with vertical dividers
  - [ ] Render rods (cylinders)
  - [ ] Render drawers (box geometry)
  - [ ] Render shoe shelves (angled panels)
  - [ ] Render props (placeholder 3D objects — clothes, shoes, etc.)
  - [ ] Room context (walls + floor + door from floor plan)
  - [ ] Material-aware rendering (resolve catalog → Three.js materials)
  - [ ] Measurement overlays (dimension lines)
  - [ ] Camera presets (Overhead / Wall / 3D) with animated transitions
  - [ ] Reset Camera gizmo
- [ ] Tower selection highlighting (click tower in sidebar → highlight in 3D)
- [ ] Footer (← Back to Floor Plan, price, Share Design, Continue to Review →)

### Phase 5 — Review & Share (2 days)

- [ ] `ReviewPage.vue` — summary layout
- [ ] Design summary (towers, accessories, materials table)
- [ ] Multiple rendered view captures (overhead, wall, 3D)
- [ ] Room + wall dimension breakdown
- [ ] Price breakdown with line items
- [ ] **PDF export** (html2canvas + jsPDF, or similar)
- [ ] **Share Design** button (download JSON, copy link)
- [ ] **Submit for Quote** → POST to backend

### Phase 6 — Save/Load & Polish (2 days)

- [ ] `useProjectStore` — save/load to localStorage
- [ ] Auto-save (debounced, every 10s)
- [ ] Saved designs list dialog
- [ ] Import/Export `.closet.json` files
- [ ] **Undo/Redo** stack (Pinia history plugin)
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Delete)
- [ ] Units toggle (cm ↔ inches, displayed as `8' 0"` format for imperial)
- [ ] Responsive polish + loading states

---

## Sprint Schedule

| Sprint | Phase                                           | Duration | Deliverable                                      |
| ------ | ----------------------------------------------- | -------- | ------------------------------------------------ |
| **1**  | Phase 1 (Foundation) + Phase 2 (Type Selection) | 3 days   | Working routing, domain v2, type selection page  |
| **2**  | Phase 3 (Floor Plan Editor)                     | 5 days   | Full 2D floor plan with drag-and-drop            |
| **3**  | Phase 4 (Design Closet)                         | 4 days   | Multi-tower 3D configurator with all accessories |
| **4**  | Phase 5 (Review) + Phase 6 (Save/Load)          | 4 days   | Review page, PDF export, save/load, undo/redo    |

**Total estimated: ~16 working days**

---

## Target File Tree

```
src/
├── components/
│   ├── TopToolbar.vue
│   ├── FooterBar.vue
│   ├── ViewModeToggle.vue
│   ├── Cabinet3D.vue             ← expanded: multi-tower + accessories
│   ├── Room3D.vue                ← room walls/floor/doors in 3D
│   ├── MeasurementOverlay.vue
│   ├── CameraControls.vue
│   └── ui/
│       ├── button/
│       ├── slider/
│       ├── select/               ← NEW
│       ├── tabs/                 ← NEW
│       ├── color-picker/         ← NEW
│       ├── swatch-grid/          ← NEW
│       └── dialog/               ← NEW
├── features/closet/
│   ├── api/
│   │   └── quote.ts
│   ├── domain/
│   │   ├── schema.ts             ← v2
│   │   ├── types/
│   │   │   ├── room.ts
│   │   │   ├── tower.ts
│   │   │   ├── material.ts
│   │   │   └── architectureItem.ts
│   │   ├── materials/
│   │   │   └── catalog.ts
│   │   ├── closetTypes.ts
│   │   ├── presets.ts
│   │   ├── parts.ts
│   │   ├── buildParts.ts         ← expanded
│   │   ├── constraints.ts        ← expanded
│   │   └── validateCloset.ts     ← expanded
│   ├── stores/
│   │   ├── useQuoteStore.ts
│   │   └── useProjectStore.ts    ← NEW
│   ├── components/
│   │   ├── FloorPlanCanvas.vue   ← NEW: 2D SVG renderer
│   │   ├── RoomItem2D.vue        ← NEW: placed items on floor plan
│   │   ├── DimensionLabel.vue    ← NEW
│   │   ├── ArchitectureSidebar.vue ← NEW
│   │   ├── RoomOptionsSidebar.vue  ← NEW
│   │   ├── AutoCreateTab.vue     ← NEW
│   │   ├── TowersTab.vue         ← NEW
│   │   ├── EditComponentsTab.vue ← NEW
│   │   ├── ClosetOptionsSidebar.vue ← NEW
│   │   ├── TowerCard.vue         ← NEW
│   │   ├── DesignSummary.vue     ← NEW
│   │   └── PriceBreakdown.vue    ← NEW
│   └── views/
│       ├── SelectClosetType.vue  ← NEW
│       ├── FloorPlan.vue         ← NEW
│       ├── DesignCloset.vue      ← REFACTORED from Configurator.vue
│       └── ReviewPage.vue        ← NEW
├── stores/
│   ├── useAppStore.ts            ← NEW: app-level state
│   ├── useRoomStore.ts           ← NEW: room/floor plan state
│   ├── useClosetStore.ts         ← expanded for v2
│   └── useSelectionStore.ts      ← NEW: UI selection state
├── router/
│   └── index.ts                  ← 4 routes
├── assets/
│   ├── icons/                    ← architecture item icons
│   └── textures/                 ← material swatches
├── main.ts
└── style.css
```
