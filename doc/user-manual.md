# Closet Designer User Manual

## 1. What this app does

Closet Designer helps you plan a closet in four steps:

1. Select closet type
2. Build the room floor plan
3. Configure the closet in 3D
4. Review and export your design

## 2. Before you start

- Open the app and begin at the closet type page.
- Your work is saved automatically in your browser storage.
- Keyboard shortcuts are available for undo, redo, and save.

## 3. Main navigation

The app uses top and bottom bars on each page:

- Top bar: New, Open, Save, Undo, Redo, Share, and utility buttons
- Bottom bar: Back/Next step navigation, view mode toggle, unit toggle, and estimated price

## 4. Step-by-step guide

### Step 1: Select Closet Type

Choose one of these starting templates:

- Reach-In Closet
- Walk-In Closet
- Custom Layout

When you click a card, the app applies default room and closet values and moves you to Floor Plan.

### Step 2: Floor Plan

Use this page to define room size and architecture.

Room editing:

- Drag yellow corner handles to resize width and depth together
- Drag blue mid-wall handles to resize one axis at a time
- Click "Change Room Height" to set ceiling height

Add architecture:

- Use the left sidebar to add door, architecture, and wall decorator items
- Click an item to place it
- Drag placed items along walls to reposition them
- Select an item and click the red delete button to remove it

Room options:

- Use the right sidebar to set floor finish, wall color, and trim color
- Set architectural door options (door handle and door finish)

Continue:

- Click "Design Closet" in the footer to move to the 3D design step

### Step 3: Design Closet

Use this page to configure towers, materials, and components in 3D.

Left sidebar tabs:

- Auto Create: apply a preset tower layout
- Towers: add/remove towers, select a tower, move left/right, set tower depth and height
- Edit Components: set shelf, drawer, and shoe shelf counts for the selected tower

3D viewport:

- Drag to orbit in 3D mode
- Scroll to zoom
- Switch views with Overhead, Wall, and 3D buttons

Right sidebar options:

- Closet finish, backing, and handle style
- Room wall/floor/trim colors
- Live quote status and total

Validation:

- If dimensions are invalid, errors appear in the validation panel
- Quote requests are paused while blocking errors exist

Design slots:

- Click Save (top bar) to open the design slots dialog and save a named design
- Click Open (top bar) to load or delete previously saved designs

Continue:

- Click "Continue to Review" in the footer

### Step 4: Review

Use this page to inspect final design details.

You can review:

- Closet type and cabinet dimensions
- Tower-by-tower accessory details
- Room summary (shape, height, walls, placed items)

Export:

- Click "Download Design (JSON)" to download the current design file

## 5. Save, load, and auto-save

The app supports two save styles:

1. Auto-save/current working state in LocalStorage
2. Named design slots for multiple saved versions

Auto-save behavior:

- Changes are auto-saved with a short debounce (about 1.5 seconds)
- Press `Ctrl+S` (or `Cmd+S`) to trigger save immediately

## 6. Keyboard shortcuts

- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
- `Ctrl+S` / `Cmd+S`: Save

## 7. Units and view modes

Units:

- Use the footer unit toggle to switch between `cm` and `in`

View modes:

- Overhead: top-down view
- Wall: front elevation view
- 3D: free orbit perspective view

## 8. Troubleshooting

If something looks wrong:

1. Check the validation panel in Design Closet for dimension errors.
2. Use Undo/Redo to step back through recent edits.
3. Use Open to reload a saved design slot.
4. Refresh the page to restore the last auto-saved working state.

## 9. Current limitations

- Share and Submit for Quote buttons are currently placeholders.
- PDF export is not available yet.
- Sign In in the top bar is not connected to an account system yet.
