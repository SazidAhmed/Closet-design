# Closet Configurator — TODO

## Priority 1 — Floor Plan Interactivity

- [ ] Drag-to-resize walls via corner & mid-wall handles
- [ ] Drag-and-drop architecture items (doors, columns, windows) from sidebar onto walls
- [ ] Place, reposition, and delete items on walls
- [ ] Change Room Height dialog (button exists, no dialog yet)
- [ ] Show placed items in the SVG canvas with correct positioning

## Priority 2 — View Modes

- [ ] Differentiate Overhead / Wall / 3D views (toggle UI exists, all show the same view)
- [ ] Wall view — orthographic front elevation of the closet
- [ ] Overhead view — top-down 2D representation
- [ ] Camera presets with animated transitions between views

## Priority 3 — 3D Viewport Enhancements

- [ ] Measurement overlays in 3D (dimension labels on parts)
- [ ] Tower drag-and-reorder in Design Closet
- [ ] Props (decorative items: clothes on rods, shoes on shelves, bags, etc.)
- [ ] Texture support — load real wood/fabric textures from `textureUrl` in catalog

## Priority 4 — Persistence & History

- [ ] Save/load designs to localStorage
- [ ] Undo/redo history stack (Ctrl+Z / Ctrl+Shift+Z)
- [ ] Auto-save on state change with debounce

## Priority 5 — Units & Measurements

- [ ] Units toggle (cm ↔ inches) throughout entire UI
- [ ] All dimension labels, sliders, and inputs respect selected unit
- [ ] Input fields with unit suffixes (e.g. `72"` or `183 cm`)

## Priority 6 — Export & Sharing

- [ ] PDF export with design summary, dimensions, and rendered preview
- [ ] Share Design — generate shareable link or copy to clipboard
- [ ] Submit for Quote — connect to real backend endpoint

## Priority 7 — Auth & Backend

- [ ] User authentication (Sign In / Sign Up)
- [ ] Save designs to user account (cloud persistence)
- [ ] Order history & quote tracking
