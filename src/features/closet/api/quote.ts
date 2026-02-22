import type { ClosetStateV2 } from '../domain/schema'
import { exportForBackend } from '../domain/schema'

export type QuoteLineItem = Readonly<{
  sku: string
  description: string
  qty: number
  unitPrice: number
  total: number
}>

export type QuoteResponse = Readonly<{
  currency: string
  total: number
  lineItems: QuoteLineItem[]
  warnings?: string[]
}>

export type QuoteRequest = ReturnType<typeof exportForBackend>

export async function fetchQuote(payload: QuoteRequest, opts?: { signal?: AbortSignal }): Promise<QuoteResponse> {
  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: opts?.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Quote request failed (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as QuoteResponse
}

export function buildQuoteRequestFromState(state: ClosetStateV2): QuoteRequest {
  return exportForBackend(state)
}
