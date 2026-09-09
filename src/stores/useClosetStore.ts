// ---------------------------------------------------------------------------
// Closet store — v2 (towers, accessories, materials)
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import {
  createDefaultClosetState,
  exportForBackend,
  type ClosetStateV2,
  type CabinetDimensions,
} from '../features/closet/domain/schema'
import { validateCloset } from '../features/closet/domain/validateCloset'
import { snapTo16th } from '../features/closet/domain/snapUtils'
import type { Tower, Accessory, CornerPosition } from '../features/closet/domain/types/tower'
import { createDefaultTower, createTowerId } from '../features/closet/domain/types/tower'
import {
  clampTowerDepth,
  clampTowerHeight,
  clampTowerWidth,
  clampBridgeDepth,
  createTowerFromCategory,
  isOneBoxAvailable,
  loadCatalogCategories,
  refreshBridgeCabinetForTower,
  refreshTowerCabinet,
  refreshTowerCatalog,
  setActiveCategories,
  type ClosetCatalogCategory,
  type ClosetCatalogCategoryCode,
  type ClosetDoorMode,
} from '../features/closet/domain/closetCatalogs'
import type { ClosetMaterials, ArchitecturalDoorOptions } from '../features/closet/domain/types/material'
import type { ClosetTypeName } from '../features/closet/domain/closetTypes'
import { getClosetType } from '../features/closet/domain/closetTypes'

type ClosetStoreState = ClosetStateV2 & {
  /** Live catalog categories loaded from the backend (both door modes). */
  catalogCategories: ClosetCatalogCategory[]
  /** Custom parts from the database */
  customParts: any[]
  /** Whether catalog data is currently being fetched from the API. */
  catalogsLoading: boolean
}

export const useClosetStore = defineStore('closet', {
  state: (): ClosetStoreState => ({
    ...createDefaultClosetState(),
    catalogCategories: [],
    customParts: [],
    catalogsLoading: false,
  }),

  getters: {
    exportForBackend: (state) => exportForBackend(state),
    violations: (state) => validateCloset(state),
    towerById: (state) => (id: string) => state.towers.find((t) => t.id === id),
    totalTowerWidth: (state) => state.towers.reduce((sum, t) => sum + (Number(t.width) || 0), 0),
    innerCabinetWidth: (state) => Math.max(0, state.cabinet.width - state.cabinet.thickness * 2),
    /** Catalog categories filtered by door mode — from live API or static fallback. */
    catalogCategoriesForMode: (state) => (doorMode: ClosetDoorMode) =>
      state.catalogCategories.filter((c) => c.doorMode === doorMode),
    /** @deprecated Backward compat: shelf count from first tower's shelf_set accessory. */
    shelves: (state): number => {
      const firstTower = state.towers[0]
      if (!firstTower) return 0
      const shelf = firstTower.accessories.find((a) => a.type === 'shelf_set')
      return shelf && shelf.type === 'shelf_set' ? shelf.count : 0
    },
  },

  actions: {
    // ── Catalog loading ───────────────────────────────────────────────────
    /**
     * Fetch catalog categories from the backend API for both door modes.
     * Persists categories in Pinia memory state and localStorage so the API is called ONCE.
     * Subsequent calls load from memory/localStorage and make 0 network requests.
     */
    async loadCatalogs(forceRefresh = false) {
      const CACHE_KEY = 'closet-catalog-categories-cache-v5'

      // 1. If already in Pinia memory state and not forcing refresh -> skip network request completely
      if (this.catalogCategories.length > 0 && !forceRefresh) {
        setActiveCategories(this.catalogCategories)
        return
      }

      // 2. Check localStorage cache if not forcing refresh
      if (!forceRefresh) {
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY)
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as ClosetCatalogCategory[]
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[useClosetStore] Loaded catalog categories from localStorage cache (0 network requests).')
              this.catalogCategories = parsed
              setActiveCategories(parsed)
              this.towers.forEach((tower) => {
                refreshTowerCatalog(tower)
                refreshTowerCabinet(tower)
              })
              return
            }
          }
        } catch (e) {
          console.warn('[useClosetStore] Failed to read catalog cache from localStorage:', e)
        }
      }

      // 3. Fetch from API if memory state & localStorage cache are empty or forceRefresh is true
      if (this.catalogsLoading) return
      this.catalogsLoading = true
      try {
        const [withoutDoors, withDoors] = await Promise.all([
          loadCatalogCategories('without_doors'),
          loadCatalogCategories('with_doors'),
        ])
        const allCategories = [...withoutDoors, ...withDoors]
        this.catalogCategories = allCategories
        setActiveCategories(allCategories)

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(allCategories))
          console.log('[useClosetStore] Saved catalog categories & cabinets to localStorage cache.')
        } catch (e) {
          console.warn('[useClosetStore] Failed to save catalog cache to localStorage:', e)
        }
        
        // Refresh all existing towers with newly loaded API categories & cabinets
        this.towers.forEach((tower) => {
          refreshTowerCatalog(tower)
          refreshTowerCabinet(tower)
        })
      } catch (err) {
        console.warn('[useClosetStore] loadCatalogs: unexpected error', err)
      } finally {
        this.catalogsLoading = false
      }
    },

    async loadCustomParts(forceRefresh = false) {
      const CACHE_KEY = 'closet-custom-parts-cache-v1'
      
      if (this.customParts.length > 0 && !forceRefresh) {
        return
      }

      if (!forceRefresh) {
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY)
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw)
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.customParts = parsed
              return
            }
          }
        } catch (e) {
          console.warn('[useClosetStore] Failed to read custom parts cache:', e)
        }
      }

      try {
        const { default: ClosetService } = await import('../services/ClosetService');
        const parts = await ClosetService.getCustomParts();
        this.customParts = parts;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parts))
        } catch (e) {}
      } catch (err) {
        console.warn('[useClosetStore] loadCustomParts error:', err)
      }
    },

    // ── Closet type ───────────────────────────────────────────────────────
    setClosetType(name: ClosetTypeName) {
      const type = getClosetType(name)
      this.closetType = name
      this.cabinet = type.createCabinet()
      this.towers = type.createTowers()
    },

    // ── Cabinet dimensions ────────────────────────────────────────────────
    setCabinetDimensions(partial: Partial<CabinetDimensions>) {
      this.cabinet = { ...this.cabinet, ...partial }
    },

    // ── Tower management ──────────────────────────────────────────────────
    addTower() {
      const idx = this.towers.length + 1
      const innerW = this.innerCabinetWidth
      // Add the new tower first (placeholder width), then redistribute all towers
      // evenly so no tower overflows the cabinet interior.
      const newTower = createDefaultTower(30, this.cabinet.depth, this.cabinet.height, idx)
      const allTowers = [...this.towers, newTower]
      const evenWidth = Math.max(30, Math.floor((innerW / allTowers.length) * 10) / 10)
      for (const t of allTowers) {
        t.width = evenWidth
      }
      this.towers = allTowers
    },

    addTowerFromCatalog(doorMode: ClosetDoorMode, categoryCode: ClosetCatalogCategoryCode) {
      const idx = this.towers.length + 1
      this.towers.push(createTowerFromCategory(doorMode, categoryCode, idx))
    },

    addCustomPart(partType: string, attachedToTowerId?: string, wallLength?: number, side?: 'left' | 'right', orientation?: 'left' | 'right') {
      const attachedTower = attachedToTowerId ? this.towers.find(t => t.id === attachedToTowerId) : null;
      const idx = this.towers.length + 1;
      
      const customPartDef = this.customParts.find(p => p.title.toLowerCase() === partType.toLowerCase());
      
      let defaultWidth = customPartDef?.has_width ? 0.75 : 3;
      
      let initialDepth = customPartDef?.has_depth ? 0.75 : 0.75;
      let initialHeight = 84;
      let initialOutset = 0;
      
      const isLShapeVertical = partType.toLowerCase() === 'l shape vertical';
      const isLShapeHorizontal = partType.toLowerCase() === 'l shape horizontal';
      const isLShape = partType.toLowerCase().includes('l shape');
      const isToeKick = partType.toLowerCase() === 'toe kick';
      if (isLShapeVertical) {
        defaultWidth = 3;
        initialDepth = 3;
        initialHeight = 84;
        initialOutset = 20.875;
      } else if (isLShapeHorizontal) {
        defaultWidth = 30;
        initialDepth = 3;
        initialHeight = 3;
        initialOutset = 23.875;
      } else if (isToeKick) {
        defaultWidth = 30;
        initialDepth = 0.75;
        initialHeight = 4.5;
        initialOutset = 21;
      } else if (isLShape) {
        defaultWidth = 5;
        initialDepth = 5;
      }

      if (!attachedTower) {
        if (partType.toLowerCase() === 'panel') {
          initialDepth = 15;
        } else if (partType.toLowerCase() === 'filler') {
          initialDepth = 0.75;
          initialOutset = 14.25;
        } else if (isLShapeVertical) {
          initialDepth = 24;
          initialOutset = 0;
        } else if (isLShapeHorizontal) {
          initialOutset = 23.875;
        } else if (isToeKick) {
          initialOutset = 21;
        } else if (isLShape) {
          initialOutset = 10;
        }
      } else {
        if (partType.toLowerCase() === 'panel') {
          initialDepth = attachedTower.depth;
          initialHeight = attachedTower.height;
          initialOutset = attachedTower.outset ?? 0;
        } else if (partType.toLowerCase() === 'filler') {
          initialDepth = 0.75;
          initialHeight = attachedTower.height;
          initialOutset = (attachedTower.outset ?? 0) + attachedTower.depth - initialDepth;
        } else if (isLShapeVertical) {
          initialHeight = attachedTower.height;
          initialOutset = attachedTower.outset ?? 0;
          const hasDoors = attachedTower.doorMode === 'with_doors';
          const doorExtra = hasDoors ? ((attachedTower.doorGap ?? 0.125) + (attachedTower.doorThickness ?? 0.75)) : 0;
          initialDepth = attachedTower.depth + doorExtra;
        } else if (isLShapeHorizontal) {
          defaultWidth = attachedTower.width ?? 30;
          initialDepth = 3;
          initialHeight = 3;
          initialOutset = 23.875;
        } else if (isToeKick) {
          defaultWidth = attachedTower.width ?? 30;
          initialDepth = 0.75;
          initialHeight = 4.5;
          initialOutset = (attachedTower.outset ?? 0) + 21;
        } else if (isLShape) {
          initialHeight = attachedTower.height;
          initialOutset = (attachedTower.outset ?? 0) + attachedTower.depth - initialDepth;
        }
      }
      
      let initialPosition = attachedTower?.positionAlongWall;
      if (attachedTower && initialPosition !== undefined && wallLength) {
        if (isLShapeHorizontal || isToeKick) {
          initialPosition = attachedTower.positionAlongWall;
        } else {
          const centerCm = initialPosition * wallLength;
          if (side === 'right' || (!side && partType.toLowerCase() === 'panel')) {
            // Default to placing Panel on the right edge of the attached cabinet
            const rightEdgeCm = centerCm + (attachedTower.width / 2);
            initialPosition = (rightEdgeCm + (defaultWidth / 2)) / wallLength;
          } else if (side === 'left' || (!side && partType.toLowerCase() === 'filler')) {
            // Default to placing Filler on the left edge of the attached cabinet
            const leftEdgeCm = centerCm - (attachedTower.width / 2);
            initialPosition = (leftEdgeCm - (defaultWidth / 2)) / wallLength;
          }
        }
      }

      let label = customPartDef ? customPartDef.title : partType;
      // Capitalize first letter if it's fallback
      if (!customPartDef) {
          label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      const initialElevation = isLShapeHorizontal
        ? (attachedTower ? ((attachedTower.elevation ?? 0) + (attachedTower.height || 84)) : 84)
        : isLShapeVertical
          ? 0
          : (attachedTower?.elevation ?? 0);

      const newPart: Tower = {
        id: createTowerId(),
        label: `${label} ${idx}`,
        width: defaultWidth,
        depth: initialDepth,
        height: initialHeight,
        partType,
        attachedToTowerId: (partType.toLowerCase() === 'panel' || partType.toLowerCase() === 'filler') ? undefined : attachedTower?.id,
        accessories: [],
        wallId: attachedTower?.wallId, // Place on same wall by default
        positionAlongWall: initialPosition,
        elevation: initialElevation,
        outset: initialOutset || undefined,
        orientation: isLShapeHorizontal ? undefined : (orientation || (isLShapeVertical ? 'left' : undefined)),
      };
      this.towers.push(newPart);
      return newPart;
    },

    removeTower(towerId: string) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      if (idx !== -1) this.towers.splice(idx, 1)
    },

    /** Move a tower left (-1) or right (+1) in the array. */
    moveTower(towerId: string, direction: -1 | 1) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= this.towers.length) return
      // Splice-based swap to avoid TS strict indexing issues
      const [removed] = this.towers.splice(idx, 1)
      if (removed) this.towers.splice(target, 0, removed)
    },

    /**
     * Assign a tower to a specific wall, placing its centre at `positionAlongWall`
     * (fractional, 0 = wall start, 1 = wall end; defaults to 0.5 = centred).
     */
    setTowerWall(towerId: string, wallId: string | null, positionAlongWall = 0.5) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.wallId = wallId
        tower.positionAlongWall = positionAlongWall
      }
    },

    /**
     * Shift a tower's centre along its wall by `delta` (fractional units).
     * `wallLengthCm` is used to clamp so the tower stays within wall bounds.
     */
    moveTowerAlongWall(towerId: string, delta: number, wallLengthCm: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower || tower.wallId == null) return

      const halfRatio = wallLengthCm > 0 ? (tower.width / 2) / wallLengthCm : 0
      const min = Math.max(0, halfRatio)
      const max = Math.min(1, 1 - halfRatio)
      const current = tower.positionAlongWall ?? 0.5
      const newPosition = Math.max(min, Math.min(max, current + delta))
      const actualDelta = newPosition - current
      tower.positionAlongWall = newPosition
      
      if (actualDelta !== 0) {
        this.towers.filter(t => t.attachedToTowerId === towerId).forEach(part => {
          const partCurrent = part.positionAlongWall ?? 0.5
          const partHalfRatio = wallLengthCm > 0 ? (part.width / 2) / wallLengthCm : 0
          part.positionAlongWall = Math.max(partHalfRatio, Math.min(1 - partHalfRatio, partCurrent + actualDelta))
        })
      }
    },

    updateTower(towerId: string, partial: Partial<Omit<Tower, 'id' | 'accessories'>>) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        let deltaPos = 0;
        if (partial.positionAlongWall !== undefined && tower.positionAlongWall !== undefined) {
          deltaPos = partial.positionAlongWall - tower.positionAlongWall;
        }
        Object.assign(tower, partial)

        if (deltaPos !== 0) {
          this.towers.filter(t => t.attachedToTowerId === towerId).forEach(part => {
            if (part.positionAlongWall !== undefined) {
              part.positionAlongWall += deltaPos;
            }
          })
        }
      }
    },

    setTowerWidth(towerId: string, width: number, wallLengthCm?: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        const oldWidth = tower.width
        tower.width = snapTo16th(clampTowerWidth(tower, snapTo16th(width)))
        const deltaW = tower.width - oldWidth
        
        if (deltaW !== 0 && tower.attachedToTowerId && wallLengthCm && tower.positionAlongWall !== undefined) {
          if (tower.partType === 'filler') {
            // Anchored to the cabinet on its right side; expand to the left.
            tower.positionAlongWall -= (deltaW / 2) / wallLengthCm
          } else if (tower.partType === 'panel') {
            // Anchored to the cabinet on its left side; expand to the right.
            tower.positionAlongWall += (deltaW / 2) / wallLengthCm
          }
        }

        // Sync attached parts with cabinet width
        this.towers
          .filter((t) => t.attachedToTowerId === towerId)
          .forEach((part) => {
            if (part.partType?.toLowerCase() === 'toe kick' || part.partType?.toLowerCase() === 'l shape horizontal') {
              part.width = tower.width;
            }
          });

        // Refresh cabinet after width change (also auto-forces 2-box if needed)
        refreshTowerCabinet(tower)
      }
    },

    setTowerDepth(towerId: string, depth: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower) return

      let oldTotalD: number | undefined
      if (tower.isCorner) {
        oldTotalD = tower.depth + (tower.cornerBridgeWidth ?? Math.max(0, 23 - tower.depth))
      }

      tower.depth = snapTo16th(clampTowerDepth(tower, snapTo16th(depth)))

      if (tower.isCorner && oldTotalD !== undefined) {
        const clampedTotalD = Math.min(24, Math.max(22, oldTotalD))
        tower.cornerBridgeWidth = Math.max(0, clampedTotalD - tower.depth)
        refreshBridgeCabinetForTower(tower)
      }

      const res = refreshTowerCatalog(tower)
      refreshTowerCabinet(tower, { catalogSwitched: res?.switched ?? false })

      // Sync attached parts
      this.towers
        .filter((t) => t.attachedToTowerId === towerId)
        .forEach((part) => {
          if (part.partType === 'panel') {
            part.depth = tower.depth
          } else if (part.partType === 'filler') {
            part.outset = snapTo16th((tower.outset ?? 0) + tower.depth)
          } else if (part.partType?.toLowerCase() === 'l shape vertical') {
            const hasDoors = tower.doorMode === 'with_doors';
            const doorExtra = hasDoors ? ((tower.doorGap ?? 0.125) + (tower.doorThickness ?? 0.75)) : 0;
            part.depth = snapTo16th(tower.depth + doorExtra);
            part.outset = tower.outset ?? 0;
          }
        })
    },

    setTowerHeight(towerId: string, height: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.height = snapTo16th(clampTowerHeight(tower, snapTo16th(height)))
        refreshTowerCabinet(tower)
        // Sync attached parts
        this.towers
          .filter((t) => t.attachedToTowerId === towerId)
          .forEach((part) => {
            if (part.partType?.toLowerCase() === 'l shape horizontal') {
              part.elevation = snapTo16th((tower.elevation ?? 0) + tower.height);
            } else if (part.partType?.toLowerCase() === 'toe kick') {
              part.height = 4.5;
              part.elevation = snapTo16th(tower.elevation ?? 0);
            } else {
              part.height = tower.height;
            }
          })
      }
    },

    setTowerDoorGap(towerId: string, gap: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorGap = snapTo16th(gap)
        this.towers
          .filter((t) => t.attachedToTowerId === towerId && t.partType?.toLowerCase() === 'l shape vertical')
          .forEach((part) => {
            const doorExtra = (tower.doorGap ?? 0.125) + (tower.doorThickness ?? 0.75);
            part.depth = snapTo16th(tower.depth + doorExtra);
          })
      }
    },

    setTowerDoorThickness(towerId: string, thickness: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorThickness = snapTo16th(thickness)
        this.towers
          .filter((t) => t.attachedToTowerId === towerId && t.partType?.toLowerCase() === 'l shape vertical')
          .forEach((part) => {
            const doorExtra = (tower.doorGap ?? 0.125) + (tower.doorThickness ?? 0.75);
            part.depth = snapTo16th(tower.depth + doorExtra);
          })
      }
    },

    setTowerDoorWidth(towerId: string, width: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorWidth = snapTo16th(width)
      }
    },

    setTowerDoorHeight(towerId: string, height: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorHeight = snapTo16th(height)
      }
    },

    setTowerBoxCount(towerId: string, boxCount: 1 | 2) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower || !tower.doorMode || !tower.categoryCode) return

      // Validate 1-box availability
      if (boxCount === 1 && !isOneBoxAvailable(tower.doorMode, tower.categoryCode, tower.width, tower.depth)) {
        tower.boxCount = 2
      } else {
        tower.boxCount = boxCount
      }

      refreshTowerCabinet(tower)
    },

    setTowerCornerPosition(towerId: string, cornerPosition: CornerPosition) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower) return

      tower.cornerPosition = cornerPosition
      tower.cornerOrientation = cornerPosition === 'left' || cornerPosition === 'right' ? cornerPosition : undefined
      tower.isCorner = cornerPosition === 'left' || cornerPosition === 'right'

      if (tower.isCorner) {
        if (tower.width < 30) {
          tower.width = 30
        }
        tower.height = clampTowerHeight(tower, tower.height)
        // Initialize bridge dimensions when first toggled to a corner position.
        // Default total depth = 23", default bridge width = Math.max(0, 23 - tower.depth).
        const currentTotalD = tower.cornerBridgeWidth !== undefined ? tower.depth + tower.cornerBridgeWidth : undefined
        if (tower.cornerBridgeWidth === undefined || currentTotalD! < 22 || currentTotalD! > 24) {
          tower.cornerBridgeWidth = Math.max(0, 23 - tower.depth)
        }
        tower.cornerBridgeDepth = clampTowerDepth(tower, tower.cornerBridgeDepth ?? tower.depth)
        refreshBridgeCabinetForTower(tower)
      } else {
        // Clear bridge fields when corner is turned off.
        tower.cornerBridgeWidth = undefined
        tower.cornerBridgeDepth = undefined
        ;(tower as any).bridgeCabinetId = undefined
        ;(tower as any).bridgeCabinetCode = undefined
      }

      refreshTowerCatalog(tower)
      refreshTowerCabinet(tower)
    },

    setTowerOrientation(towerId: string, orientation: 'left' | 'right') {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower) return
      tower.orientation = orientation
    },

    setTowerBridgeDimensions(
      towerId: string,
      { bridgeWidth, bridgeDepth }: { bridgeWidth?: number; bridgeDepth?: number },
    ) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower || !tower.isCorner) return

      if (typeof bridgeWidth === 'number') {
        // Clamp total depth (tower.depth + bridgeWidth) between 22" and 24"
        const targetTotalD = tower.depth + bridgeWidth
        const clampedTotalD = Math.min(24, Math.max(22, snapTo16th(targetTotalD)))
        tower.cornerBridgeWidth = Math.max(0, clampedTotalD - tower.depth)
      }
      if (typeof bridgeDepth === 'number') {
        tower.cornerBridgeDepth = clampTowerDepth(tower, snapTo16th(bridgeDepth))
      }

      refreshBridgeCabinetForTower(tower)
    },

    setTowerOutset(towerId: string, outset: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.outset = snapTo16th(Math.max(0, outset))
        // Sync attached filler parts so they remain flush with the front
        this.towers
          .filter((t) => t.attachedToTowerId === towerId && t.partType === 'filler')
          .forEach((part) => {
            part.outset = snapTo16th(tower.outset! + tower.depth)
          })
        // Sync attached toe kick parts
        this.towers
          .filter((t) => t.attachedToTowerId === towerId && t.partType?.toLowerCase() === 'toe kick')
          .forEach((part) => {
            part.outset = snapTo16th(tower.outset! + 21)
          })
        // Sync attached l shape vertical parts
        this.towers
          .filter((t) => t.attachedToTowerId === towerId && t.partType?.toLowerCase() === 'l shape vertical')
          .forEach((part) => {
            part.outset = snapTo16th(tower.outset ?? 0)
          })
      }
    },

    setTowerElevation(towerId: string, elevation: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        const oldElevation = tower.elevation ?? 0
        tower.elevation = snapTo16th(Math.max(0, elevation))
        const delta = tower.elevation - oldElevation
        if (delta !== 0) {
          this.towers
            .filter((t) => t.attachedToTowerId === towerId)
            .forEach((part) => {
              if (part.partType?.toLowerCase() === 'l shape horizontal') {
                part.elevation = snapTo16th((part.elevation ?? 0) + delta)
              } else if (part.partType?.toLowerCase() === 'toe kick') {
                part.elevation = snapTo16th((part.elevation ?? 0) + delta)
              }
            })
        }
      }
    },

    // ── Accessories ───────────────────────────────────────────────────────
    setTowerAccessories(towerId: string, accessories: Accessory[]) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.accessories = accessories
    },

    addAccessory(towerId: string, accessory: Accessory) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.accessories.push(accessory)
    },

    removeAccessory(towerId: string, index: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower && index >= 0 && index < tower.accessories.length) {
        tower.accessories.splice(index, 1)
      }
    },

    /** Replace all towers (e.g. when applying a preset). */
    setTowers(towers: Tower[]) {
      this.towers = towers
    },

    // ── Materials ─────────────────────────────────────────────────────────
    setMaterials(partial: Partial<ClosetMaterials>) {
      Object.assign(this.materials, partial)
    },

    setDoorOptions(partial: Partial<ArchitecturalDoorOptions>) {
      Object.assign(this.doorOptions, partial)
    },

    // ── Bulk reset ────────────────────────────────────────────────────────
    resetToDefaults() {
      this.$patch(createDefaultClosetState())
    },

    /** @deprecated Use tower accessories instead. Kept for Phase 1 sidebar compat. */
    setShelves(n: number) {
      const firstTower = this.towers[0]
      if (!firstTower) return
      const shelfIdx = firstTower.accessories.findIndex((a) => a.type === 'shelf_set')
      if (shelfIdx !== -1) {
        firstTower.accessories[shelfIdx] = { type: 'shelf_set', count: n }
      } else {
        firstTower.accessories.push({ type: 'shelf_set', count: n })
      }
    },
  },
})
