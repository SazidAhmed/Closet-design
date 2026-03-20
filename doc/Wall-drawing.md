# Wall Drawing Feature Documentation

## 1. Overview

This document explains the wall drawing feature implementation in the floor plan editor, including:

- Feature scope and UX behavior
- State model and data flow
- Store and view responsibilities
- Interaction patterns (start, continue, close, remove)
- Bug fixes completed during iterative development
- Current behavior, constraints, and known gaps

The implementation lives primarily in these modules:

- `src/features/closet/views/FloorPlan.vue`
- `src/stores/useRoomStore.ts`


## 2. Feature Goals

The wall drawing mode was implemented to support custom room geometry beyond fixed rectangular rooms.

Core goals:

1. Allow users to draw walls point by point on a 2D canvas.
2. Support visual editing and metadata updates after drawing.
3. Support adding walls to existing geometry.
4. Support deleting selected walls.
5. Keep drawing controls explicit so clicks do not accidentally reset geometry.
6. Preserve stable behavior after edge cases like deletion and continuation.


## 3. High Level UX

The feature has two room setup modes:

1. Quick Room
2. Draw Walls

In Draw Walls mode, users can:

1. Set wall height and default wall thickness.
2. Start fresh drawing.
3. Continue drawing from existing walls.
4. Select walls and edit properties.
5. Remove a selected wall.
6. Finish drawing with Escape.


## 4. Main Files and Responsibilities

## 4.1 `FloorPlan.vue`

Owns draw mode UI and interaction orchestration:

- Draw mode state flags (`isDrawing`, `isClosed`, etc.)
- SVG preview and indication line
- Click, mouse move, and keyboard handling
- Wall selection and property editing
- Remove wall action from sidebar
- Explicit action buttons (`Start Drawing`, `Add Wall`, `Clear & Redraw`)

## 4.2 `useRoomStore.ts`

Owns persistent wall data and mutations:

- Start draw session (`startDrawWalls`)
- Add wall segment (`addWallVertex`)
- Close polygon (`closeRoom`)
- Remove last wall (`removeLastWall`)
- Remove wall by id (`removeWall`)
- Update wall properties (`updateWallProps`)


## 5. Data and State Model

## 5.1 Wall Entity

Each wall segment stores:

- `id`
- `length`
- `position` (segment start point)
- `angle`
- `thickness`
- `label`
- `visible`

The wall end point is derived from start + angle * length.

## 5.2 Draw Mode State in View

Important view-level states:

- `floorPlanMode`: quick | draw
- `hasStartedDrawSession`: draw session visibility switch
- `isDrawing`: active drawing state
- `isClosed`: room marked complete
- `selectedWallId`: selected segment id
- `selectedWallAnchor`: nearest endpoint from clicked wall (used for Add Wall start)
- `pendingStartVertex`: explicit start point for next segment
- `mousePos`: snapped cursor position


## 6. Interaction Flows

## 6.1 Start Drawing (fresh)

1. User clicks Start Drawing.
2. Store walls are cleared (`startDrawWalls`).
3. Drawing mode starts.
4. First click sets anchor (pending start), second click creates first actual segment.

Note: No zero-length placeholder segment is created.

## 6.2 Add Wall (continue existing)

1. User selects a wall.
2. User clicks Add Wall.
3. System records nearest endpoint of the clicked wall as `selectedWallAnchor`.
4. `pendingStartVertex` is seeded with this anchor.
5. First click places a segment starting from that anchor.

Fallback behavior if no wall selected:

- Continue from chain end.

## 6.3 Close / Finish Drawing

Two finish paths:

1. Geometric close: click near first vertex to call `closeRoom`.
2. Manual finish: press Escape to stop drawing without deleting walls.

## 6.4 Remove Wall

1. Select a wall.
2. Click Remove Wall.
3. `removeWall(wallId)` removes by id.
4. Labels are normalized (`1..n`).
5. Draw mode leaves closed state so user can continue editing.


## 7. SVG and Preview Behavior

## 7.1 Dual canvas conflict fix

Draw and quick canvases are mutually rendered by mode to avoid shared ref conflicts.

## 7.2 ViewBox stability

Draw viewBox auto-fits geometry with minimum bounds and padding.

Important stabilization:

- Before first point, avoid cursor-based auto-fit jumps.

## 7.3 Indication line origin

Preview line now prioritizes `pendingStartVertex` over chain end.

This ensures Add Wall preview starts from selected wall anchor, not unrelated first wall points.


## 8. Key Problems Solved During Implementation

This section summarizes the iterative fixes that were implemented.

## 8.1 Default room visible in Draw Walls

Problem:

- Entering Draw Walls showed default rectangular room before user started drawing.

Fix:

- Added session gate (`hasStartedDrawSession`) so draw geometry renders only after drawing starts.

## 8.2 Height and thickness controls visibility

Problem:

- Inputs were not always visible after completion.

Fix:

- Moved controls outside close/open conditional so they stay visible in Draw Walls mode.

## 8.3 Wrong wall count and labels (first segment started at 2)

Problem:

- First click was counted as a fake segment.

Fix:

- First click now sets anchor only.
- First real segment starts on second click and gets label 1.

## 8.4 Canvas appeared to disappear after Start Drawing

Problem:

- Auto-fit and cursor behavior caused visual jump.

Fix:

- Stabilized bounds and cursor contribution before first anchor.

## 8.5 Remove wall action initially unreliable

Problem:

- Sidebar action did not always remove as expected.

Fix:

- Hardened click handling and ensured state transitions after removal.
- Added store-level remove by id and label normalization.

## 8.6 Add Wall button missing after deletion

Problem:

- Add Wall was only shown in closed state.

Fix:

- Show Add Wall when walls exist and drawing is not active.

## 8.7 Add Wall started from wrong point after edits

Problem:

- Continuation could incorrectly start from first-wall corner.

Fix:

- Captured nearest endpoint from selected wall click.
- Used anchor as pending start for Add Wall.

## 8.8 Escape key removed walls instead of finishing

Problem:

- Escape performed undo-like behavior.

Fix:

- Escape now exits drawing mode cleanly.

## 8.9 Canvas click auto-started drawing unexpectedly

Problem:

- Clicking canvas after deletion could create unintended walls from old points.

Fix:

- No implicit drawing from canvas click.
- User must explicitly click Start Drawing or Add Wall.


## 9. Store API Changes

Added or updated behavior in `useRoomStore`:

1. `addWallVertex(x, y, thickness, firstStart?)`
	- Accepts optional explicit start point.
	- Supports continuation from selected wall endpoint.
	- Guards against tiny segments.

2. `closeRoom(thickness?)`
	- Closing segment uses selected thickness.

3. `removeWall(wallId)`
	- Removes by id.
	- Reassigns default numeric labels.


## 10. Current UX Rules (Final)

1. Draw actions are explicit.
	- Canvas click alone does not start drawing.

2. Fresh flow:
	- Start Drawing -> click anchor -> click next point to create first segment.

3. Continue flow:
	- Select wall -> Add Wall -> first click creates segment from selected wall endpoint.

4. Finish flow:
	- Click near first point to close polygon, or press Escape to finish without closing.

5. Edit flow:
	- Select wall -> edit label/length/thickness/visibility or remove wall.


## 11. Validation

Validation performed repeatedly after each major update:

1. File-level error checks on modified files.
2. Full project build (`npm run build`).

No TypeScript or build-blocking errors remained after each accepted change.


## 12. Known Limitations and Future Improvements

Current limitations:

1. Continuation anchors to nearest endpoint of selected wall, not arbitrary point along wall length.
2. Removing walls does not yet enforce polygon topology constraints.
3. Self-intersections are not prevented.

Suggested next improvements:

1. Add an explicit Finish Drawing button in sidebar.
2. Add optional confirm dialog for Remove Wall.
3. Add vertex handle editing and snapping to existing vertices.
4. Add intersection detection and warning for invalid room shapes.


## 13. Summary

The wall drawing feature has evolved from a basic point-to-point draw mode into a controlled editing workflow with:

- explicit draw activation,
- stable visual feedback,
- accurate segment count/labeling,
- removable and editable walls,
- continuation from selected wall anchors,
- and predictable finish behavior.

This makes custom room layout editing significantly more robust for real-world user flows.


## 14. Porting Guide (Use This In Another Application)

This section is written to make the feature reproducible in a new codebase with minimum ambiguity.

If a future project has a different framework or state library, keep the same behavior contract and state machine. The exact UI toolkit can change.

## 14.1 Mandatory Behavior Contract

A correct implementation must satisfy all of these:

1. Canvas click must not start drawing by itself.
2. Drawing starts only from explicit actions:
	- Start Drawing (fresh), or
	- Add Wall (continue).
3. First click in fresh drawing sets anchor only; no wall created yet.
4. First real segment must be label 1.
5. Add Wall must start from selected wall anchor (nearest clicked endpoint).
6. Escape must finish drawing mode, not undo/delete geometry.
7. Remove Wall removes only selected segment and preserves remaining geometry.
8. After remove, Add Wall remains available when walls still exist.
9. Preview/indication line must originate from pending start vertex when present.
10. Closing by first point is optional; user can also finish manually with Escape.

If one item fails, user interaction becomes confusing quickly.

## 14.2 Minimal State Machine

Use the following states in any framework:

1. `idle`
	- not drawing
2. `drawing`
	- accepting points
3. `closed`
	- geometry marked complete, but editable

Additional runtime flags:

1. `pendingStartVertex: Vec2 | null`
2. `selectedWallId: string | null`
3. `selectedWallAnchor: Vec2 | null`

State transitions:

1. `idle -> drawing` via Start Drawing or Add Wall
2. `drawing -> closed` via close-to-first action
3. `drawing -> idle` via Escape
4. `closed -> drawing` via Add Wall
5. `closed -> closed` after wall property edits
6. `closed -> idle` only if all walls removed

## 14.3 Geometry Contract

Represent each wall as start point + angle + length. Do not store end point as independent source of truth.

Derived values:

1. `end = start + direction(angle) * length`
2. Wall midpoint for labels
3. Polygon points for thick wall rendering

Rules:

1. Segment length `< 1` should be ignored.
2. Thickness should be clamped to safe bounds.
3. Length and thickness inputs should be sanitized before persisting.

## 14.4 Store/API Interface To Replicate

Even in another app, provide equivalent methods:

1. `startDrawWalls()`
2. `addWallVertex(x, y, thickness, explicitStart?)`
3. `closeRoom(thickness?)`
4. `removeLastWall()` (optional convenience)
5. `removeWall(wallId)`
6. `updateWallProps(wallId, props)`
7. `setRoomFromWalls(walls)` (useful for fallback/replace flows)

Key requirement:

- `addWallVertex` must accept an explicit start for Add Wall continuation.

## 14.5 UI Control Contract

Draw Walls sidebar should always expose:

1. Wall Height input
2. Wall Thickness input
3. Start Drawing
4. Add Wall (shown when walls exist and not actively drawing)
5. Clear & Redraw

When a wall is selected:

1. Label
2. Length
3. Height
4. Thickness
5. Visible
6. Remove Wall

## 14.6 Event Handling Rules

Mouse:

1. `selectWall` captures wall id and nearest endpoint anchor.
2. Draw-canvas click:
	- if not in drawing mode: ignore
	- if pending start exists: first click creates segment from that start
	- else: normal append or close-near-first logic

Keyboard:

1. Escape while drawing:
	- stop drawing
	- clear pending anchor
	- keep existing walls unchanged

## 14.7 Common Failure Modes To Test

Always test these scenarios in a new app:

1. Enter draw mode: no pre-rendered default walls unless explicitly started.
2. First segment label starts at 1.
3. Remove one wall from closed shape, then Add Wall still visible.
4. Select wall 2, Add Wall, verify first new segment starts at wall 2 anchor.
5. Preview line origin matches pending start, not chain start.
6. Escape does not delete walls.
7. Canvas click in idle draw mode does not start or reset drawing.
8. Deleting one wall does not wipe all walls.

## 14.8 Porting Checklist

Use this checklist when implementing in another codebase:

1. Implement wall data model and geometric helpers.
2. Implement store actions listed in section 14.4.
3. Build draw state machine from section 14.2.
4. Implement explicit Start Drawing and Add Wall controls.
5. Add selected-wall anchor capture logic.
6. Implement pending-start first-click behavior.
7. Implement close-near-first and Escape-to-finish.
8. Implement remove-wall and label normalization.
9. Implement preview-line origin priority (`pendingStartVertex` first).
10. Add automated or manual tests for section 14.7.

## 14.9 What To Read First In This Repository

When onboarding in this repo or reusing logic elsewhere, review in this order:

1. `src/stores/useRoomStore.ts`:
	- wall mutation primitives and geometry persistence rules
2. `src/features/closet/views/FloorPlan.vue`:
	- interaction orchestration and draw-mode state machine
3. `doc/Wall-drawing.md`:
	- behavior contract and edge-case rationale

This order mirrors dependency direction and reduces confusion.

