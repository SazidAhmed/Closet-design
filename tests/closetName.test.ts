// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useClosetStore } from '../src/stores/useClosetStore'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useAppStore } from '../src/stores/useAppStore'
import { useHistoryStore } from '../src/stores/useHistoryStore'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import BuildCloset from '../src/features/closet/views/BuildCloset.vue'

// Mock vue-router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => ({
    query: {},
  }),
}))

describe('Closet Name Feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockClear()
  })

  describe('useClosetStore state and actions', () => {
    it('initializes with empty closets array and empty currentClosetName', () => {
      const closet = useClosetStore()
      expect(Array.isArray(closet.closets)).toBe(true)
      expect(closet.closets.length).toBe(0)
      expect(closet.currentClosetName).toBe('')
      expect(closet.currentClosetId).toBeNull()
    })

    it('creates a closet record in closets array with createCloset()', () => {
      const closet = useClosetStore()
      const record = closet.createCloset('Master Bedroom Closet')

      expect(closet.closets.length).toBe(1)
      expect(closet.closets[0].name).toBe('Master Bedroom Closet')
      expect(closet.closets[0].id).toBe(record.id)
      expect(closet.currentClosetId).toBe(record.id)
      expect(closet.currentClosetName).toBe('Master Bedroom Closet')
      expect(closet.currentCloset?.name).toBe('Master Bedroom Closet')
    })

    it('can create multiple closets in the array', () => {
      const closet = useClosetStore()
      closet.createCloset('Closet 1')
      closet.createCloset('Closet 2')

      expect(closet.closets.length).toBe(2)
      expect(closet.closets[0].name).toBe('Closet 1')
      expect(closet.closets[1].name).toBe('Closet 2')
      expect(closet.currentClosetName).toBe('Closet 2')
    })

    it('updates current closet name with setClosetName()', () => {
      const closet = useClosetStore()
      closet.createCloset('Original Name')
      closet.setClosetName('Updated Name')

      expect(closet.currentClosetName).toBe('Updated Name')
      expect(closet.closets[0].name).toBe('Updated Name')
    })

    it('exports closetName and closets in exportForBackend', () => {
      const closet = useClosetStore()
      closet.createCloset('Guest Closet')
      const exported = closet.exportForBackend

      expect(exported.closetName).toBe('Guest Closet')
      expect(Array.isArray(exported.closets)).toBe(true)
      expect(exported.closets.length).toBe(1)
      expect(exported.closets[0].name).toBe('Guest Closet')
    })
  })

  describe('FloorPlan "Build Closet" Popup', () => {
    it('shows popup dialog with "Enter closet name" when "Build Closet" is clicked', async () => {
      const room = useRoomStore()
      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      ] as any

      const wrapper = mount(FloorPlan, {
        attachTo: document.body,
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
            Teleport: true,
          },
        },
      })

      await nextTick()

      // Dialog should initially not be visible
      expect(wrapper.find('.closet-name-dialog-box').exists()).toBe(false)

      // Click "Build Closet" button
      const buildBtn = wrapper.find('.build-closet-btn')
      expect(buildBtn.exists()).toBe(true)
      await buildBtn.trigger('click')
      await nextTick()

      // Dialog should now be open
      const dialog = wrapper.find('.closet-name-dialog-box')
      expect(dialog.exists()).toBe(true)
      expect(dialog.find('.dialog-title').text()).toContain('Enter Closet Name')

      const input = dialog.find('.dialog-text-input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toContain('Enter closet name')
    })

    it('creates closet array item in Pinia and navigates to build on Proceed', async () => {
      const closet = useClosetStore()
      const room = useRoomStore()
      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      ] as any

      const wrapper = mount(FloorPlan, {
        attachTo: document.body,
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
            Teleport: true,
          },
        },
      })

      await nextTick()

      // Open dialog
      await wrapper.find('.build-closet-btn').trigger('click')
      await nextTick()

      const input = wrapper.find('.dialog-text-input')
      await input.setValue('Walk-in Wardrobe')

      // Click Proceed button
      const proceedBtn = wrapper.findAll('.dialog-btn.apply').find((btn) => btn.text().includes('Proceed'))
      expect(proceedBtn).toBeDefined()
      await proceedBtn!.trigger('click')
      await nextTick()

      // Check Pinia array was created / populated
      expect(closet.closets.length).toBe(1)
      expect(closet.closets[0].name).toBe('Walk-in Wardrobe')
      expect(closet.currentClosetName).toBe('Walk-in Wardrobe')

      // Check navigation
      expect(pushMock).toHaveBeenCalledWith('/closet/build')
    })
  })

  describe('Top Nav Title Display', () => {
    it('displays the closet title badge in BuildCloset top nav', async () => {
      const closet = useClosetStore()
      closet.createCloset('Luxury Master Closet')

      const wrapper = mount(BuildCloset, {
        global: {
          stubs: {
            TopToolbar: {
              template: '<header class="mock-toolbar"><slot name="title" /></header>',
            },
            FooterBar: true,
            FloorPlan: true,
            RoomPlanPreview: true,
          },
        },
      })

      await nextTick()

      const badge = wrapper.find('.toolbar-title-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('Luxury Master Closet')
    })

    it('displays the closet title badge in FloorPlan top nav when a closet name exists', async () => {
      const closet = useClosetStore()
      closet.createCloset('Hallway Closet')

      const wrapper = mount(FloorPlan, {
        global: {
          stubs: {
            TopToolbar: {
              template: '<header class="mock-toolbar"><slot name="title" /></header>',
            },
            FooterBar: true,
            Teleport: true,
          },
        },
      })

      await nextTick()

      const badge = wrapper.find('.toolbar-title-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('Hallway Closet')
    })
  })
})
