# Wall Length Resizing Implementation Plan

## 1. Objective

Implement a smart wall length resizing feature that preserves wall connectivity. When a user manually changes the length of a wall, the expansion or contraction behavior must dynamically adapt based on whether the wall is connected to other walls on one side, both sides, or neither.

## 2. Behavior Rules (From Video)

The direction a wall extends or retracts depends entirely on its connection state at either end.

1. **Wall connected on BOTH sides (e.g., closed room or internal wall attached to two walls)**

   - **Behavior**: The wall extends or retracts equally from both sides, pushing or pulling the connected structures along with it.
   - **Implementation**: Calculate the midpoint of the selected wall. The expansion/contraction happens outwards/inwards from this midpoint, moving both connected endpoints simultaneously by `deltaLength / 2`.
2. **Wall connected on ONE side (e.g., an open boundary wall)**

   - **Behavior**: The wall extends or retracts _only from the unconnected (free) side_. The connected side remains completely stationary.
   - **Implementation**: Identify the connected endpoint. That point becomes the fixed anchor. The length adjustment is applied entirely to the free endpoint along the wall's current angle.
3. **Wall NOT connected to anything (standalone wall)**

   - **Behavior**: Similar to rule #2, it behaves as if it has a default anchor. The wall extends from the free end.
   - **Implementation**: Fix the start point (the left/first point drawn) and extend/retract the end point along the angle.
4. **No Disconnections**

   - **Behavior**: In none of these scenarios does changing the length cause a connected wall to break away. The interconnected topology must always be preserved.

## 3. Implementation Steps

### Phase 1: Add Store Action

In `src/stores/useRoomStore.ts`, create a new action:
`resizeWallLength(wallId: string, newLengthCm: number)`

Inside this action:

1. Find the target wall and calculate `deltaLength = newLengthCm - currentLength`.
2. Use the existing `wallEndpointConnectivity(walls, index)` helper to determine if `startConnected` and/or `endConnected` are true.

### Phase 2: Branching Logic based on Connectivity

Implement the logic for the three scenarios:

**Branch A: Zero or One Side Connected (Free End Exists)**

- If `startConnected` is `false` and `endConnected` is `false`:
  - Anchor is `start`. Just update the `length` property (which automatically extends the free `end` point because the data model relies on `start + angle * length`).
- If `startConnected` is `true` and `endConnected` is `false`:
  - Anchor is `start`. Just update the `length` property.
- If `startConnected` is `false` and `endConnected` is `true`:
  - Anchor is `end`. Move the `start` point backwards along the angle by `deltaLength`, and then update the `length`.

**Branch B: Both Sides Connected**

- Anchor is the midpoint.
- Move the `start` point backwards by `deltaLength / 2` along the angle.
- Update the `length` property.
- We must recursively or rigidly translate the attached wall chains on both sides. We will reuse or adapt the existing `translateWallGroup` or topological translation helpers to push the connected walls outwards without breaking connections.

### Phase 3: Item Constraints

When the wall length changes, any doors or windows placed on that wall need their `positionAlongWall` re-evaluated or preserved relative to the changed side so they don't fall off the wall or jump unexpectedly.

### Phase 4: UI Hookup

In `src/features/closet/views/FloorPlan.vue`:

- Locate the Wall Length input handler.
- Replace the direct length mutation with a call to `roomStore.resizeWallLength(selectedWall.id, newLengthCm)`.

### Phase 5: Testing & Verification

- Run `npm test` to ensure existing geometry, pivot, and inside-side tests pass.
- Write new focused tests in the regression suite to explicitly assert the midpoint-expansion logic for closed walls and the anchor-expansion logic for boundary walls.
- Verify visually in the browser that connected walls translate flawlessly when a segment's length is modified.
