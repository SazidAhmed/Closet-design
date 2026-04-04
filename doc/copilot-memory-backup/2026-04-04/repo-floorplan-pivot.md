- Floor plan pivot selection must be deterministic by inside-left endpoint; never derive anchor from click proximity.
- In FloorPlan wall selection, compute anchor with geometry (inside reference) and pass same anchor to setWallAngle.
- Draw-wall inside-side visual marker uses wall direction right-hand side in screen space; final UX uses a shadow area band (no green line) and remains independent from pivot-anchor selection logic.
- In FloorPlan angle edits, keep selected wall anchor type stable during interaction; do not recompute per step to avoid intermittent endpoint pivot flips.

