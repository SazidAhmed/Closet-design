# AGENTS.md - Closet Project Source Of Truth

This file defines how AI coding agents must operate in this repository.
If this file conflicts with older docs or planning notes, trust this file and current source code.

## 1. Project Snapshot

What this app is:
- A Vue 3 closet design app with a 4-step flow:
  - Select type
  - Floor plan
  - Design closet (3D)
  - Review/export

Current route flow:
- / redirects to /closet/type
- /closet/type
- /closet/floorplan
- /closet/design
- /closet/review

Core stack in active code:
- Vue 3 + TypeScript + Vite
- Pinia (Options stores are currently used in this repo)
- TresJS + Three.js for 3D
- SVG-based 2D floor plan interactions (not Konva at this time)
- Tailwind + custom component styles
- Vitest for tests

Important: do not reintroduce removed specs/docs content from deleted folders or old design frameworks.

## 2. Grounded Architecture (Current)

Primary implementation folders:
- src/features/closet/views: step pages (SelectClosetType, FloorPlan, DesignCloset, ReviewPage)
- src/features/closet/domain: domain types, constraints, schema, geometry helpers, presets
- src/stores: app, room, closet, history, selection
- src/features/closet/stores: quote store
- src/components: shared UI + 3D scene pieces
- tests: floor plan geometry and pivot/rotation regression suite

Legacy or draft docs may exist under doc/, but code and tests are authoritative.

## 3. State Ownership Contracts

Use these boundaries when adding or changing logic.

useAppStore:
- current step
- view mode (overhead | wall | 3d)
- units (cm | in)

useRoomStore:
- room shape and wall geometry
- placed room items (door/window/architecture decorators)
- room colors/finishes
- closet offsets (x/y/z)
- wall drawing, closure, and wall-angle rotation behavior

useClosetStore:
- closet schema v2 state
- cabinet dimensions
- towers and accessories
- closet materials and door options
- schema export and validation getters

useSelectionStore:
- selected IDs for tower/item/wall

useHistoryStore:
- undo/redo snapshots (closet + room)
- localStorage autosave and load
- named design slots

useQuoteStore:
- debounced quote requests
- request cancellation and stale response guards

Cross-store rule:
- Reads across stores are fine.
- Mutations should happen through the owning store action.

## 4. Canonical Domain Models

Closet state source:
- src/features/closet/domain/schema.ts

Key types:
- Room/Wall/PlacedItem: src/features/closet/domain/types/room.ts
- Tower/Accessory: src/features/closet/domain/types/tower.ts
- Material and door options: src/features/closet/domain/types/material.ts

Schema versioning:
- Current schema version is 2.
- Keep migration compatibility with v1 via migrateV1toV2.

## 5. Units And Coordinate Rules

Storage baseline:
- Internal geometry and dimensions are treated as centimeters.

Display units:
- UI can display cm or inches using useUnit composable.
- Convert only at input/output boundaries.

Floor-plan geometry:
- 2D editor runs in SVG plan coordinates.
- Wall segments are represented by start position + angle + length.

3D scene:
- Room3D derives walls directly from roomStore wall segments.

Never mix unit conversion ad hoc in random components.

## 6. Floor Plan Contract (High Priority)

The FloorPlan and room rotation logic are the most regression-sensitive area.

Drawing workflow rules:
- Drawing starts only via explicit actions (Start Drawing or Add Wall).
- Canvas click alone must not implicitly start a draw session.
- First click in a fresh session sets pending start anchor; next click creates first segment.
- New segments use snapped 45-degree direction behavior (store-level snapped45Segment logic).
- Closing should create one final segment back to first vertex.
- Escape ends active drawing mode without deleting existing walls.

Wall editing rules:
- Remove wall by ID.
- Renumber labels sequentially after deletion.
- Ensure at least one closet wall remains flagged (fallback to first wall when needed).

Inside-side / anchor rules:
- Pivot anchor selection is deterministic and click-independent for the same geometry state.
- Inside-side area and wall body selection must route through the same wall selection path.
- Keep selected anchor endpoint type stable during angle edits; do not recompute endpoint type every step.

Rotation dispatcher rules in useRoomStore.setWallAngle:
- Closed room: rotate entire room rigidly around inside-left pivot.
- Boundary wall where pivot endpoint is connected and opposite is free: local hinge rotation of selected wall.
- Other boundary case: rotate connected chain rigidly.
- Open + both-connected selected wall: one-side rigid chain rotation.
- Other open cases: fallback local translate/rebuild behavior.

When modifying any floor-plan geometry behavior:
- Update docs in doc/floor_plan/ as needed.
- Add or update tests first or with the same PR.

## 7. 3D Scene Contract

Room3D behavior:
- Uses roomStore wall segments as source of truth for room walls.
- Computes room bounds from all wall endpoints.
- Hides front-most wall relative to camera direction for cutaway visibility.
- Renders wall labels and wall openings from roomStore items.

Camera behavior:
- CameraRig/useCameraAnimation controls smooth transitions between view presets.
- Do not break ViewModeToggle contract (overhead/wall/3d).

Texture behavior:
- useTextureCache caches both procedural and URL textures.
- Do not create duplicate loaders or per-frame texture allocations.

## 8. Persistence, History, And Export

History model:
- Snapshot-based undo/redo stores JSON strings of closet + room states.
- MAX_HISTORY is finite; avoid creating extra noisy records when replaying.

Persistence:
- localStorage keys:
  - closet-design-save
  - closet-design-slots
- Autosave is debounced (1.5 seconds).

App startup behavior:
- App loads from localStorage on mount, starts watchers, and binds Ctrl/Cmd shortcuts.

Export:
- Review page currently supports JSON download of closet export payload.

## 9. Quote Pipeline Contract

Quote request source:
- payload generated from closet exportForBackend.

Quote behavior:
- Debounced scheduling (latest payload wins).
- Abort in-flight request when superseded.
- Ignore late stale responses.
- Clear quote when blocking validation errors exist.

Do not introduce quote calls directly from random components without store scheduling.

## 10. Testing And Verification

Primary tests:
- tests/drawWallAngles.test.ts
- tests/insideWallSide.test.ts
- tests/roomRotation.test.ts
- tests/roomRotation.openBothConnected.test.ts
- tests/floorPlan.pivot.integration.test.ts

Test command:
- npm test

Environment note:
- In this workspace Vitest v3 does not support --runInBand. Use npm test (vitest run) without that flag.

Minimum verification per change:
- For floor-plan geometry/pivot/rotation changes: run relevant rotation + pivot tests.
- For broader store/domain changes: run full npm test.
- For app-level changes: run npm run build if touched files can affect compile output.

## 11. Implementation Rules For Agents

Before coding:
- Read the target file plus connected store/domain files.
- Search for existing helper before adding new utility logic.

While coding:
- Keep changes scoped to one behavior at a time.
- Preserve existing store ownership and action boundaries.
- Keep TypeScript strict-safe. Avoid any.
- Avoid template-embedded business logic; keep handlers/computed in script.

After coding:
- Run tests/build relevant to changed area.
- Summarize what changed, why, and what was verified.

## 12. Hard Stops

Do not:
- Reintroduce deleted spec frameworks or removed files into active implementation docs.
- Replace deterministic pivot logic with click-proximity logic.
- Recompute anchor endpoint type on every incremental angle update.
- Mutate another store's state directly from a component.
- Add unbounded watchers/timers without cleanup.
- Bypass quote debounce/abort safeguards.

## 13. Known Gotchas

- Floor-plan pivot behavior has history of endpoint flip regressions; keep anchor endpoint type stable during edits.
- Inside-side visual behavior and pivot selection must remain aligned for placed walls.
- Rotation viewport can appear to drift unless draw viewBox locking behavior is respected during rotate interactions.
- Open/boundary topology rotation rules differ from closed-room rigid rotation; do not collapse them into one generic path.
- Autosave and snapshot watchers can create noisy history if replay guards are removed.
- Vitest runInBand flag is unsupported here; use npm test.

## 14. Change Checklist

Before marking work done, confirm:
- I read related store + view + domain files.
- I followed existing architecture and store ownership.
- I updated/added tests for behavior-sensitive logic.
- I ran the relevant verification commands.
- I documented any new gotcha here when applicable.

## 15. Commit Convention

Format:
- type(scope): description

Suggested types:
- feat | fix | refactor | perf | docs | test | chore

Suggested scopes in this repo:
- floorplan | room-store | closet-store | quote | history | 3d | ui | routing | domain

Examples:
- fix(floorplan): keep selected anchor endpoint stable during repeated angle updates
- test(room-store): cover boundary hinge rotation when pivot endpoint is connected
- refactor(3d): reuse cached texture mapping for floor material

This document is living. Update it when behavior contracts or architecture materially change.

## 16. Agent Prompt Template

Use this template when assigning tasks to an AI coding agent in this repo.

Task:
- [One clear behavior change or fix]

Scope:
- In scope files/folders: [list concrete paths]
- Out of scope: [what must not be touched]

Behavior requirements:
- [Expected runtime behavior]
- [Edge cases to preserve]
- [Any UX or API contract to keep stable]

Implementation constraints:
- Follow store ownership rules in this file.
- Reuse existing helpers before adding new ones.
- Keep changes minimal and TypeScript-strict-safe.

Verification required:
- Run: [exact commands]
- Must pass: [specific tests, e.g. pivot/rotation suite]

Output format required from agent:
- Files changed + why
- Behavior summary
- Verification run + results
- Any risks/follow-ups

Example (floor-plan sensitive task):
- Task: Fix pivot endpoint flipping on repeated +1 degree rotation for open boundary wall.
- Scope: src/features/closet/views/FloorPlan.vue, src/stores/useRoomStore.ts, tests/floorPlan.pivot.integration.test.ts
- Verification: npm test

Template variant (UI-only task):
- Task: [UI behavior or layout change only]
- Scope: [specific view/component files only]
- Out of scope: stores/domain/math/business rules
- Behavior requirements:
  - Keep existing navigation and store APIs unchanged.
  - Keep unit display and formatting consistent with useUnit behavior.
  - Preserve ViewModeToggle and Footer/Top toolbar flows.
- Verification:
  - Run: npm run build
  - If interaction changed on floor plan UI: npm test
- Output:
  - Visual/interaction summary
  - Files changed + why
  - Build/test results

Template variant (store/domain refactor):
- Task: [single store/domain behavior refactor]
- Scope: [store + domain + directly related tests]
- Out of scope: unrelated views/styles/routes
- Behavior requirements:
  - Keep existing action signatures stable unless explicitly requested.
  - Preserve store ownership boundaries.
  - Maintain schema/export compatibility (v2 and migration path where relevant).
  - Do not weaken deterministic floor-plan pivot/rotation behavior.
- Verification:
  - Run: npm test
  - Run: npm run build (if touched files affect app compile/runtime)
  - Must pass: relevant rotation/pivot tests when room geometry logic changes
- Output:
  - API/behavior delta
  - Invariants preserved
  - Files changed + why
  - Verification results + residual risks