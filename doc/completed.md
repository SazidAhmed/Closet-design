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

## Interactive Features (Priority 1-3)

### Floor Plan Interactivity

- [x] **Drag-to-resize walls** — corner (yellow) and mid-wall (blue) handles for rectangular rooms
- [x] **Architecture placement** — drag-and-drop items (doors, columns, windows) from sidebar onto walls
- [x] **Item management** — place, reposition along wall, and delete architectural items
- [x] **Room height control** — Change Room Height dialog updates 3D room volume

### View Modes & Camera

- [x] **View mode switching** — Overhead | Wall | 3D toggle in footer
- [x] **Overhead view** — top-down 2D orthographic representation of the room
- [x] **Wall view** — front elevation view focused on the closet wall
- [x] **Camera Rig** — animated transitions and presets for different viewing angles

### 3D Viewport Enhancements

- [x] **Measurement overlays** — real-time dimension labels on cabinet parts in 3D
- [x] **Tower reordering** — drag-and-drop towers in the "Towers" tab to reorder them in 3D
- [x] **Decorative Props** — hangers rendered on hanging rods for realistic visualization
- [x] **High-quality textures** — support for loading real wood/fabric textures from catalog URLs

---

## Step 4 — Review & Share (`/closet/review`)

- [x] **Closet Overview** — summary of dimensions, finish, backing, and handle style
- [x] **Tower Inventory** — detailed breakdown of towers and their accessories
- [x] **Room Summary** — room shape, wall count, and placed architectural items
- [x] **Export State** — "Download Design (JSON)" button to export the raw design schema

---

## Persistence & History (Priority 4)

- [x] **LocalStorage persistence** — design state automatically saved to browser storage
- [x] **Auto-save** — debounced (1.5s) save on every state change
- [x] **Undo / Redo** — robust undo/redo stack (Ctrl+Z / Ctrl+Shift+Z) for all design decisions
- [x] **Named Design Slots** — modal UI to save, load, and delete multiple named designs

---

## Units & Measurements (Priority 5)

- [x] **Units toggle** — switch between Imperial (inches/feet) and Metric (cm) throughout the UI
- [x] **Smart formatting** — all dimension labels, sliders, and inputs respect the selected unit
- [x] **Unit-aware inputs** — numeric inputs support unit suffixes (e.g. `72"` or `183 cm`)

---

## Infrastructure & Technical Details

### Pinia Stores

| Store               | Status | Responsibility                                             |
| ------------------- | ------ | ---------------------------------------------------------- |
| `useAppStore`       | ✅     | Current step, view mode, units toggle                      |
| `useRoomStore`      | ✅     | Room shape, walls, placed items, room colors               |
| `useClosetStore`    | ✅     | Cabinet dims, towers, accessories, materials, door options |
| `useHistoryStore`   | ✅     | Undo/redo, localStorage saves, named design slots          |
| `useQuoteStore`     | ✅     | Debounced pricing via `/api/quote`                         |
| `useSelectionStore` | ✅     | Currently selected tower ID / placed item ID               |

### API & Routing

- [x] **Quote API** — POST to `/api/quote` with debounced state export
- [x] **Lazy Loading** — 4 main routes using `createWebHistory` and dynamic imports
- [x] **State Migration** — `migrateV1toV2` helper for backward compatibility

---

## What's NOT Yet Implemented

- [ ] **PDF Export** — generated design summary and dimensioned drawings
- [ ] **Cloud Persistence** — saving designs to a user account/database
- [ ] **User Authentication** — sign up / sign in for professional accounts
- [ ] **Order Tracking** — history of submitted quotes and order statuses
- [ ] **Advanced Props** — shoes, folded clothes, and storage boxes
