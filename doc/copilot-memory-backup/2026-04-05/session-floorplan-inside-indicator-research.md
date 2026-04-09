# Floor Plan Inside-Side Indicator: Current Outcome

## Date
April 5, 2026

## Finalized Behavior
- For placed walls, inside-side rendering follows polygon interior-side sampling (same rule used by pivot selection).
- For preview segment (during active drawing before placement), inside-side remains direction-based (right-hand side of segment direction).
- Inside shadow is a visual aid only; it does not use click proximity for pivot endpoint choice.

## Stability Notes
- Anchor endpoint type is stabilized during repeated angle edits.
- View and store pivot decisions are aligned to avoid "shadow says inside A, pivot uses B" mismatches.

## Regression Status (recent)
- floorPlan pivot integration tests are passing after latest UI/doc updates.
