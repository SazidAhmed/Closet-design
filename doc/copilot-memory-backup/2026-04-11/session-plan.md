## Session Plan Snapshot (April 11, 2026)

### Completed
1. Simplified Floor Plan left sidebar actions to only Add Door and Add Window.
2. Updated architecture item placement to use the currently selected wall in quick mode.
3. Added quick-mode wall selection behavior on wall segments and badges.
4. Added selected-item size editor (width/height) for doors and windows in the left sidebar.
5. Added 2D on-canvas size labels for door/window items.
6. Updated Design 3D view to start as an empty room (removed closet/towers render in viewport).
7. Added simple 3D door/window rendering on room walls based on Floor Plan items.
8. Restored 3-wall open-room behavior in 3D and then made front wall selection dynamic based on camera angle.
9. Made door/window geometry visible from both inside and outside by using thin 3D depth and dual-side frame strips.
10. Added 3D wall number labels and improved visibility strategy.
11. Kept project compiling cleanly after each change (`npm run build` passes).

### Notes
- This backup captures the session deltas under `doc/copilot-memory-backup/2026-04-11`.
- Existing historical snapshots under 2026-04-04 and 2026-04-05 are unchanged.
