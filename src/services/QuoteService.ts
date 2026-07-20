import http from "@/http-common";
import type { ClosetStateV2 } from "../features/closet/domain/schema";
import { exportForBackend } from "../features/closet/domain/schema";

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

export default {
  buildQuoteRequestFromState(state: ClosetStateV2): QuoteRequest {
    return exportForBackend(state);
  },

  async fetchQuote(payload: QuoteRequest, opts?: { signal?: AbortSignal }): Promise<QuoteResponse> {
    const response = await http.post("/quote", payload, {
      signal: opts?.signal
    });
    return response.data as QuoteResponse;
  }
};
