// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import OpenDesignModal from '../src/components/OpenDesignModal.vue'
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

describe('OpenDesignModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('lists saved designs with Open button, asks confirmation, and loads all cabinet info on Yes', async () => {
    localStorage.setItem('access_token', 'mock_token_abc')

    const savedDesigns = [
      {
        id: 'closet-db-1',
        name: 'Test two',
        shelves: [
          {
            id: 'tower-1',
            label: 'Shelves 1',
            categoryCode: 'CAS',
            categoryName: 'Shelves',
            catalogId: 190,
            width: 30,
            height: 84,
            depth: 23,
            outset: 0,
            elevation: 0,
            wallId: 'wall-1',
            positionAlongWall: 0.5,
            boxCount: 2,
            accessories: [{ id: 'acc-1', type: 'rod' }],
          },
        ],
        cabinet: { thickness: 0.75, depth: 23, height: 84, width: 96 },
        materials: { finishId: 'miami-linen' },
        created_at: '2026-11-23T19:15:56Z',
        updated_at: '2026-11-23T19:25:55Z',
      },
    ]

    vi.mocked(ClosetService.getClosets).mockResolvedValueOnce(savedDesigns)
    vi.mocked(ClosetService.getClosetById).mockResolvedValueOnce(savedDesigns[0])

    const store = useClosetStore()
    store.createCloset('Old Local Only Design')
    store.addTower()

    const wrapper = mount(OpenDesignModal, {
      props: { open: true },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Test two')
    expect(wrapper.text()).not.toContain('Old Local Only Design')
    const openBtn = wrapper.find('[data-testid="open-design-btn-closet-db-1"]')
    expect(openBtn.exists()).toBe(true)
    expect(openBtn.text()).toBe('Open')

    await openBtn.trigger('click')
    expect(wrapper.text()).toContain('Opening this design will replace the existing design in the room.')

    const yesBtn = wrapper.find('[data-testid="confirm-open-yes"]')
    expect(yesBtn.exists()).toBe(true)
    await yesBtn.trigger('click')
    await vi.dynamicImportSettled()
    await flushPromises()

    expect(store.currentClosetId).toBe('closet-db-1')
    expect(store.currentClosetName).toBe('Test two')
    expect(store.towers).toHaveLength(1)
    expect(store.towers[0]).toMatchObject({
      id: 'tower-1',
      label: 'Shelves 1',
      categoryCode: 'CAS',
      catalogId: 190,
      width: 30,
      height: 84,
      depth: 23,
    })
    expect(store.towers[0].accessories).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
