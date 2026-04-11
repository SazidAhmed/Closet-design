# Floor Plan -> Design 3D Sync Snapshot

## Date
April 11, 2026

## Finalized Behavior
- Quick sidebar now exposes only two architecture actions: Add Door and Add Window.
- Added items are placed on the currently selected wall; if no wall is selected, fallback is first wall.
- Door/window size (width/height) is editable from selected-item controls in Floor Plan.
- Door/window dimensions are shown in 2D near each item label.
- Design view renders room context without closet/towers in the 3D viewport.
- Door/window items from Floor Plan are rendered on room walls in 3D with simple geometry.
- The open front side in 3D updates dynamically with camera angle.
- Door/window visuals now have depth and are visible from both interior and exterior viewpoints.

## Stability/Validation
- TypeScript and Vue checks pass.
- Full production build passes after changes.

## Follow-up
- If labels are still hard to spot in some camera states, consider migrating to 3D text meshes as a fallback to Html overlays.
