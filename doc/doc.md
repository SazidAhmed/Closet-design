# Project Overview

## Summary

This project is a Vite + Vue 3 + TypeScript application for designing closet layouts. It uses Pinia for state management, Tailwind CSS v4 for styling, and TresJS/Three.js for 3D rendering. The application is organized around a four-step user flow:

1. Select closet type
2. Edit floor plan
3. Design closet in 3D
4. Review and export

## Stack

- Vite
- Vue 3
- TypeScript
- Pinia
- Vue Router
- Tailwind CSS v4
- TresJS / Three.js
- Lucide Vue

Primary config files:

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/style.css`

## Routing

The active app flow is defined in `src/router/index.ts`.

Routes:

- `/` -> redirects to `/closet/type`
- `/closet/type` -> closet type selection
- `/closet/floorplan` -> floor plan editor
- `/closet/design` -> 3D closet configurator
- `/closet/review` -> review/export page

`src/App.vue` acts as a thin shell around the router and global history shortcuts. It wires:

- `Ctrl/Cmd + Z` -> undo
- `Ctrl/Cmd + Shift + Z` -> redo
- `Ctrl/Cmd + S` -> save

It also restores local saved state on mount and starts store watching for auto-save/history.

## Main Views

### 1. Select Closet Type

File: `src/features/closet/views/SelectClosetType.vue`

Responsibilities:

- Shows closet type cards for `reach_in`, `walk_in`, and `custom`
- Applies default room and cabinet settings from the selected type
- Updates the app step
- Navigates to floor plan

Uses:

- `useClosetStore`
- `useRoomStore`
- `useAppStore`
- `src/features/closet/domain/closetTypes.ts`

### 2. Floor Plan

File: `src/features/closet/views/FloorPlan.vue`

Responsibilities:

- Renders a 2D SVG floor plan
- Supports drag-to-resize room dimensions
- Lets users add architectural items such as doors, windows, columns, and wall decorators
- Lets users drag placed items along walls
- Lets users adjust room colors and some door options
- Uses shared toolbar/footer components

Main behaviors:

- Room width/depth are derived from room walls
- Resize handles update `useRoomStore`
- Item placement and movement update `useRoomStore`
- Toolbar actions connect to `useHistoryStore`

### 3. Design Closet

File: `src/features/closet/views/DesignCloset.vue`

This is the most complex screen in the project.

Responsibilities:

- Hosts the 3D viewport
- Manages auto-create presets
- Manages tower selection and ordering
- Edits tower accessories
- Applies finish/backing/handle choices
- Applies room finish/color choices
- Controls closet placement within the room
- Watches the closet payload and requests a quote

Main dependencies:

- `src/components/Cabinet3D.vue`
- `src/components/Room3D.vue`
- `src/components/CameraRig.vue`
- `src/components/TopToolbar.vue`
- `src/components/FooterBar.vue`
- `src/components/DesignSlotsDialog.vue`
- `src/features/closet/stores/useQuoteStore.ts`

### 4. Review

File: `src/features/closet/views/ReviewPage.vue`

Responsibilities:

- Displays a summary of closet settings
- Lists tower accessories
- Shows room summary
- Supports JSON export of the current design

This page is currently more of a summary/export screen than a full final review workflow.

## State Management

### `src/stores/useClosetStore.ts`

Owns closet configuration state:

- schema version
- closet type
- cabinet dimensions
- towers
- materials
- door options

Key capabilities:

- set closet type from presets
- add/remove/move towers
- edit tower dimensions
- set accessories
- export backend payload
- validate closet state
- reset to defaults

### `src/stores/useRoomStore.ts`

Owns room and floor plan state:

- room shape
- walls
- room height
- placed items
- room colors
- closet offsets inside the room

Key capabilities:

- replace the room
- resize room
- set room height
- add/remove/move placed items
- update room colors
- clamp closet position in 3D space

### `src/stores/useAppStore.ts`

Owns app-level UI state:

- current step
- current view mode
- units

### `src/stores/useSelectionStore.ts`

Owns transient UI selection state:

- selected tower
- selected placed item
- selected wall

### `src/stores/useHistoryStore.ts`

Owns undo/redo and persistence:

- undo stack
- redo stack
- auto-save debounce
- named design slots
- active design slot

Features:

- snapshot-based undo/redo
- localStorage save/load
- named save slots
- watched store recording

### `src/features/closet/stores/useQuoteStore.ts`

Owns quote request state:

- loading status
- error state
- latest result
- debounce timer
- abort controller

Features:

- debounced quote requests
- payload hashing
- aborting stale requests
- clearing quote state

## Domain Model

### Schema

File: `src/features/closet/domain/schema.ts`

Defines schema v2 for the configurator. Main state sections:

- units
- closet type
- room
- cabinet
- towers
- materials
- door options

Also includes:

- default state creation
- backend export shaping
- v1 -> v2 migration support

### Closet Types

File: `src/features/closet/domain/closetTypes.ts`

Defines:

- `reach_in`
- `walk_in`
- `custom`

Each type provides:

- default room factory
- default cabinet factory
- default tower factory

This file also defines auto-create presets used on the design page.

### Room Types

File: `src/features/closet/domain/types/room.ts`

Defines:

- walls
- room shape
- placed items
- room colors
- default room factories

### Tower Types

File: `src/features/closet/domain/types/tower.ts`

Defines:

- tower model
- accessory model
- default tower creation
- standard tower depth/height options

### Material Catalog

File: `src/features/closet/domain/materials/catalog.ts`

Defines seeded catalogs for:

- closet finish materials
- backing materials
- floor materials
- door materials
- handle styles
- wall colors
- trim colors

Includes helper lookups for material and handle IDs.

### Validation

File: `src/features/closet/domain/validateCloset.ts`

Validates:

- cabinet dimensions
- cabinet inner volume sanity
- tower counts
- total tower width vs cabinet width
- per-tower width
- accessory counts

Returns warnings and errors for the UI.

### Constraints

File: `src/features/closet/domain/constraints.ts`

Defines limits for:

- cabinet dimensions
- tower dimensions
- accessories
- room sizes

### Part Builder

File: `src/features/closet/domain/buildCabinetParts.ts`

Converts closet state into JSON-serializable 3D parts.

Builds:

- carcass panels
- back panel
- dividers
- shelves
- rods
- drawers
- shoe shelves

This is the bridge between state and rendering.

## Rendering Components

### `src/components/Cabinet3D.vue`

Responsibilities:

- Builds parts from closet state
- Resolves material colors/textures
- Renders panels, shelves, rods, drawers
- Positions the whole closet inside the room
- Adds simple measurement lines
- Adds decorative hanger props

### `src/components/Room3D.vue`

Responsibilities:

- Renders floor plane
- Renders room walls
- Renders trim pieces
- Applies room floor/wall/trim colors and textures

## Shared UI Components

### `src/components/TopToolbar.vue`

Shared top action bar with controls for:

- new
- open
- save
- undo
- redo
- share
- fullscreen
- settings
- help
- sign in

### `src/components/FooterBar.vue`

Shared footer navigation with:

- back button
- view mode toggle
- units toggle
- estimated price
- optional share button
- forward button

### `src/components/ViewModeToggle.vue`

Switches between:

- overhead
- wall
- 3d

### `src/components/DesignSlotsDialog.vue`

Provides named save/load slots backed by `useHistoryStore`.

## Styling

Global styling lives in `src/style.css`.

Current visual direction:

- dark workspace UI
- Tailwind imported globally
- custom CSS variables for theme tokens
- custom scrollbar and selection styling

Most screens also use large scoped style blocks directly inside each Vue SFC.

## Documentation Files

The most useful project docs are under `doc/`:

- `doc/implementation-plan.md`
- `doc/mvp.md`
- `doc/documentation.md`
- `doc/user-manual.md`

Note:

- `README.md` is still the default Vite starter README and does not describe the actual product.

## Notable Findings

### 1. There is a mix of current and older structure

The routed app uses the `src/features/closet/...` views, but the repo also contains older or duplicate files such as:

- `src/views/Configurator.vue`
- `src/features/closet/views/Configurator.vue`

These do not appear to be part of the current routed flow.

### 2. Starter/template leftovers still exist

Files such as:

- `src/components/HelloWorld.vue`
- `src/stores/counter.ts`

appear to be leftover Vue starter files rather than part of the product.

### 3. README is out of date

The root `README.md` still describes the default Vue/Vite template rather than this closet configurator.

### 4. Design page carries most product complexity

`src/features/closet/views/DesignCloset.vue` is currently the operational center of the application and contains a large amount of UI, state wiring, and feature logic in one file.

### 5. The floor plan and review flows are functional but lighter than the design flow

The floor plan page supports editing and placement, but the design page is much more developed. The review page is currently a concise summary/export page rather than a full review/reporting workflow.

## Current Mental Model

The project is best understood as a closet configurator with:

- a strong route-based flow
- a reasonably clear domain layer
- Pinia stores separating closet state, room state, app state, selection state, history state, and quote state
- a 3D rendering pipeline driven by derived parts from domain state

If this repo is going to be extended, the next likely areas of attention are:

- cleanup of duplicate/unused files
- splitting large view files into smaller components
- bringing the README in line with the actual application
- tightening the relationship between room state and closet placement/routing
