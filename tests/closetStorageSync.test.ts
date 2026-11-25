// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClosetStore } from '../src/stores/useClosetStore'
import ClosetService from '../src/services/ClosetService'

vi.mock('../src/services/ClosetService', () => ({
  default: {
    getCatalogCategories: vi.fn().mockResolvedValue([]),
    getCustomParts: vi.fn().mockResolvedValue([]),
    getClosets: vi.fn(),
    getClosetById: vi.fn(),
    saveCloset: vi.fn(),
    deleteCloset: vi.fn(),
    syncClosets: vi.fn(),
  },
}))

describe('Closet Storage & Backend Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('skips backend save if access_token is missing', async () => {
    const store = useClosetStore()
    store.createCloset('Master Bedroom')
    store.addTower()

    const result = await store.saveCurrentClosetToBackend()
    expect(result).toBeNull()
    expect(ClosetService.saveCloset).not.toHaveBeenCalled()
  })

  it('saves current closet with shelves to backend when authenticated', async () => {
    localStorage.setItem('access_token', 'mock_token_12345')
    const store = useClosetStore()
    store.createCloset('Walk-in Wardrobe')
    store.addTower()

    const mockSaved = {
      id: 'closet-uuid-777',
      name: 'Walk-in Wardrobe',
      shelves: store.towers,
      updated_at: '2026-11-22T14:00:00Z',
    }
    vi.mocked(ClosetService.saveCloset).mockResolvedValueOnce(mockSaved)

    const result = await store.saveCurrentClosetToBackend()
    expect(result).toEqual(mockSaved)
    expect(ClosetService.saveCloset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Walk-in Wardrobe',
        shelves: expect.any(Array),
      })
    )
    expect(store.currentClosetId).toBe('closet-uuid-777')
  })

  it('loads remote closets and hydrates shelves from backend', async () => {
    localStorage.setItem('access_token', 'mock_token_12345')
    const mockRemote = [
      {
        id: 'remote-closet-1',
        name: 'Guest Room Closet',
        shelves: [
          {
            id: 'tower-101',
            label: 'Shelves 1',
            width: 30,
            height: 84,
            depth: 14,
            accessories: [],
          },
        ],
        created_at: '2026-11-22T10:00:00Z',
        updated_at: '2026-11-22T10:00:00Z',
      },
    ]
    vi.mocked(ClosetService.getClosets).mockResolvedValueOnce(mockRemote)

    const store = useClosetStore()
    store.towers = [] // clear towers

    const success = await store.loadFromBackend()
    expect(success).toBe(true)
    expect(store.closets.length).toBe(1)
    expect(store.closets[0].name).toBe('Guest Room Closet')
    expect(store.closets[0].shelves?.length).toBe(1)
    expect(store.towers.length).toBe(1)
    expect(store.towers[0].label).toBe('Shelves 1')
  })

  it('syncs all closets to backend via syncAllWithBackend', async () => {
    localStorage.setItem('access_token', 'mock_token_12345')
    const store = useClosetStore()
    store.createCloset('Closet A')
    store.createCloset('Closet B')

    vi.mocked(ClosetService.syncClosets).mockResolvedValueOnce(store.closets)

    const synced = await store.syncAllWithBackend()
    expect(ClosetService.syncClosets).toHaveBeenCalledWith(store.closets)
    expect(synced.length).toBe(2)
  })

  it('explicit save calls backend immediately and deduplicates matching closet names', async () => {
    localStorage.setItem('access_token', 'mock_token_12345')
    const store = useClosetStore()
    store.createCloset('Test two')
    store.addTower()

    vi.mocked(ClosetService.saveCloset).mockResolvedValueOnce({
      id: 'canonical-db-id',
      name: 'Test two',
      shelves: store.towers,
      created_at: '2026-11-25T10:00:00Z',
      updated_at: '2026-11-25T10:05:00Z',
    })

    const result = await store.saveCurrentClosetExplicitly()
    expect(result.saved).toBe(true)
    expect(ClosetService.saveCloset).toHaveBeenCalledTimes(1)
    expect(store.currentClosetId).toBe('canonical-db-id')
    expect(store.closets.filter((c) => c.name.toLowerCase() === 'test two').length).toBe(1)
  })
})
