import { defineStore } from 'pinia'
import type { QuoteRequest, QuoteResponse } from '../api/quote'
import { fetchQuote } from '../api/quote'

function stableHash(obj: unknown) {
  // Good enough for caching/debouncing in Phase 1.
  return JSON.stringify(obj)
}

export const useQuoteStore = defineStore('closetQuote', {
  state: () => ({
    isLoading: false as boolean,
    error: null as string | null,
    result: null as QuoteResponse | null,
    lastPayloadHash: null as string | null,
    _debounceId: null as ReturnType<typeof setTimeout> | null,
    _abort: null as AbortController | null,
  }),
  actions: {
    scheduleQuote(payload: QuoteRequest, waitMs = 350) {
      const hash = stableHash(payload)
      this.lastPayloadHash = hash

      if (this._debounceId) clearTimeout(this._debounceId)

      this._debounceId = setTimeout(() => {
        // Only quote for the latest scheduled payload.
        if (this.lastPayloadHash !== hash) return
        void this.requestQuote(payload)
      }, waitMs)
    },

    async requestQuote(payload: QuoteRequest) {
      const hash = stableHash(payload)

      // Cache hit: if we already have a result for this exact payload.
      if (this.result && this.lastPayloadHash === hash && !this.error) return

      this.isLoading = true
      this.error = null

      if (this._abort) this._abort.abort()
      this._abort = new AbortController()

      try {
        const result = await fetchQuote(payload, { signal: this._abort.signal })
        // Guard against late responses.
        if (this.lastPayloadHash !== hash) return
        this.result = result
      } catch (e) {
        if (String(e).includes('AbortError')) return
        this.result = null
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        if (this.lastPayloadHash === hash) this.isLoading = false
      }
    },

    clear() {
      if (this._debounceId) clearTimeout(this._debounceId)
      this._debounceId = null
      if (this._abort) this._abort.abort()
      this._abort = null
      this.isLoading = false
      this.error = null
      this.result = null
      this.lastPayloadHash = null
    },
  },
})

