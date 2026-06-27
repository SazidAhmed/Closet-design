# Clearance Calculation — Reference & Bug History

This document explains how left/right clearance is calculated for a selected tower
in `BuildCloset.vue`, and records each bug that was found and fixed.

---

## How Clearance Works

For a selected tower on a wall, clearance is the usable empty space on each side:

- **Left clearance** — space between the tower's left edge and the nearest obstacle to the left
- **Right clearance** — space between the tower's right edge and the nearest obstacle to the right

Obstacles that restrict the effective boundary (in priority order):

1. **Wall corner margins** — connected perpendicular walls consume `wall.thickness / 2` from each end
2. **Doors / windows** — openings on the same wall push the boundary inward if they vertically overlap the tower
3. **Towers on adjacent connected walls** — a tower whose depth protrudes into the room blocks corner space on the current wall
4. **Other towers on the same wall** — towers to the left/right of the selected tower

### Gap Scale

Because wall-thickness corner margins are absorbed into the display (the user sees "0" when flush
against the corner, not "3 cm"), a `gapScale` is applied so the display satisfies the invariant:

```
leftClearance + towerWidth + rightClearance = displayWidth
```

where `displayWidth` depends on what is blocking each end (see Bug #3 below for the full formula).

---

## Bug #1 — Per-Tower Scale Caused Same Gap to Display Differently

### Symptom

With two towers (D1, D2) on the same wall (width = 100), D1 left clearance = 10:
- From D1's perspective: gap between D1 and D2 showed as **50.0**
- From D2's perspective: the same gap showed as **50.4**

### Root Cause

The scale factor (`nominalSlideRange / slideRange`) was computed separately for each tower
using only that tower's local effective boundaries. D2's scaling ratio treated
`effectiveLeft - startMargin` as its nominal boundary even when the boundary was set by
another tower (not the wall corner), inflating its nominal range by `startMargin = 3 cm`.

### Fix

Replace per-tower scale with a single **global gap scale**:

```
gapScale = totalNominalGap / totalPhysicalGap
         = (wall.length - Σ tower widths) / (physicalUsable - Σ tower widths)
```

This single scale applies to all gaps on the wall so the same physical gap always maps
to the same nominal value regardless of which tower is selected.

**Invariant verified:**
```
Wall_width - (D1_width + D1_left) - (D2_width + D2_right) = D2_left
100 - (20 + 10) - (20 + 0) = 50 ✓
```

---

## Bug #2 — Adjacent Wall Tower Depth Not Blocking Corner Space

### Symptom

With a tower (Drawers 2, depth = 20) on an **adjacent** wall flush at the corner,
the current wall's corner space was not reduced. Placing a tower into that corner
would cause a physical collision that the UI did not prevent or reflect.

### Root Cause

The clearance calculation only checked doors, windows, and same-wall towers.
It did not account for towers on perpendicular connected walls whose depth
protrudes into the room and physically occupies corner space on the current wall.

### Fix

Added **section 3** to the `clearances` computed in `BuildCloset.vue`:

1. Find all towers on adjacent connected walls.
2. For each such tower, compute its distance from the shared corner.
3. If `distFromCorner ≤ selectedTower.depth`, the adjacent tower's depth blocks the corner:
   - Push `effectiveLeft` inward by `otherTower.depth + otherWall.thickness / 2` (start corner)
   - Push `effectiveRight` inward by the same amount (end corner)

**Example verified:**
```
Wall = 100, adjacent tower depth = 20 (flush at corner)
effectiveLeft = 20 + 3 = 23
Available nominal space = 100 - 20 = 80
Tower width = 20, flush left → right clearance = 80 - 20 = 60 ✓
```

---

## Bug #3 — Adjacent Tower Depth Hidden from Nominal Display (Wrong Right Clearance)

### Symptom

With three towers in a 100 × 100 room:

| Tower    | Wall          | Width | Depth | Position     |
|----------|---------------|-------|-------|--------------|
| Drawer 1 | Left wall (4) | 20    | 20    | Flush bottom |
| Drawer 2 | Bottom wall (3) | 20  | 20    | Flush left   |
| Drawer 3 | Top wall (1)  | 20    | 20    | Top-right    |

Selecting **Drawer 2**, expected right clearance:

```
wall.length − Drawer2.width − Drawer1.depth = 100 − 20 − 20 = 60
```

But the UI showed **Right = 80**.

### Root Cause

The `nominalGlobalLeft` / `nominalGlobalRight` boundary calculation incorrectly treated
an adjacent tower's **depth** the same as a wall corner thickness.

The old logic used a boolean flag (`startCornerBlocked`) and mapped the nominal boundary
to `0` (or `wall.length`) regardless of whether the blockage was from wall thickness alone
or from a tower's physical depth. This made the adjacent depth invisible to the gap scale,
inflating `totalNominalGap` and therefore inflating the displayed right clearance.

**Old (incorrect) math:**
```
nominalGlobalLeft  = 0          (startCornerBlocked → treated as wall edge)
nominalGlobalRight = 100        (endConnected → treated as wall edge)
nominalUsable      = 100
totalNominalGap    = 100 − 20 = 80
totalPhysicalGap   = 74 − 20  = 54
gapScale           = 80 / 54  ≈ 1.481
rawRight           = 54
uiRight            = 54 × 1.481 ≈ 80  ← wrong
```

### Fix

Replaced the boolean flags `startCornerBlocked` / `endCornerBlocked` with numeric
trackers `startAdjacentDepth` / `endAdjacentDepth`.

The nominal boundary now distinguishes between the two kinds of blockage:

| Blockage source               | Nominal boundary             |
|-------------------------------|------------------------------|
| Wall corner thickness only    | `0` or `wall.length` (absorbed) |
| Adjacent tower depth          | `depth` or `wall.length − depth` (counted as real space) |

```ts
// Old
const nominalGlobalLeft  = isLeftWall  ? 0           : globalEffectiveLeft;
const nominalGlobalRight = isRightWall ? wall.length : globalEffectiveRight;

// New
const nominalGlobalLeft  = isLeftWallOnly  ? 0                          : startAdjacentDepth;
const nominalGlobalRight = isRightWallOnly ? wall.length               : wall.length - endAdjacentDepth;
```

**Display invariant now satisfied:**
```
leftClearance + towerWidth + rightClearance = wall.length − startAdjacentDepth − endAdjacentDepth
```

**Verified math for the reported scenario:**
```
nominalGlobalLeft  = startAdjacentDepth = 20
nominalGlobalRight = wall.length        = 100
nominalUsable      = 100 − 20          = 80
totalNominalGap    = 80 − 20           = 60
totalPhysicalGap   = 74 − 20           = 54
gapScale           = 60 / 54          ≈ 1.111
rawRight           = effectiveRight(97) − towerRight(43) = 54
uiRight            = 54 × 1.111        ≈ 60 ✓

leftClearance(0) + width(20) + rightClearance(60) = 80 = 100 − 20 ✓
```

### File Changed

`src/features/closet/views/BuildCloset.vue` — `clearances` computed (section 5, lines ~387–412)

---

## Invariant Summary

| Scenario                              | Display invariant                                               |
|---------------------------------------|-----------------------------------------------------------------|
| No adjacent blocking towers           | `L + W + R = wall.length`                                      |
| Adjacent tower blocks start corner    | `L + W + R = wall.length − startAdjacentDepth`                 |
| Adjacent tower blocks end corner      | `L + W + R = wall.length − endAdjacentDepth`                   |
| Adjacent towers block both corners    | `L + W + R = wall.length − startAdjacentDepth − endAdjacentDepth` |

---

## Bug #4 — Elevation View Mismatch Between Visuals, Labels, and Physical Constraints

### Symptom

In the Elevation view for a wall with an adjacent tower, two issues occurred sequentially during fixing:
1. The "Blocked Left/Right" label initially showed `1.1811"` (the wall's corner half-thickness) instead of the actual adjacent tower depth (e.g. `20.0"`).
2. Changing the visual hatched zone's width to exactly `20.0"` created a visible `1.18"` gap between the tower and the hatched zone when the tower was pushed fully into the corner, and caused the Clearance fields in `BuildCloset.vue` to report `61.2295` instead of `60.0`.

### Root Cause

The underlying problem was a conflict between **physical constraints** and **user-facing labels**.

Physically, the wall geometry uses centerlines. The usable space starts after the wall's inner face (at `wall.thickness / 2`). An adjacent tower's depth extends *from that inner face*. Thus, the total physically blocked dimension from the wall centerline is `adjacentTower.depth + wall.thickness / 2` (e.g. `20 + 1.18 = 21.18"`).

When we shrank the SVG hatched zone and the `minLeftCm/maxRightCm` bounds to `20"`, we caused a physical mismatch with `BuildCloset.vue` (which correctly continued to enforce the `21.18"` constraint for collision avoidance). The gap was simply the wall's half-thickness (`1.18"`), but the mismatch broke the global gap scaling logic by creating mismatched nominal vs. physical usable boundaries.

### Fix

Decoupled the physical bounds calculation from the user-facing display label:

1. **Restored Physical Constraints**: 
   - `elevationHorizontalBoundsForWall` now computes margins as `adjDepth + wall.thickness/2`.
   - `adjacentTowerBlockedZones` now computes SVG hatched widths as `adjDepth + wall.thickness/2`.
   - This keeps `minLeftCm` and `maxRightCm` in absolute sync with `BuildCloset.vue` and removes the gap.
2. **Abstracted Display Labels**:
   - Both data structures now include a separate `labelCm` variable (set exactly to `adjDepth`).
   - The Wall Context panel ("Blocked Left/Right") and the SVG `<text>` elements now render `labelCm` instead of the physical dimension.

This allows the UI to show the user exactly the number they expect ("20.0") while the app enforces the mathematically rigorous physical bounds ("21.18") for dragging and SVG alignment.

### Files Changed

`src/features/closet/views/FloorPlan.vue` — `ElevationHorizontalBoundsCm`, `adjacentTowerBlockedZones`, and `elevationHorizontalBoundsForWall`.
