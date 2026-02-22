## Today

- Set up Vue Router and a dedicated `closet` feature module wired to `/closet`.
- Designed and implemented a versioned, JSON-safe closet domain schema (`schemaVersion: 1`) with `exportForBackend`.
- Added pure domain logic for validation (`validateCloset`) and cabinet part generation (`buildCabinetParts`) so the 3D layer stays dumb.
- Refactored the TresJS renderer (`Cabinet3D`) to render only from `parts[]` (panels + evenly spaced shelves).
- Integrated Tailwind v4 + shadcn-style UI primitives (`Button`, `Slider`) for the configurator sidebar.
- Built the Phase 1 configurator view with live sliders, validation panel, and JSON export.
- Defined a backend quote contract and wired a debounced quote flow (`/api/quote`) with a quote store and basic quote UI.

## Tomorrow

- Flesh out the domain model for future phases: bays/partitions, doors/drawers, and materials library (IDs + human labels).
- Add measurement overlays and camera presets (front/side/top) to improve 3D usability.
- Introduce basic presets (common cabinet sizes) and snapping rules for more realistic configurations.
- Start on a simple local save/load for designs (project JSON) to simulate the full 17Squares workflow before backend persistence.
- Begin documenting the JSON contract and domain rules for the backend team (pricing/BOM service).

