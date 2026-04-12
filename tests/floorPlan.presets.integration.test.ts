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

describe('FloorPlan quick preset replacement confirmation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('requires confirmation on non-empty layouts and applies preset after confirm', async () => {
    setActivePinia(createPinia())
    const roomStore = useRoomStore()

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
          teleport: true,
        },
      },
    })

    const initialWallCount = roomStore.walls.length

    const presetButton = findButtonByText(wrapper, 'Open U 100 x 100')
    expect(presetButton).toBeTruthy()

    await presetButton!.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Replace Current Layout?')
    expect(roomStore.walls.length).toBe(initialWallCount)

    const cancelButton = findButtonByText(wrapper, 'Cancel')
    expect(cancelButton).toBeTruthy()
    await cancelButton!.trigger('click')
    await nextTick()

    expect(wrapper.text()).not.toContain('Replace Current Layout?')
    expect(roomStore.walls.length).toBe(initialWallCount)

    await presetButton!.trigger('click')
    await nextTick()

    const replaceButton = findButtonByText(wrapper, 'Replace Layout')
    expect(replaceButton).toBeTruthy()
    await replaceButton!.trigger('click')
    await nextTick()

    expect(wrapper.text()).not.toContain('Replace Current Layout?')
    expect(roomStore.walls.length).toBe(5)
    expect(roomStore.shape).toBe('custom')

    wrapper.unmount()
  })
})
