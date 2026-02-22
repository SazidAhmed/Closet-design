// ---------------------------------------------------------------------------
// History & Persistence store — undo/redo + localStorage save/load
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useClosetStore } from './useClosetStore'
import { useRoomStore } from './useRoomStore'

const STORAGE_KEY = 'closet-design-save'
const MAX_HISTORY = 50

type Snapshot = {
  closet: string // JSON-stringified closet state
  room: string   // JSON-stringified room state
}

export const useHistoryStore = defineStore('history', {
  state: () => ({
    undoStack: [] as Snapshot[],
    redoStack: [] as Snapshot[],
    /** Suppress recording while we are replaying a snapshot */
    _replaying: false,
    /** Debounce timer for auto-save */
    _saveTimer: null as ReturnType<typeof setTimeout> | null,
  }),

  getters: {
    canUndo: (state) => state.undoStack.length > 0,
    canRedo: (state) => state.redoStack.length > 0,
  },

  actions: {
    // ── Snapshot helpers ──────────────────────────────────────────────────
    _takeSnapshot(): Snapshot {
      const closet = useClosetStore()
      const room = useRoomStore()
      return {
        closet: JSON.stringify(closet.$state),
        room: JSON.stringify(room.$state),
      }
    },

    _applySnapshot(snap: Snapshot) {
      this._replaying = true
      try {
        const closet = useClosetStore()
        const room = useRoomStore()
        closet.$patch(JSON.parse(snap.closet))
        room.$patch(JSON.parse(snap.room))
      } finally {
        this._replaying = false
      }
    },

    // ── Record state change ──────────────────────────────────────────────
    /** Push the current state onto the undo stack. Call BEFORE a change. */
    record() {
      if (this._replaying) return
      this.undoStack.push(this._takeSnapshot())
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift()
      // Any new change invalidates the redo stack
      this.redoStack.splice(0)
    },

    // ── Undo / Redo ──────────────────────────────────────────────────────
    undo() {
      if (!this.canUndo) return
      // Save current state for redo
      this.redoStack.push(this._takeSnapshot())
      const snap = this.undoStack.pop()!
      this._applySnapshot(snap)
    },

    redo() {
      if (!this.canRedo) return
      // Save current state for undo
      this.undoStack.push(this._takeSnapshot())
      const snap = this.redoStack.pop()!
      this._applySnapshot(snap)
    },

    // ── LocalStorage persistence ─────────────────────────────────────────
    saveToLocalStorage() {
      try {
        const snap = this._takeSnapshot()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
      } catch { /* quota exceeded — silently ignore */ }
    },

    loadFromLocalStorage(): boolean {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return false
        const snap: Snapshot = JSON.parse(raw)
        if (!snap.closet || !snap.room) return false
        this._applySnapshot(snap)
        // Clear history since we loaded a fresh state
        this.undoStack.splice(0)
        this.redoStack.splice(0)
        return true
      } catch {
        return false
      }
    },

    clearSave() {
      localStorage.removeItem(STORAGE_KEY)
    },

    // ── Auto-save with debounce ──────────────────────────────────────────
    scheduleAutoSave() {
      if (this._saveTimer !== null) clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => {
        this.saveToLocalStorage()
        this._saveTimer = null
      }, 1500)
    },

    // ── Watch stores for changes ─────────────────────────────────────────
    /** Call once from App.vue or a plugin to start recording + auto-saving. */
    startWatching() {
      const closet = useClosetStore()
      const room = useRoomStore()

      // Record undo snapshots and auto-save on every state change
      watch(
        () => JSON.stringify(closet.$state) + JSON.stringify(room.$state),
        () => {
          if (this._replaying) return
          this.record()
          this.scheduleAutoSave()
        },
      )
    },
  },
})
