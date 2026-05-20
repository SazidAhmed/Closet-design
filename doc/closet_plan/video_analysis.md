# Video Analysis & Implementation Plan: Closet Builder UI

This document analyzes the functionality demonstrated in the video `closet.mp4` (10:11 duration) and outlines a plan to implement similar features in the closet design web application. The video is a Google Meet recording between Sazid Ahmed and DIA K&B, walking through a "Closets Logic" Google Doc and demonstrating features in the **Mozaik CNC** desktop CAD application.

---

## 1. Detailed Description of Functionality Shown in the Video

### A. Core Workflow & Navigation

1. **Separation of Editors**:
   - There is a clear distinction between the **Room Editor (Floor Plan)** and the **Cabinet Editor / Closet Designer (Build Closet)**.
   - Wall segment editing, drawing, and resizing must be done in the Room Editor.
   - Once inside the closet builder/cabinet designer UI, the walls are **locked** (read-only), and the user can only manipulate/design the cabinets (towers, shelves, rods, drawers) placed within the room.
2. **Layout Views**:
   - The interface features two primary 2D views for designing the closet:
     - **Top View (Floor Plan)**: Shows the 2D layout of the room, walls, and top-down boundaries of placed cabinets. Walls are numbered (Wall 1–5). Cabinet rectangles appear on the interior surface of walls with sequential labels (#1, #2, #3, #4).
     - **Elevation View**: Shows a front-facing 2D view of a **specific selected wall** (labeled "Wall #2", "Wall #3", etc. at the top). Displays the wall's full width and height with detailed shelf/drawer/rod configurations and any architectural features (windows rendered as blue rectangles).
   - The user can switch between Top View and Elevation View. Clicking a wall in Top View or using the wall selector dropdown navigates to that wall's Elevation View.
3. **Mozaik CNC Toolbar** (reference for feature parity):
   - Top toolbar tabs visible: **Job**, **Settings**, **Room**, **Products**, **Tape**, **Molding**, **Order**, **Multipoint**, **Pricing**, **Cutlist**.
   - Bottom status bar: Unit toggle (`mm` / `in`), deselection hint ("Press ESC Key or Click Off the Item to Deselect").

### B. Cabinet Placement (Drag & Drop vs. Direct Click)

1. **Product Library / Catalog (Left Sidebar)**:
   - A left-hand sidebar displays available product categories under a **"DIA Closets"** dropdown.
   - Three tabs at the top: **Products**, **Job Params**, **Favorites**.
   - A prominent instruction banner reads: **"Drag Products To Floor Plan → From Library"** with a red arrow pointing down to the tree.
   - The catalog tree is organized hierarchically (see Section 1.G for full structure).
   - A product thumbnail and preview image appear above the tree when a category/product is hovered or selected.
2. **Placement Interaction**:
   - **Drag and Drop**: The user drags a product category (e.g., "CAS 84H 1 Box") from the library pane and drops it onto any of the active walls (Wall 1–5) in the Top View.
   - When dropped onto a wall, a cabinet is instantiated on that wall, snapped flat against the interior surface.
   - **Alternative / Secondary Placement**: The user selects a wall first, then clicks a catalog item to place a cabinet on that selected wall.
3. **Wall Snapping**:
   - Placed cabinets automatically align and snap flat against the interior surface of the targeted wall.
   - Multiple cabinets can be placed on the same wall (e.g., cabinets #1 and #2 both on Wall 2).

### C. Cabinet Properties & Status Bar (Bottom Panel)

When a cabinet is placed or selected, a detailed **property/status bar** appears at the bottom of the viewport. The fields observed in the video are:

| Field | Description | Example Value |
|-------|-------------|---------------|
| **Product Selector** | Dropdown showing current catalog model ID | `CAS129415 #1` |
| **Position Mode** | Toggle between `Left` / `Right` alignment | `Right` |
| **Width** | Horizontal size along wall (inches) | `45`, `5`, `41`, `22`, `20` |
| **Height** | Vertical size (inches) | `107`, `80` |
| **Depth** | Perpendicular extension from wall (inches) | `22`, `15` |
| **Elevation** | Height off the floor | `0` |
| **Outset** | Forward offset from the wall surface | `0` |
| **Clearance** | Distance from cabinet edge to wall corner or neighbor | `22`, `0`, `8` |
| **Center** | Center position along wall | `44 1/2`, `2 1/2`, `20 1/2` |
| **Position** | Offset from wall start vertex (inches) | `22`, `0`, `8`, `33`, `19` |
| **Fin Ends** | Dropdown: `Right`, `Left`, `None`, `Both` | `Right`, `None` |
| **Re Hinge** | Button to toggle door hinge side | `Re Hinge` |
| **Wall** | Wall association dropdown | `Wall #2` |

Additional action buttons at bottom:
- **Edit** button
- **3D** toggle button (switches to 3D preview)
- **Autofill** button (auto-fills remaining wall space with cabinets)
- **+ Add Wall** button
- Three green buttons at bottom-left: **Ends**, **Scribe**, **Toe**

### D. Interactive 2D Manipulators (Drag Handles)

On the active canvas, selected cabinets exhibit interactive **green arrow handles**:

1. **Top View (Floor Plan) Manipulators**:
   - **Width Handle**: Green horizontal double-arrow (`↔`) on the right edge — dragging changes width along the wall.
   - **Depth Handles**: Green vertical double-arrows (`↕`) on the top and bottom edges — dragging changes the cabinet's depth perpendicular to the wall.
   - The cabinet border turns **red** when selected.
2. **Elevation View Manipulators**:
   - **Width Handles**: Green arrows on left/right edges of the cabinet frame.
   - **Height Handle**: Green arrow on top edge — dragging up/down resizes height.
   - Shelves/rods inside the cabinet re-render as dimensions change.

### E. Constraints & Guardrails (Product Editor Dialog)

The **Product Editor** dialog (accessed by double-clicking a placed cabinet or clicking "Edit") shows:

| Section | Fields |
|---------|--------|
| **Header** | Name: `CAS129415`, Description (empty), Type: `Cabinet` / `Tall` / `Standard` |
| **Product Size** | Width: `45`, Height: `107`, Depth: `22` |
| **Stretching** | Checkboxes: ☑ Width OK, ☑ Height OK, ☑ Depth OK |
| **Maximum Product Size** | Width: `45`, Height: `107`, Depth: (highlighted blue field) |
| **Minimum Product Size** | Width: `5`, Height: `80`, Depth: `22` |
| **Tabs** | Size, Info, Price, Shape, Face, Interior, Parameters, Parts, Hardware, Notes |

**Sidebar actions** in Product Editor: Previous/Next, Product Log, OK, Cancel, Save, Save to Library, View Cutlist, View Product, View SketchUp, Close, Undo, Redo, Parts to Build, Ends, Scribe, Toe.

**Constraint enforcement rules**:
- Width: Min `5"` / Max `45"` — user cannot drag or input beyond these bounds.
- Height: Min `80"` / Max `107"`.
- Depth: fixed per catalog suffix (e.g., `15`, `18`, `22`) — see Dynamic Switch below.
- If the user tries to drag a handle past limits, the resize operation stops rigidly at the threshold.

### F. Dynamic Catalog Switching Logic

This is a critical business rule discussed in both the Google Doc and Mozaik demo:

1. **Default placement**: When a customer places a shelf unit, it defaults to the **smallest available option**: e.g., `CAS128415` (12" Width, 84" Height, 15" Depth).
2. **Depth-based switching**: The depth dimension maps to a specific **catalog suffix** (`15`, `18`, `22`). Each suffix is a separate catalog entry with its own ID:
   - `CAS128415-459615 — ID205` (15" depth catalog)
   - `CAS128418-459618 — ID204` (18" depth catalog)
   - `CAS128421-429621 — ID199` (21" depth catalog)
3. **Seamless transition**: If the customer increases depth beyond the current catalog's max, the app must **silently switch** to the next catalog suffix. The transition should be completely invisible to the user but tracked in the export payload for pricing and manufacturing.
4. **Progressive depth escalation**: Customer can keep increasing depth (15 → 18 → 21 → ...) until they reach the **absolute maximum** and there is no further catalog to switch to.
5. **3 catalogs per category**: Even though there are 3 catalogs within each category (by depth suffix), the customer sees only **1 option per category**. The Min and Max dimensions for each distinct Closet category are pulled from across 3 different catalogs transparently.

### G. Catalog Structure & Naming Conventions

The left sidebar tree in Mozaik reveals this hierarchy:

```
DIA Closets
├── No Doors 2 Boxes (Moldings)
├── No Doors 1 Box (No Moldings)
│   ├── 84 High 1 Box
│   │   ├── CAS 84H 1 Box     — Closet Adjustable Shelves
│   │   ├── CDH 84H 1 Box     — Closet Double Hanging
│   │   ├── CLH 84H 1 Box     — Closet Long Hanging
│   │   ├── CRD 84H 1 Box     — Closet Rod + Drawers combo
│   │   └── CSS 84H 1 Box     — Closet Shoe Shelves
│   ├── 90 High 1 Box
│   ├── 96 High 1 Box
│   ├── 84 High 1 Box EXT
│   ├── 90 High 1 Box EXT
│   └── 96 High 1 Box EXT
├── 23 Deep With Doors
└── Parts
    └── CAS129415
```

**Naming convention**: `{Category}{Width}{Height}{Depth}`
- Example: `CAS128415` = Closet Adjustable Shelves, 12" W, 84" H, 15" D
- For double hanging where depth is flexible: `CDH1284xx` to `CDH4284xx` (xx = variable depth)
- Individual models listed under CDH: `CDH1284xx`, `CDH4504xx`, `CDH1504xx`, `CDH2104xx`, `CDH2404xx`, `CDH2704xx`, `CDH3004xx`, `CDH3304xx`, `CDH3604xx`, `CDH3904xx`, `CDH4204xx`, `CDH4504xx`

**Category abbreviation reference**:

| Code | Full Name | Interior Visual |
|------|-----------|-----------------|
| CAS | Closet Adjustable Shelves | Horizontal shelf dividers (6+ equal slots) |
| CDH | Closet Double Hanging | Two rods stacked vertically with hanger icons |
| CLH | Closet Long Hanging | Single full-height rod with hanger icons |
| CRD | Closet Rod + Drawers | Hanging rod at top, drawer boxes at bottom |
| CSS | Closet Shoe Shelves | Angled/flat shelves optimized for shoes |

**Box configurations**:
- **1 Box (No Moldings)**: Single-box cabinet construction without decorative trim
- **2 Boxes (Moldings)**: Two-box cabinet construction with decorative molding trim
- **EXT** variants: Extended height versions of the same categories

**Door options** (top-level split):
- **Without Doors**: Categories CAS, CDH, CLH, CRD, CSS (open-face cabinets)
- **With Doors**: Separate catalog section "23 Deep With Doors" — likely pre-configured depth

### H. Internal Cabinet Visual Representation

Different categories render distinct interior structures (visible especially in Elevation View):

1. **Shelves (CAS)**: Renders multiple horizontal shelf dividers equally spaced (6–8 shelves visible). The product thumbnail in the sidebar shows a tall cabinet with evenly-spaced horizontal lines.
2. **Hanging (CDH/CLH)**: Renders hanging rods with clothing hanger icons inside the cabinet.
3. **Drawers (CRD)**: Renders pull-out drawer boxes in the lower section, hanging rod at top.
4. **Shoe Shelves (CSS)**: Renders shelf dividers optimized for shoe storage.

### I. Elevation View Details

The Elevation View shows a **front-facing cross-section of a single wall**:

1. **Wall Header**: "Wall #2" or "Wall #3" displayed at the top.
2. **Wall Dimensions**: Full wall length shown at the bottom (e.g., `100"`), wall height at the side.
3. **Cabinet Rendering**: Cabinets appear as filled rectangles against the wall background. Interior shelf/rod/drawer lines are rendered inside.
4. **Architectural Features**: Windows appear as **blue/light-blue rectangles** positioned on the wall. The window dimensions and position are shown (e.g., a window on Wall #3 with a `70"` width annotation in red).
5. **Dimension Annotations**: Red dashed lines with dimension values show clearances and positions (e.g., `17 27/32"`, `22 5/32"` at the bottom).
6. **Cross Section Button**: A "Cross Section" button is available in the bottom toolbar when in Elevation View.

### J. Wall Properties Panel (Bottom)

When a wall is selected (not a cabinet), the bottom panel shows **Wall Properties**:

| Field | Description | Example |
|-------|-------------|---------|
| **Length** | Wall length in inches | `100` |
| **Height** | Wall height in inches | `110` |
| **End Caps** | Dropdown for wall end treatment | `No End Caps` |
| **Invisible Wall** | Checkbox to hide wall in render | ☐ |
| **Rotation** | Wall angle in degrees | `90` |
| **Bulge** | Wall curvature value | `0` |
| **Wall Faces** | Front Face / Back Face / Left Face / Right Face — each with a "View" button | |
| **Front/Back Toggle** | Selects which face to view in Elevation | |

### K. Multi-Cabinet Wall Layout

The video demonstrates placing **multiple cabinets on the same wall**:
- Wall 2 has cabinets #1 (bottom) and #2 (top) placed along its length.
- Wall 3 has cabinet #3 with a window.
- Wall 4 has cabinet #4.
- Top-view dimension annotations show spacing between cabinets: `30"`, `30"`, `22 5/32"`, `70"`, `34"` etc.
- Cabinets can be repositioned by changing the Position value in the properties panel.

### L. Wall Selection & Context Menu

- In Top View, clicking on a wall (e.g., Wall 2) highlights it with a **red border** and shows green resize/move handles on all 4 sides plus corners.
- A **floating context menu** appears near the selected wall with 3 icons: pointer, zoom, and options (⋮).
- The bottom dropdown changes to show the wall selector (e.g., "Wall #2").

### M. Autofill Feature

- An **"Autofill"** button is visible in the bottom toolbar.
- This feature automatically fills the remaining empty space on a wall with cabinets using default dimensions.

---

## 2. Technical Mapping to Current App State

To implement this functionality in our Vue 3 app, we can leverage the existing Pinia stores:
- **useAppStore**: Controls step navigation (`/closet/design`), units (cm/inches), and `viewMode` (overhead/elevation/3d).
- **useRoomStore**: Holds the wall geometry, placed wall decorator items (windows, doors), and labels.
- **useClosetStore**:
  - Needs to manage the placed cabinet components (towers/sections) on specific walls.
  - Needs to enforce schema/catalog constraints (min/max widths, heights, depths).
  - Needs to implement dynamic catalog switching logic (transparent depth-based suffix switching).
- **useSelectionStore**: Manages selected cabinet section/item ID.

---

## 3. Implementation Plan for "Build Closet" (Design Closet) UI

Here is a step-by-step development strategy to implement the functionality shown in the video.

### Phase 1: Database, Schema, and Domain Types

1. **Define Catalog Schema (`src/features/closet/domain/types/catalog.ts`)**:
   - Create types for cabinet products and categories.
   - Define structure:
     ```typescript
     export type CabinetCategoryCode = 'CAS' | 'CDH' | 'CLH' | 'CRD' | 'CSS'
     export type BoxConfig = '1box' | '2box'
     export type DoorOption = 'without_doors' | 'with_doors'

     export interface CatalogEntry {
       id: number           // e.g., 205, 204, 199
       modelCode: string    // e.g., 'CAS128415'
       category: CabinetCategoryCode
       doorOption: DoorOption
       boxConfig: BoxConfig
       hasMoldings: boolean
       isExtended: boolean  // EXT variant
       baseWidth: number    // e.g., 12
       baseHeight: number   // e.g., 84
       baseDepth: number    // e.g., 15
       minWidth: number
       maxWidth: number
       minHeight: number
       maxHeight: number
       minDepth: number
       maxDepth: number
       depthSuffix: number  // 15, 18, 22 — for dynamic switching
     }

     export interface CabinetCategory {
       code: CabinetCategoryCode
       name: string         // 'Closet Adjustable Shelves'
       shortName: string    // 'Shelves'
       doorOption: DoorOption
       boxConfig: BoxConfig
       heightGroups: number[] // [84, 90, 96]
       depthSuffixes: number[] // [15, 18, 22] — maps to catalog entries
       catalogs: CatalogEntry[] // All catalog entries across depth suffixes
       // Aggregated min/max across all depth suffixes:
       aggregatedMinWidth: number
       aggregatedMaxWidth: number
       aggregatedMinHeight: number
       aggregatedMaxHeight: number
       aggregatedMinDepth: number  // smallest min across all suffixes
       aggregatedMaxDepth: number  // largest max across all suffixes
     }
     ```

2. **Define Closet Tower/Section Placed State (`src/features/closet/domain/types/tower.ts`)**:
   - Extend `Tower` to link with the parent wall segment:
     ```typescript
     export interface PlacedCabinet {
       id: string
       wallId: string              // Snap parent wall
       category: CabinetCategoryCode
       doorOption: DoorOption
       boxConfig: BoxConfig
       activeCatalogId: number     // Current catalog entry ID (for dynamic switching)
       activeCatalogCode: string   // e.g., 'CAS128415'
       width: number               // Internal unit: inches
       height: number
       depth: number
       elevation: number           // Height off floor (default 0)
       outset: number              // Forward offset from wall surface (default 0)
       positionAlongWall: number   // Offset from wall start vertex
       positionMode: 'left' | 'right' // Alignment reference
       finEnds: 'none' | 'left' | 'right' | 'both'
       hingeDirection: 'left' | 'right' | null // For door cabinets
     }
     ```

### Phase 2: Pinia Store Upgrades (`src/stores/useClosetStore.ts`)

1. **State**:
   - Add `placedCabinets: PlacedCabinet[]` to store state.
   - Add `catalogRegistry: CabinetCategory[]` loaded from config/API.

2. **Actions**:
   - `addCabinet(cabinet: Omit<PlacedCabinet, 'id'>)`: Add a new cabinet, validating wall fit and non-overlap.
   - `updateCabinetDimensions(id, updates)`: Clamp updates against category constraints. **Implement dynamic catalog switching**: when depth exceeds current suffix max, silently switch `activeCatalogId` and `activeCatalogCode` to the next depth suffix catalog.
   - `removeCabinet(id: string)`: Delete cabinet by ID.
   - `repositionCabinet(id: string, newPosition: number)`: Move cabinet along wall.
   - `autofillWall(wallId: string, category: CabinetCategoryCode)`: Fill remaining gaps on wall with default-sized cabinets.
   - `setFinEnds(id: string, value: 'none' | 'left' | 'right' | 'both')`: Set fin end treatment.
   - `reHinge(id: string)`: Toggle door hinge side.

3. **Getters**:
   - `cabinetsByWallId(wallId: string)`: Returns sorted cabinets along a specific wall.
   - `clearancesForCabinet(id: string)`: Computes left/right clearances dynamically based on wall length and neighboring cabinets.
   - `resolvedCatalogForCabinet(id: string)`: Returns the active catalog entry based on current dimensions (handles dynamic switching).

### Phase 3: UI Layout & Double Viewport Integration (`src/features/closet/views/DesignCloset.vue`)

1. **View Selection Tab Bar**:
   - Re-enable/expand the `ViewModeToggle` component:
     - **Top View (Overhead 2D Floor Plan)**
     - **Elevation View (Front 2D Wall view)**
     - **3D View (Interactive 3D Three.js room)**

2. **Overhead 2D Canvas (`src/components/floorplan/OverheadDesigner.vue`)**:
   - Render the closed or open room walls in SVG (read-only mode, using `useRoomStore.walls`).
   - Render cabinets as 2D rectangles positioned along their corresponding wall segments:
     - Apply translation and rotation based on the wall's start coordinate and angle.
     - Show sequential labels (#1, #2, etc.) inside each cabinet rectangle.
   - Selected cabinet shows:
     - Red border around cabinet.
     - Green arrow resize handles: `↔` for width (side edge), `↕` for depth (front/back edges).
   - Dimension annotations between cabinets and from walls.
   - **Wall Selection**: Clicking a wall (not a cabinet) highlights the wall with red border and shows wall resize handles + floating context menu (pointer, zoom, options).

3. **Elevation View Canvas (`src/components/floorplan/ElevationDesigner.vue`)**:
   - Render a flat SVG viewport showing the selected wall:
     - Wall label at top ("Wall #2").
     - Full wall length as width, wall height as height.
   - Render wall decorations (windows as blue rectangles, doors as transparent outlines) in their actual 2D coordinates.
   - Render cabinets side-by-side along the wall base line:
     - Cabinet heights and internal shelf/rod/drawer visuals.
     - Dimension annotations (red dashed lines) showing clearances.
   - Selected cabinet shows top green drag handle (height) and side green drag handles (width).
   - **Cross Section** button for detailed cross-section view.

### Phase 4: Left-Sidebar Catalog Component

1. **Catalog Tree Component**:
   - **Top-level split**: "Without Doors" / "With Doors" (customer chooses one first).
   - Under "Without Doors": 5 category folders (CAS, CDH, CLH, CRD, CSS).
   - Under each category: height groups (84H, 90H, 96H) and EXT variants.
   - Product thumbnail preview when category is selected.
   - "Drag Products To Floor Plan From Library" instruction banner.

2. **Placement Handlers**:
   - **Click-to-Place (Recommended Baseline)**:
     - User selects a wall by clicking it on the 2D floor plan.
     - User clicks a catalog item (e.g., "CAS 84H 1 Box").
     - Cabinet is placed in the first available gap on that wall with default minimum dimensions.
   - **Drag and Drop Placement**:
     - Implement standard drag start/over/drop listeners on the SVG walls.
     - Project the drag client coordinate to the closest wall segment's internal 1D position (`positionAlongWall`).

### Phase 5: Cabinet Internal SVG Templates

Create lightweight SVG rendering components to illustrate cabinet contents:

1. **`CabinetShelvesSvg.vue`** (CAS):
   - Draw outer rectangle.
   - Calculate divider lines depending on height: e.g., draw 6–8 horizontal lines spaced equally.

2. **`CabinetDoubleHangingSvg.vue`** (CDH):
   - Draw two horizontal rod lines (upper and lower thirds).
   - Draw multiple hanger shapes hanging from each rod.

3. **`CabinetLongHangingSvg.vue`** (CLH):
   - Draw one horizontal rod line near the top.
   - Draw full-length hanger shapes.

4. **`CabinetRodDrawersSvg.vue`** (CRD):
   - Draw horizontal rod line in upper portion.
   - Draw 3–4 drawer boxes in the bottom half.

5. **`CabinetShoeShelvesSvg.vue`** (CSS):
   - Draw angled or flat shelf lines optimized for shoe display.

### Phase 6: Cabinet Properties Panel Component

Create a bottom panel component (`CabinetPropertiesPanel.vue`) that renders when a cabinet is selected:

1. **Product selector dropdown** (model code + instance number).
2. **Position mode toggle** (Left / Right).
3. **Dimension inputs**: Width, Height, Depth, Elevation, Outset — all numeric with min/max validation.
4. **Clearance display**: Computed left/right distances.
5. **Center and Position** computed fields.
6. **Fin Ends dropdown**: None / Left / Right / Both.
7. **Re Hinge button** (for doored cabinets only).
8. **Wall selector dropdown** (to reassign cabinet to different wall).
9. **Action buttons**: Edit (opens Product Editor dialog), 3D toggle, Autofill, + Add Wall.
10. **Quick-access buttons**: Ends, Scribe, Toe (green buttons).

### Phase 7: Wall Properties Panel Component

Create a wall properties panel (`WallPropertiesPanel.vue`) shown when a wall is selected (no cabinet):

1. **Wall selector dropdown**.
2. **Length** and **Height** inputs.
3. **End Caps dropdown** (No End Caps, etc.).
4. **Invisible Wall checkbox**.
5. **Rotation** input (degrees).
6. **Bulge** input (wall curvature).
7. **Wall Faces section**: Front Face / Back Face / Left Face / Right Face with "View" buttons to switch to that face's Elevation View.
8. **Autofill** and **+ Add Wall** buttons.

### Phase 8: Quote and Validation Integration

1. **Sync with Quote Store**:
   - Whenever any cabinet is placed, updated, or removed, debouncely trigger `useQuoteStore.updateQuote()` to calculate and update pricing based on placed cabinets.
   - Include `activeCatalogId` in the export payload so backend can resolve correct pricing per catalog entry.

2. **Validation**:
   - Trigger warning badges if cabinets overlap or cover window/door decorators on walls.
   - Warn if cabinet dimensions fall outside catalog constraints.
   - Validate total cabinet width does not exceed wall length.

### Phase 9: Product Editor Dialog

Implement a modal dialog (`ProductEditorDialog.vue`) accessible via Edit button or double-click:

1. **Header**: Name, Description, Type dropdown (Cabinet / Tall / Standard).
2. **Product Size section**: Current Width, Height, Depth.
3. **Stretching checkboxes**: Width OK, Height OK, Depth OK.
4. **Maximum/Minimum Product Size** display (from active catalog).
5. **Tab navigation**: Size, Info, Price, Shape, Face, Interior, Parameters, Parts, Hardware, Notes.
6. **Action sidebar**: Previous/Next, OK, Cancel, Save, Undo, Redo, Parts to Build, Ends, Scribe, Toe.
