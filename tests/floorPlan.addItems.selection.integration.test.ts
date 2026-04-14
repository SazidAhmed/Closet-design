// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { useRoomStore } from '../src/stores/useRoomStore'

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text))
}

describe('FloorPlan add item selection behavior', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('auto-selects newly added door and window so size controls are visible', async () => {
    setActivePinia(createPinia())
    const roomStore = useRoomStore()

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const addDoorButton = findButtonByText(wrapper, 'Add Door')
    expect(addDoorButton).toBeTruthy()

    await addDoorButton!.trigger('click')
    await nextTick()

    expect(roomStore.items.length).toBe(1)
    expect(wrapper.text()).toContain('Selected Door')
    expect(wrapper.text()).toContain('Width')
    expect(wrapper.text()).toContain('Height')

    const addWindowButton = findButtonByText(wrapper, 'Add Window')
    expect(addWindowButton).toBeTruthy()

    await addWindowButton!.trigger('click')
    await nextTick()

    expect(roomStore.items.length).toBe(2)
    expect(wrapper.text()).toContain('Selected Window')

    wrapper.unmount()
  })
})
