# Closet Project Documentation

## 1. Project overview

This project is a multi-step closet designer built with Vue 3, TypeScript, Pinia, Vue Router, and TresJS (Three.js via Vue).

The user workflow is:

1. Select closet type
2. Configure floor plan
3. Design closet in 3D
4. Review and export

Routes:

- `/closet/type`
- `/closet/floorplan`
- `/closet/design`
- `/closet/review`

The app is fully client-side. There is no backend in this repository.

## 2. Tech stack

- Vue 3 + TypeScript + Vite
- Pinia for state management
- Vue Router for step routing
- TresJS + Three.js for 3D rendering
- Tailwind CSS v4
- Radix Vue (slider primitive), Lucide icons

Main entry:

- `src/main.ts` creates app, installs Pinia and router.
- `src/App.vue` mounts `<RouterView />` and registers global keyboard shortcuts.

## 3. Setup and scripts

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## 4. Application flow

### Step 1: Select closet type (`SelectClosetType.vue`)

- Shows three presets: `reach_in`, `walk_in`, `custom`
- On selection:
  - updates closet preset (`useClosetStore`)
  - updates room preset (`useRoomStore`)
  - sets app step to `floorplan`
  - routes to `/closet/floorplan`

### Step 2: Floor plan (`FloorPlan.vue`)

- 2D SVG room editor
- Drag corner and mid-wall handles to resize room
- Add and drag architectural items (doors, columns, decorators)
- Set room colors and door options
- Change room height dialog

### Step 3: Design closet (`DesignCloset.vue`)

- 3D viewport with TresJS
- Left panel tabs:
  - auto-create tower presets
  - tower list + order + dimensions
  - edit accessories (shelves, drawers, shoe shelves)
- Right panel:
  - finish/backing/handle options
  - room color/finish options
  - live quote status and total
- Camera view modes via `ViewModeToggle` + `CameraRig`

### Step 4: Review (`ReviewPage.vue`)

- Displays closet summary, tower accessories, and room summary
- Can export current closet payload as `closet-design.json`
- Share and submit buttons are UI placeholders

## 5. State architecture

### `useAppStore` (`src/stores/useAppStore.ts`)

- UI-level state:
  - `currentStep`
  - `viewMode` (`overhead | wall | 3d`)
  - `units` (`cm | in`)

### `useClosetStore` (`src/stores/useClosetStore.ts`)

- Main closet state (schema v2):
  - cabinet dimensions
  - closet type
  - towers + accessories
  - materials and door options
- Exposes:
  - `violations` from domain validator
  - `exportForBackend` sanitized payload
  - tower management and accessory actions

### `useRoomStore` (`src/stores/useRoomStore.ts`)

- Floor plan state:
  - room shape/walls/height
  - placed architecture items
  - room colors
- Handles room resizing, item placement/movement/removal

### `useSelectionStore` (`src/stores/useSelectionStore.ts`)

- Pure UI selection state:
  - selected tower
  - selected item
  - selected wall

### `useHistoryStore` (`src/stores/useHistoryStore.ts`)

- Undo/redo stacks
- LocalStorage persistence
- Named design slots (save/load/delete)
- Auto-save debounce (1.5s)
- Watches closet+room state changes

LocalStorage keys:

- `closet-design-save`
- `closet-design-slots`

### `useQuoteStore` (`src/features/closet/stores/useQuoteStore.ts`)

- Debounced quote requests
- In-flight cancellation with `AbortController`
- Basic hash-based request caching by payload JSON

## 6. Domain layer

### Schema and migration (`src/features/closet/domain/schema.ts`)

- `ClosetStateV2` is the canonical closet schema
- Includes `schemaVersion: 2`
- Includes migration helper `migrateV1toV2`
- `exportForBackend(state)` clamps numeric ranges and returns backend-safe payload

### Constraints (`constraints.ts`)

Defines min/max constraints for:

- cabinet dimensions
- tower dimensions/count
- accessory limits
- room dimensions

### Validation (`validateCloset.ts`)

Generates structured violations:

- `severity` (`error` or `warning`)
- `code`
- `message`
- optional `path`

Used to block quote calls when errors exist.

### Closet presets (`closetTypes.ts`)

- Preset definitions for reach-in, walk-in, custom
- Auto-create tower presets used in Design step

### Parts generation (`buildCabinetParts.ts`)

Converts closet state into geometric part list (`ClosetPart[]`) for rendering:

- carcass panels
- dividers
- shelves
- rods
- drawers
- shoe shelves

This keeps rendering logic data-driven.

### Material catalog (`materials/catalog.ts`)

Provides:

- finish materials
- backing materials
- floor materials
- door materials
- handle styles
- wall/trim color swatches

Used by both UI swatches and renderer material properties.

## 7. Rendering architecture

### `Room3D.vue`

- Renders floor + walls + trim using room store state
- Uses floor texture from texture cache when available

### `Cabinet3D.vue`

- Computes parts via `buildParts(closet.$state)`
- Renders part categories with Tres primitives
- Resolves material color/roughness/metalness from catalog
- Uses texture cache and repeat scaling
- Adds dimension lines and decorative hangers

### `CameraRig.vue`

- Renderless component inside `<TresCanvas>`
- Watches `appStore.viewMode`
- Smoothly animates camera/target/up between mode presets
- Disables orbit controls during transitions

## 8. Utilities and composables

- `useUnit.ts`: display/convert cm/in values
- `useTextureCache.ts`: procedural and URL texture loading + cache
- `useCameraAnimation.ts`: older generic camera animation composable (not used by current route flow)

## 9. Toolbar, footer, and shortcuts

### Top toolbar (`TopToolbar.vue`)

Exposes events for:

- new/open/save
- undo/redo
- share/fullscreen/settings/help

### Footer (`FooterBar.vue`)

- step navigation
- view mode toggle
- units toggle
- quote price display

### Global keyboard shortcuts (`App.vue`)

- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Shift + Z`: redo
- `Ctrl/Cmd + S`: save to LocalStorage

## 10. Quote contract

Quote API helper is in `src/features/closet/api/quote.ts`:

- POST `/api/quote`
- request body: `QuoteRequest` (output of `exportForBackend`)
- response: `QuoteResponse` with total and line items

Important: `/api/quote` endpoint is not implemented in this repository.

## 11. Known gaps and implementation notes

1. Room state exists in two places:
   - `closet.room` (inside schema)
   - `useRoomStore` (actively edited in UI)
   Current UI primarily edits `useRoomStore`. Keep this in mind when consuming `closet.exportForBackend`.
2. Share and Submit actions are not wired to production behavior.
3. PDF export is not implemented.
4. Auth/account flow is not implemented (toolbar has placeholder sign-in action).
5. Some older scaffold files are still present and not part of the routed workflow:
   - `src/views/Configurator.vue`
   - `src/features/closet/views/Configurator.vue`
   - `src/components/HelloWorld.vue`
   - `src/stores/counter.ts`

## 12. Suggested next engineering priorities

1. Unify room source of truth (or synchronize schema room and room store explicitly).
2. Add backend implementation or mock server for `/api/quote`.
3. Complete export/share pipeline (PDF + link sharing).
4. Add automated tests for:
   - domain validators
   - part generation
   - store actions and history behavior
