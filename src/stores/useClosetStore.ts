// ---------------------------------------------------------------------------
// Closet store — v2 (towers, accessories, materials)
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import {
  createDefaultClosetState,
  exportForBackend,
  type ClosetStateV2,
  type CabinetDimensions,
  type ClosetRecord,
} from '../features/closet/domain/schema'
import { validateCloset } from '../features/closet/domain/validateCloset'
import { snapTo16th } from '../features/closet/domain/snapUtils'
import type { Tower, Accessory, CornerPosition } from '../features/closet/domain/types/tower'
import { createDefaultTower, createTowerId } from '../features/closet/domain/types/tower'
import {
  clampTowerDepth,
  clampTowerHeight,
  clampTowerWidth,
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
  /** Promise tracking the ongoing API request for catalogs. */
  _catalogsPromise: Promise<void> | null
  /** Closets created by the user */
  closets: ClosetRecord[]
  currentClosetId: string | null
  currentClosetName: string
}

const CLOSET_STORE_KEY = 'closet-store-data-v1'
let _saveBackendDebounceTimer: any = null

function loadPersistedClosetData(): {
  closets: ClosetRecord[]
  currentClosetId: string | null
  currentClosetName: string
  towers: Tower[]
} {
  if (typeof localStorage === 'undefined') {
    return { closets: [], currentClosetId: null, currentClosetName: '', towers: [] }
  }
  try {
    const raw = localStorage.getItem(CLOSET_STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const closets: ClosetRecord[] = Array.isArray(parsed.closets) ? parsed.closets : []
      const currentClosetId = parsed.currentClosetId ?? null
      const currentClosetName = parsed.currentClosetName ?? ''
      let towers: Tower[] = Array.isArray(parsed.towers) ? parsed.towers : []

      if (towers.length === 0 && currentClosetId && closets.length > 0) {
        const found = closets.find((c) => c.id === currentClosetId)
        const foundShelves = found?.shelves || found?.towers
        if (Array.isArray(foundShelves) && foundShelves.length > 0) {
          towers = foundShelves
        }
      }

      return { closets, currentClosetId, currentClosetName, towers }
    }

    const histRaw = localStorage.getItem('closet-design-save')
    if (histRaw) {
      const parsedHist = JSON.parse(histRaw)
      if (parsedHist.closet) {
        const parsedCloset = JSON.parse(parsedHist.closet)
        const closets: ClosetRecord[] = Array.isArray(parsedCloset.closets) ? parsedCloset.closets : []
        const currentClosetId = parsedCloset.currentClosetId ?? null
        const currentClosetName = parsedCloset.currentClosetName ?? ''
        let towers: Tower[] = Array.isArray(parsedCloset.towers) ? parsedCloset.towers : []

        if (towers.length === 0 && currentClosetId && closets.length > 0) {
          const found = closets.find((c) => c.id === currentClosetId)
          const foundShelves = found?.shelves || found?.towers
          if (Array.isArray(foundShelves) && foundShelves.length > 0) {
            towers = foundShelves
          }
        }

        return { closets, currentClosetId, currentClosetName, towers }
      }
    }
  } catch (e) {
    console.warn('[useClosetStore] loadPersistedClosetData error:', e)
  }
  return { closets: [], currentClosetId: null, currentClosetName: '', towers: [] }
}

export const useClosetStore = defineStore('closet', {
  state: (): ClosetStoreState => {
    const persisted = loadPersistedClosetData()
    const defaultState = createDefaultClosetState()

    const initialClosets = persisted.closets.length > 0 ? persisted.closets : []
    const initialId = persisted.currentClosetId ?? null
    const initialName = persisted.currentClosetName ?? ''
    const initialTowers = persisted.towers.length > 0 ? persisted.towers : defaultState.towers

    return {
      ...defaultState,
      closets: initialClosets,
      currentClosetId: initialId,
      currentClosetName: initialName,
      towers: initialTowers,
      catalogCategories: [],
      customParts: [],
      catalogsLoading: false,
      _catalogsPromise: null,
    }
  },

  getters: {
    exportForBackend: (state) => exportForBackend(state),
    violations: (state) => validateCloset(state),
    towerById: (state) => (id: string) => state.towers.find((t) => t.id === id),
    totalTowerWidth: (state) => state.towers.reduce((sum, t) => sum + (Number(t.width) || 0), 0),
    innerCabinetWidth: (state) => Math.max(0, state.cabinet.width - state.cabinet.thickness * 2),
    currentCloset: (state) => state.closets?.find((c) => c.id === state.currentClosetId) || null,
    activeClosetTitle: (state) => state.currentClosetName || '',
    /** Catalog categories filtered by door mode — from live API or static fallback. */
    catalogCategoriesForMode: (state) => (doorMode: ClosetDoorMode) => {
      if (state.catalogCategories && state.catalogCategories.length > 0) {
        setActiveCategories(state.catalogCategories)
      }
      return state.catalogCategories.filter((c) => c.doorMode === doorMode)
    },
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
      // Force all cabinet thicknesses to 0.75 as per requested design constraint.
      if (this.cabinet) {
        this.cabinet.thickness = 0.75
      }

      const CACHE_KEY = 'closet-catalog-categories-cache-v6'

      // 1. If already in Pinia memory state, ensure activeCategories is synced immediately
      if (this.catalogCategories.length > 0) {
        setActiveCategories(this.catalogCategories)
        if (!forceRefresh) {
          return
        }
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
      if (this._catalogsPromise) {
        return this._catalogsPromise
      }

      this.catalogsLoading = true
      this._catalogsPromise = (async () => {
        try {
          const [withoutDoors, withDoors] = await Promise.all([
            loadCatalogCategories('without_doors'),
            loadCatalogCategories('with_doors'),
          ])
          const allCategories = [...withoutDoors, ...withDoors]
          if (allCategories.length > 0) {
            this.catalogCategories = allCategories
            setActiveCategories(allCategories)

            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(allCategories))
              console.log('[useClosetStore] Saved catalog categories & cabinets to localStorage cache.')
            } catch (e) {
              console.warn('[useClosetStore] Failed to save catalog cache to localStorage:', e)
            }
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
          this._catalogsPromise = null
        }
      })()
      
      return this._catalogsPromise
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
      this.syncCurrentCloset()
    },

    addTowerFromCatalog(doorMode: ClosetDoorMode, categoryCode: ClosetCatalogCategoryCode) {
      if (this.catalogCategories && this.catalogCategories.length > 0) {
        setActiveCategories(this.catalogCategories)
      }
      const idx = this.towers.length + 1
      this.towers.push(createTowerFromCategory(doorMode, categoryCode, idx))
      this.syncCurrentCloset()
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
        initialOutset = 20.875;
      } else if (isToeKick) {
        defaultWidth = 30;
        initialDepth = 0.75;
        initialHeight = 4.5;
        initialOutset = 21;
      } else if (isLShape) {
        defaultWidth = 5;
        initialDepth = 5;
      } else if (partType.toLowerCase() === 'filler') {
        defaultWidth = 3;
      }

      if (!attachedTower) {
        if (partType.toLowerCase() === 'panel') {
          initialDepth = 15;
        } else if (partType.toLowerCase() === 'filler') {
          initialDepth = 0.75;
          initialOutset = 14.25;
        } else if (isLShapeVertical) {
          // Independent defaults: Width 3, Depth 3, Height 84, Outset 20.875
        } else if (isLShapeHorizontal) {
          initialOutset = 20.875;
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
        } else if (isLShapeVertical || isLShapeHorizontal) {
          // Independent: properties do not inherit from cabinet
        } else if (isToeKick) {
          defaultWidth = 30;
          initialDepth = 0.75;
          initialHeight = 4.5;
          initialOutset = 21;
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
        ? 84
        : isLShapeVertical
          ? 0
          : (attachedTower?.elevation ?? 0);

      const isLShapeGeneric = isLShape && !isLShapeVertical && !isLShapeHorizontal;
      const newPart: Tower = {
        id: createTowerId(),
        label: `${label} ${idx}`,
        width: defaultWidth,
        depth: initialDepth,
        height: initialHeight,
        partType,
        attachedToTowerId: (partType.toLowerCase() === 'panel' || partType.toLowerCase() === 'filler' || isToeKick || isLShapeGeneric) ? undefined : attachedTower?.id,
        accessories: [],
        wallId: attachedTower?.wallId, // Place on same wall by default
        positionAlongWall: initialPosition,
        elevation: initialElevation,
        outset: initialOutset || undefined,
        orientation: isLShapeHorizontal ? undefined : (orientation || (isLShapeVertical ? 'left' : undefined)),
      };
      this.towers.push(newPart);
      this.syncCurrentCloset();
      return newPart;
    },

    removeTower(towerId: string) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      if (idx !== -1) {
        this.towers.splice(idx, 1)
        this.syncCurrentCloset()
      }
    },

    /** Move a tower left (-1) or right (+1) in the array. */
    moveTower(towerId: string, direction: -1 | 1) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= this.towers.length) return
      // Splice-based swap to avoid TS strict indexing issues
      const [removed] = this.towers.splice(idx, 1)
      if (removed) {
        this.towers.splice(target, 0, removed)
        this.syncCurrentCloset()
      }
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
        this.syncCurrentCloset()
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
        this.towers.filter(t => t.attachedToTowerId === towerId && t.partType?.toLowerCase() !== 'l shape vertical' && t.partType?.toLowerCase() !== 'l shape horizontal' && t.partType?.toLowerCase() !== 'toe kick').forEach(part => {
          const partCurrent = part.positionAlongWall ?? 0.5
          const partHalfRatio = wallLengthCm > 0 ? (part.width / 2) / wallLengthCm : 0
          part.positionAlongWall = Math.max(partHalfRatio, Math.min(1 - partHalfRatio, partCurrent + actualDelta))
        })
      }
      this.syncCurrentCloset()
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
          this.towers.filter(t => t.attachedToTowerId === towerId && t.partType?.toLowerCase() !== 'l shape vertical' && t.partType?.toLowerCase() !== 'l shape horizontal' && t.partType?.toLowerCase() !== 'toe kick').forEach(part => {
            if (part.positionAlongWall !== undefined) {
              part.positionAlongWall += deltaPos;
            }
          })
        }
        this.syncCurrentCloset()
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

        if (wallLengthCm && tower.positionAlongWall !== undefined) {
          const halfRatio = (tower.width / 2) / wallLengthCm
          if (halfRatio <= 0.5) {
            tower.positionAlongWall = Math.max(halfRatio, Math.min(1 - halfRatio, tower.positionAlongWall))
          }
        }

        // Sync attached parts with cabinet width
        this.towers
          .filter((t) => t.attachedToTowerId === towerId)
          .forEach(() => {
            // (other synced parts logic goes here if any)
          });

        // Refresh cabinet after width change (also auto-forces 2-box if needed)
        refreshTowerCabinet(tower)
        this.syncCurrentCloset()
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
          }
        })
      this.syncCurrentCloset()
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
            } else if (part.partType?.toLowerCase() === 'l shape vertical') {
              // Independent: do not inherit cabinet height
            } else {
              part.height = tower.height;
            }
          })
        this.syncCurrentCloset()
      }
    },

    setTowerDoorGap(towerId: string, gap: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorGap = snapTo16th(gap)
        this.syncCurrentCloset()
      }
    },

    setTowerDoorThickness(towerId: string, thickness: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorThickness = snapTo16th(thickness)
        this.syncCurrentCloset()
      }
    },

    setTowerDoorWidth(towerId: string, width: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorWidth = snapTo16th(width)
        this.syncCurrentCloset()
      }
    },

    setTowerDoorHeight(towerId: string, height: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.doorHeight = snapTo16th(height)
        this.syncCurrentCloset()
      }
    },

    setTowerGlassDoor(towerId: string, isGlassDoor: boolean) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.isGlassDoor = isGlassDoor
        this.syncCurrentCloset()
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
      this.syncCurrentCloset()
    },

    setTowerCornerPosition(towerId: string, cornerPosition: CornerPosition) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower) return

      tower.cornerPosition = cornerPosition
      tower.cornerOrientation = cornerPosition === 'left' || cornerPosition === 'right' ? cornerPosition : undefined
      tower.isCorner = cornerPosition === 'left' || cornerPosition === 'right'

      if (tower.isCorner) {
        tower.doorHinge = cornerPosition === 'right' ? 'right' : 'left'
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
      this.syncCurrentCloset()
    },

    setTowerOrientation(towerId: string, orientation: 'left' | 'right') {
      const tower = this.towers.find((t) => t.id === towerId)
      if (!tower) return
      tower.orientation = orientation
      this.syncCurrentCloset()
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
      this.syncCurrentCloset()
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
        this.syncCurrentCloset()
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
              }
            })
        }
        this.syncCurrentCloset()
      }
    },

    // ── Accessories ───────────────────────────────────────────────────────
    setTowerAccessories(towerId: string, accessories: Accessory[]) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.accessories = accessories
        this.syncCurrentCloset()
      }
    },

    addAccessory(towerId: string, accessory: Accessory) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) {
        tower.accessories.push(accessory)
        this.syncCurrentCloset()
      }
    },

    removeAccessory(towerId: string, index: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower && index >= 0 && index < tower.accessories.length) {
        tower.accessories.splice(index, 1)
        this.syncCurrentCloset()
      }
    },

    /** Replace all towers (e.g. when applying a preset). */
    setTowers(towers: Tower[]) {
      this.towers = towers
      this.syncCurrentCloset()
    },

    // ── Materials ─────────────────────────────────────────────────────────
    setMaterials(partial: Partial<ClosetMaterials>) {
      Object.assign(this.materials, partial)
    },

    setDoorOptions(partial: Partial<ArchitecturalDoorOptions>) {
      Object.assign(this.doorOptions, partial)
    },

    // ── Closet Management ────────────────────────────────────────────────
    syncCurrentCloset() {
      if (!Array.isArray(this.closets)) {
        this.closets = []
      }

      const towersCopy: Tower[] = JSON.parse(JSON.stringify(this.towers || []))
      const now = new Date().toISOString()

      let active = this.currentClosetId
        ? this.closets.find((c) => c.id === this.currentClosetId)
        : null

      if (!active && this.currentClosetName) {
        active = this.closets.find(
          (c) => c.name.toLowerCase() === this.currentClosetName.toLowerCase()
        )
        if (active) {
          this.currentClosetId = active.id
        }
      }

      if (active) {
        active.name = this.currentClosetName || active.name
        active.shelves = towersCopy
        active.towers = towersCopy
        active.cabinet = this.cabinet ? { ...this.cabinet } : undefined
        active.materials = this.materials ? { ...this.materials } : undefined
        active.updatedAt = now
      } else if (this.currentClosetName || towersCopy.length > 0) {
        const name = this.currentClosetName || 'My Closet'
        const id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `closet-${Date.now()}`
        const record: ClosetRecord = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          shelves: towersCopy,
          towers: towersCopy,
          cabinet: this.cabinet ? { ...this.cabinet } : undefined,
          materials: this.materials ? { ...this.materials } : undefined,
        }
        this.closets.push(record)
        this.currentClosetId = id
        this.currentClosetName = name
      }

      this.saveToLocalStorage()
    },

    saveToLocalStorage() {
      if (typeof localStorage === 'undefined') return
      try {
        const payload = {
          closets: this.closets,
          currentClosetId: this.currentClosetId,
          currentClosetName: this.currentClosetName,
          towers: this.towers,
          cabinet: this.cabinet,
          materials: this.materials,
          doorOptions: this.doorOptions,
          units: this.units,
          closetType: this.closetType,
        }
        localStorage.setItem(CLOSET_STORE_KEY, JSON.stringify(payload))

        // Trigger debounced cloud sync if user has an active session token
        if (localStorage.getItem('access_token')) {
          if (_saveBackendDebounceTimer) {
            clearTimeout(_saveBackendDebounceTimer)
          }
          _saveBackendDebounceTimer = setTimeout(() => {
            this.saveCurrentClosetToBackend().catch(() => {})
          }, 1500)
        }
      } catch (e) {
        console.warn('[useClosetStore] Failed to save to localStorage:', e)
      }
    },

    async saveCurrentClosetToBackend() {
      const { useAppStore } = await import('./useAppStore')
      const appStore = useAppStore()
      const hasToken =
        (typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('access_token'))) ||
        Boolean(appStore.token)
      if (!hasToken) {
        return null
      }
      const active = this.currentClosetId
        ? this.closets.find((c) => c.id === this.currentClosetId)
        : null
      if (!active && (!this.towers || this.towers.length === 0) && !this.currentClosetName) {
        return null
      }
      try {
        const { default: ClosetService } = await import('../services/ClosetService')
        const { useRoomStore } = await import('./useRoomStore')
        const roomStore = useRoomStore()
        const roomPayload = roomStore.room
          ? JSON.parse(JSON.stringify({ ...roomStore.room, items: roomStore.items }))
          : active?.room
        const payload = {
          id: this.currentClosetId || active?.id,
          name: this.currentClosetName || active?.name || 'My Closet',
          shelves: this.towers,
          room: roomPayload,
          cabinet: this.cabinet ? { ...this.cabinet } : undefined,
          materials: this.materials ? { ...this.materials } : undefined,
          total_price: 0.00,
          status: 'draft',
        }
        const saved = await ClosetService.saveCloset(payload)
        if (saved && saved.id) {
          const oldId = this.currentClosetId
          const savedNameLower = (saved.name || payload.name).toLowerCase()
          this.currentClosetId = saved.id
          if (saved.name) {
            this.currentClosetName = saved.name
          }

          // Deduplicate local closets so only one entry exists per (id / name)
          const matchingIndices: number[] = []
          this.closets.forEach((c, i) => {
            if (c.id === saved.id || c.id === oldId || c.name.toLowerCase() === savedNameLower) {
              matchingIndices.push(i)
            }
          })

          const updatedRecord: ClosetRecord = {
            id: saved.id,
            name: saved.name || payload.name,
            createdAt: saved.created_at || (matchingIndices.length ? this.closets[matchingIndices[0]].createdAt : new Date().toISOString()),
            updatedAt: saved.updated_at || new Date().toISOString(),
            shelves: JSON.parse(JSON.stringify(this.towers || [])),
            towers: JSON.parse(JSON.stringify(this.towers || [])),
            room: roomPayload,
            cabinet: this.cabinet ? { ...this.cabinet } : undefined,
            materials: this.materials ? { ...this.materials } : undefined,
          }

          if (matchingIndices.length > 0) {
            this.closets[matchingIndices[0]] = updatedRecord
            for (let k = matchingIndices.length - 1; k >= 1; k--) {
              this.closets.splice(matchingIndices[k], 1)
            }
          } else {
            this.closets.push(updatedRecord)
          }

          this.persistToLocalStorageOnly()
        }
        return saved
      } catch (e) {
        console.warn('[useClosetStore] saveCurrentClosetToBackend error:', e)
        return null
      }
    },

    persistToLocalStorageOnly() {
      if (typeof localStorage === 'undefined') return
      try {
        const payload = {
          closets: this.closets,
          currentClosetId: this.currentClosetId,
          currentClosetName: this.currentClosetName,
          towers: this.towers,
          cabinet: this.cabinet,
          materials: this.materials,
          doorOptions: this.doorOptions,
          units: this.units,
          closetType: this.closetType,
        }
        localStorage.setItem(CLOSET_STORE_KEY, JSON.stringify(payload))
      } catch (e) {
        console.warn('[useClosetStore] Failed to persist to localStorage:', e)
      }
    },

    async saveCurrentClosetExplicitly(): Promise<{
      saved: boolean
      reason?: 'unauthenticated' | 'error'
      data?: any
    }> {
      this.syncCurrentCloset()
      if (_saveBackendDebounceTimer) {
        clearTimeout(_saveBackendDebounceTimer)
        _saveBackendDebounceTimer = null
      }
      const { useAppStore } = await import('./useAppStore')
      const appStore = useAppStore()
      const hasToken =
        (typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('access_token'))) ||
        Boolean(appStore.token)
      if (!hasToken) {
        return { saved: false, reason: 'unauthenticated' }
      }
      const data = await this.saveCurrentClosetToBackend()
      if (!data) {
        return { saved: false, reason: 'error' }
      }
      return { saved: true, data }
    },

    async loadFromBackend(): Promise<boolean> {
      if (typeof localStorage === 'undefined' || !localStorage.getItem('access_token')) {
        return false
      }
      try {
        const { default: ClosetService } = await import('../services/ClosetService')
        const remoteClosets = await ClosetService.getClosets()
        if (Array.isArray(remoteClosets) && remoteClosets.length > 0) {
          for (const remote of remoteClosets) {
            const existingIdx = this.closets.findIndex(
              (c) => c.id === remote.id || c.name.toLowerCase() === remote.name.toLowerCase()
            )
            const shelvesData = remote.shelves || remote.towers || []
            const record: ClosetRecord = {
              id: remote.id,
              name: remote.name,
              createdAt: remote.created_at,
              updatedAt: remote.updated_at,
              shelves: shelvesData,
              towers: shelvesData,
              cabinet: remote.cabinet,
              materials: remote.materials,
            }
            if (existingIdx !== -1) {
              this.closets[existingIdx] = { ...this.closets[existingIdx], ...record }
            } else {
              this.closets.push(record)
            }
          }

          if (this.towers.length === 0 && this.closets.length > 0) {
            const current = this.currentClosetId
              ? this.closets.find((c) => c.id === this.currentClosetId)
              : this.closets[0]
            if (current) {
              this.currentClosetId = current.id
              this.currentClosetName = current.name
              const shelves = current.shelves || current.towers
              if (Array.isArray(shelves) && shelves.length > 0) {
                this.towers = JSON.parse(JSON.stringify(shelves))
              }
            }
          }

          this.saveToLocalStorage()
          return true
        }
      } catch (e) {
        console.warn('[useClosetStore] loadFromBackend error:', e)
      }
      return false
    },

    async syncAllWithBackend(): Promise<any[]> {
      if (typeof localStorage === 'undefined' || !localStorage.getItem('access_token')) {
        return []
      }
      try {
        const { default: ClosetService } = await import('../services/ClosetService')
        if (Array.isArray(this.closets) && this.closets.length > 0) {
          const synced = await ClosetService.syncClosets(this.closets)
          return synced
        }
      } catch (e) {
        console.warn('[useClosetStore] syncAllWithBackend error:', e)
      }
      return []
    },

    loadFromLocalStorage(): boolean {
      if (typeof localStorage === 'undefined') return false
      try {
        const data = loadPersistedClosetData()
        if (Array.isArray(data.closets) && data.closets.length > 0) {
          this.closets = data.closets
        }
        if (data.currentClosetId) {
          this.currentClosetId = data.currentClosetId
        }
        if (data.currentClosetName) {
          this.currentClosetName = data.currentClosetName
        }
        if (Array.isArray(data.towers) && data.towers.length > 0) {
          this.towers = data.towers
        } else if (this.currentClosetId && this.closets.length > 0) {
          const current = this.closets.find((c) => c.id === this.currentClosetId)
          const currentShelves = current?.shelves || current?.towers
          if (Array.isArray(currentShelves) && currentShelves.length > 0) {
            this.towers = JSON.parse(JSON.stringify(currentShelves))
          }
        }
        return true
      } catch (e) {
        console.warn('[useClosetStore] loadFromLocalStorage error:', e)
      }
      return false
    },

    createCloset(name: string, reuseExisting = true): ClosetRecord {
      const trimmed = name.trim() || 'My Closet'
      if (!Array.isArray(this.closets)) {
        this.closets = []
      }

      if (reuseExisting) {
        const existing = this.closets.find(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        )
        if (existing) {
          this.currentClosetId = existing.id
          this.currentClosetName = existing.name
          const existingShelves = existing.shelves || existing.towers
          if (Array.isArray(existingShelves) && existingShelves.length > 0) {
            this.towers = JSON.parse(JSON.stringify(existingShelves))
          } else if (Array.isArray(this.towers) && this.towers.length > 0) {
            existing.shelves = JSON.parse(JSON.stringify(this.towers))
            existing.towers = JSON.parse(JSON.stringify(this.towers))
          }
          this.saveToLocalStorage()
          return existing
        }
      }

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `closet-${Date.now()}`
      const now = new Date().toISOString()
      const towersCopy: Tower[] = JSON.parse(JSON.stringify(this.towers || []))
      const closetRecord: ClosetRecord = {
        id,
        name: trimmed,
        createdAt: now,
        updatedAt: now,
        shelves: towersCopy,
        towers: towersCopy,
        cabinet: this.cabinet ? { ...this.cabinet } : undefined,
        materials: this.materials ? { ...this.materials } : undefined,
      }
      this.closets.push(closetRecord)
      this.currentClosetId = id
      this.currentClosetName = trimmed
      this.saveToLocalStorage()
      return closetRecord
    },

    addCloset(name: string): ClosetRecord {
      return this.createCloset(name)
    },

    setClosetName(name: string) {
      const trimmed = name.trim()
      this.currentClosetName = trimmed
      if (this.currentClosetId && Array.isArray(this.closets)) {
        const existing = this.closets.find((c) => c.id === this.currentClosetId)
        if (existing) {
          existing.name = trimmed
          existing.updatedAt = new Date().toISOString()
        }
      }
      this.saveToLocalStorage()
    },

    setCurrentCloset(id: string) {
      this.currentClosetId = id
      if (Array.isArray(this.closets)) {
        const found = this.closets.find((c) => c.id === id)
        if (found) {
          this.currentClosetName = found.name
          const shelves = found.shelves || found.towers
          if (Array.isArray(shelves)) {
            this.towers = JSON.parse(JSON.stringify(shelves))
          }
        }
      }
      this.saveToLocalStorage()
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
