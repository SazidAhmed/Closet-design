import { ref } from 'vue'
import { useClosetStore } from '../stores/useClosetStore'

export type SaveDesignStatus = 'idle' | 'saving' | 'saved' | 'unauthenticated' | 'error'

export function useSaveCloset() {
  const closet = useClosetStore()
  const saveStatus = ref<SaveDesignStatus>('idle')
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleReset(delay = 2500) {
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      saveStatus.value = 'idle'
    }, delay)
  }

  async function handleSaveDesign() {
    if (saveStatus.value === 'saving') return
    saveStatus.value = 'saving'
    const result = await closet.saveCurrentClosetExplicitly()
    if (result.saved) {
      saveStatus.value = 'saved'
    } else if (result.reason === 'unauthenticated') {
      saveStatus.value = 'unauthenticated'
    } else {
      saveStatus.value = 'error'
    }
    scheduleReset()
    return result
  }

  return {
    saveStatus,
    handleSaveDesign,
  }
}
