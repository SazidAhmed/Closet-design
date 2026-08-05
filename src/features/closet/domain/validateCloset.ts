// ---------------------------------------------------------------------------
// Closet validation — v2 (extended for towers + room)
// ---------------------------------------------------------------------------

import type { ClosetStateV2 } from './schema'
import { CABINET_CONSTRAINTS, TOWER_CONSTRAINTS, ACCESSORY_CONSTRAINTS } from './constraints'
import { getCategoryLimits, getCornerTotalDepth, MIN_CORNER_TOTAL_D_FOR_HANGING } from './closetCatalogs'

export type ViolationSeverity = 'error' | 'warning'

export type ClosetViolation = Readonly<{
  severity: ViolationSeverity
  code: string
  message: string
  path?: string
}>

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function inRange(n: number, min: number, max: number) {
  return n >= min && n <= max
}

export function validateCloset(state: ClosetStateV2): ClosetViolation[] {
  const v: ClosetViolation[] = []

  // ── Cabinet dimension checks ────────────────────────────────────────────

  const { width, height, depth, thickness } = state.cabinet

  if (!isFiniteNumber(width) || !inRange(width, CABINET_CONSTRAINTS.width.min, CABINET_CONSTRAINTS.width.max)) {
    v.push({
      severity: 'error',
      code: 'CABINET_WIDTH_OUT_OF_RANGE',
      path: 'cabinet.width',
      message: `Width must be between ${CABINET_CONSTRAINTS.width.min} and ${CABINET_CONSTRAINTS.width.max} cm.`,
    })
  }

  if (!isFiniteNumber(height) || !inRange(height, CABINET_CONSTRAINTS.height.min, CABINET_CONSTRAINTS.height.max)) {
    v.push({
      severity: 'error',
      code: 'CABINET_HEIGHT_OUT_OF_RANGE',
      path: 'cabinet.height',
      message: `Height must be between ${CABINET_CONSTRAINTS.height.min} and ${CABINET_CONSTRAINTS.height.max} cm.`,
    })
  }

  if (!isFiniteNumber(depth) || !inRange(depth, CABINET_CONSTRAINTS.depth.min, CABINET_CONSTRAINTS.depth.max)) {
    v.push({
      severity: 'error',
      code: 'CABINET_DEPTH_OUT_OF_RANGE',
      path: 'cabinet.depth',
      message: `Depth must be between ${CABINET_CONSTRAINTS.depth.min} and ${CABINET_CONSTRAINTS.depth.max} cm.`,
    })
  }

  if (
    !isFiniteNumber(thickness) ||
    !inRange(thickness, CABINET_CONSTRAINTS.thickness.min, CABINET_CONSTRAINTS.thickness.max)
  ) {
    v.push({
      severity: 'error',
      code: 'CABINET_THICKNESS_OUT_OF_RANGE',
      path: 'cabinet.thickness',
      message: `Thickness must be between ${CABINET_CONSTRAINTS.thickness.min} and ${CABINET_CONSTRAINTS.thickness.max} cm.`,
    })
  }

  // ── Inner volume sanity checks (warnings) ───────────────────────────────

  if (isFiniteNumber(width) && isFiniteNumber(thickness)) {
    const innerWidth = width - thickness * 2
    if (innerWidth <= 0) {
      v.push({
        severity: 'warning',
        code: 'INNER_WIDTH_NON_POSITIVE',
        path: 'cabinet.width',
        message: 'Thickness is too large relative to width; the interior width becomes non-positive.',
      })
    }
  }

  if (isFiniteNumber(height) && isFiniteNumber(thickness)) {
    const innerHeight = height - thickness * 2
    if (innerHeight <= 0) {
      v.push({
        severity: 'warning',
        code: 'INNER_HEIGHT_NON_POSITIVE',
        path: 'cabinet.height',
        message: 'Thickness is too large relative to height; the interior height becomes non-positive.',
      })
    }
  }

  if (isFiniteNumber(depth) && isFiniteNumber(thickness)) {
    const innerDepth = depth - thickness
    if (innerDepth <= 0) {
      v.push({
        severity: 'warning',
        code: 'INNER_DEPTH_NON_POSITIVE',
        path: 'cabinet.depth',
        message: 'Thickness is too large relative to depth; the interior depth becomes non-positive.',
      })
    }
  }

  // ── Tower checks ────────────────────────────────────────────────────────

  if (state.towers.length === 0) {
    v.push({
      severity: 'warning',
      code: 'NO_TOWERS',
      path: 'towers',
      message: 'No towers defined. Add at least one tower to your closet.',
    })
  }

  if (state.towers.length > TOWER_CONSTRAINTS.maxPerCloset) {
    v.push({
      severity: 'error',
      code: 'TOO_MANY_TOWERS',
      path: 'towers',
      message: `Maximum ${TOWER_CONSTRAINTS.maxPerCloset} towers allowed.`,
    })
  }

  // Sum of tower widths vs. inner cabinet width
  if (isFiniteNumber(width) && isFiniteNumber(thickness)) {
    const innerWidth = width - thickness * 2
    const totalTowerWidth = state.towers.reduce((sum, t) => sum + (Number(t.width) || 0), 0)
    const diff = Math.abs(totalTowerWidth - innerWidth)

    if (totalTowerWidth > innerWidth + 0.5) {
      v.push({
        severity: 'error',
        code: 'TOWERS_EXCEED_WIDTH',
        path: 'towers',
        message: `Total tower width (${totalTowerWidth.toFixed(1)} cm) exceeds available interior width (${innerWidth.toFixed(1)} cm).`,
      })
    } else if (diff > 1) {
      v.push({
        severity: 'warning',
        code: 'TOWERS_WIDTH_MISMATCH',
        path: 'towers',
        message: `Total tower width (${totalTowerWidth.toFixed(1)} cm) doesn't fill the interior width (${innerWidth.toFixed(1)} cm). Gap: ${diff.toFixed(1)} cm.`,
      })
    }
  }

  // Per-tower validation
  for (let i = 0; i < state.towers.length; i++) {
    const tower = state.towers[i]!
    const prefix = `towers[${i}]`

    if (!isFiniteNumber(tower.width) || !inRange(tower.width, TOWER_CONSTRAINTS.width.min, TOWER_CONSTRAINTS.width.max)) {
      v.push({
        severity: 'error',
        code: 'TOWER_WIDTH_OUT_OF_RANGE',
        path: `${prefix}.width`,
        message: `${tower.label}: width must be between ${TOWER_CONSTRAINTS.width.min} and ${TOWER_CONSTRAINTS.width.max} cm.`,
      })
    }

    if (tower.doorMode && tower.categoryCode) {
      let limits: ReturnType<typeof getCategoryLimits> | null = null
      try {
        limits = getCategoryLimits(tower.doorMode, tower.categoryCode)
      } catch {
        v.push({
          severity: 'error',
          code: 'TOWER_CATALOG_CATEGORY_UNKNOWN',
          path: prefix,
          message: `${tower.label}: catalog category is unknown.`,
        })
      }

      if (limits) {
        if (tower.catalogId === undefined) {
          v.push({
            severity: 'error',
            code: 'TOWER_CATALOG_MISSING',
            path: `${prefix}.catalogId`,
            message: `${tower.label}: active catalog ID is required for pricing.`,
          })
        }

        if (!inRange(tower.width, limits.minW, limits.maxW)) {
          v.push({
            severity: 'error',
            code: 'TOWER_CATALOG_WIDTH_OUT_OF_RANGE',
            path: `${prefix}.width`,
            message: `${tower.label}: width is outside the selected category range.`,
          })
        }

        if (!inRange(tower.depth, limits.minD, limits.maxD)) {
          v.push({
            severity: 'error',
            code: 'TOWER_CATALOG_DEPTH_OUT_OF_RANGE',
            path: `${prefix}.depth`,
            message: `${tower.label}: depth is outside the selected category range.`,
          })
        }

        if (!inRange(tower.height, limits.minH, limits.maxH)) {
          v.push({
            severity: 'error',
            code: 'TOWER_CATALOG_HEIGHT_OUT_OF_RANGE',
            path: `${prefix}.height`,
            message: `${tower.label}: height is outside the selected category range.`,
          })
        }

        const isCorner = tower.isCorner ?? (tower.cornerPosition === 'left' || tower.cornerPosition === 'right' || tower.cornerOrientation === 'left' || tower.cornerOrientation === 'right');
        if (isCorner) {
          // 1. Main cabinet depth must be 15" or 18"
          const depthValid = Math.abs(tower.depth - 15) < 0.5 || Math.abs(tower.depth - 18) < 0.5;
          if (!depthValid) {
            v.push({
              severity: 'warning',
              code: 'TOWER_CORNER_DEPTH_INVALID',
              path: `${prefix}.depth`,
              message: `${tower.label}: corner cabinet depth should be 15" or 18".`,
            })
          }

          // 2. Bridge dimensions must be present
          if (typeof tower.cornerBridgeWidth !== 'number') {
            v.push({
              severity: 'warning',
              code: 'CORNER_BRIDGE_MISSING',
              path: `${prefix}.cornerBridgeWidth`,
              message: `${tower.label}: corner cabinet is missing bridge dimensions. Set a Bridge Width to complete the corner assembly.`,
            })
          } else {
            // 3. Bridge depth must be 15" or 18"
            const bridgeDepth = tower.cornerBridgeDepth ?? tower.depth
            const bridgeDepthValid = Math.abs(bridgeDepth - 15) < 0.5 || Math.abs(bridgeDepth - 18) < 0.5
            if (!bridgeDepthValid) {
              v.push({
                severity: 'warning',
                code: 'CORNER_BRIDGE_DEPTH_INVALID',
                path: `${prefix}.cornerBridgeDepth`,
                message: `${tower.label}: corner bridge depth should be 15" or 18".`,
              })
            }

            // 4. Hanging categories require Total D ≥ 23"
            const isHanging = tower.categoryCode === 'CDH' || tower.categoryCode === 'CLH'
            if (isHanging) {
              const totalD = getCornerTotalDepth(tower.depth, tower.cornerBridgeWidth)
              if (totalD < MIN_CORNER_TOTAL_D_FOR_HANGING) {
                v.push({
                  severity: 'error',
                  code: 'CORNER_TOTAL_DEPTH_TOO_SHALLOW',
                  path: `${prefix}.cornerBridgeWidth`,
                  message: `${tower.label}: hanging corner cabinets require Total D (Main D + Bridge W) ≥ ${MIN_CORNER_TOTAL_D_FOR_HANGING}". Current: ${totalD.toFixed(2)}".`,
                })
              }
            }
          }
        }
      }
    } else {
      v.push({
        severity: 'warning',
        code: 'TOWER_CATALOG_METADATA_MISSING',
        path: prefix,
        message: `${tower.label}: catalog metadata is missing; pricing may treat this as a legacy tower.`,
      })
    }

    // Validate accessories
    for (const acc of tower.accessories) {
      if (acc.type === 'shelf_set' && (acc.count < ACCESSORY_CONSTRAINTS.shelves.min || acc.count > ACCESSORY_CONSTRAINTS.shelves.max)) {
        v.push({
          severity: 'error',
          code: 'SHELF_COUNT_OUT_OF_RANGE',
          path: `${prefix}.accessories`,
          message: `${tower.label}: shelf count must be between ${ACCESSORY_CONSTRAINTS.shelves.min} and ${ACCESSORY_CONSTRAINTS.shelves.max}.`,
        })
      }

      if (acc.type === 'drawer' && (acc.count < 0 || acc.count > ACCESSORY_CONSTRAINTS.drawers.max)) {
        v.push({
          severity: 'error',
          code: 'DRAWER_COUNT_OUT_OF_RANGE',
          path: `${prefix}.accessories`,
          message: `${tower.label}: drawer count must be between 0 and ${ACCESSORY_CONSTRAINTS.drawers.max}.`,
        })
      }

      if (acc.type === 'shoe_shelf' && (acc.count < 0 || acc.count > ACCESSORY_CONSTRAINTS.shoeShelf.max)) {
        v.push({
          severity: 'error',
          code: 'SHOE_SHELF_COUNT_OUT_OF_RANGE',
          path: `${prefix}.accessories`,
          message: `${tower.label}: shoe shelf count must be between 0 and ${ACCESSORY_CONSTRAINTS.shoeShelf.max}.`,
        })
      }
    }
  }

  return v
}
