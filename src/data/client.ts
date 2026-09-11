import type { EnsoResponse } from './enso'
import type { WindResponse } from './wind'
import type { TradeWindResponse } from './tradeWind'

let cachedRequest: Promise<EnsoResponse> | null = null
let cachedWindRequest: Promise<WindResponse> | null = null
let cachedTradeWindRequest: Promise<TradeWindResponse> | null = null

function endpoint(path: string) {
  return window.location.hostname.endsWith('edgeone.cool') ? `https://el-nino-watch.vercel.app${path}` : path
}

export function loadEnsoData() {
  if (!cachedRequest) {
    // EdgeOne hosts the static shell; its deployment reuses the Vercel serverless data endpoint.
    cachedRequest = fetch(endpoint('/api/enso'))
      .then((response) => {
        if (!response.ok) throw new Error(`Data endpoint returned HTTP ${response.status}`)
        return response.json() as Promise<EnsoResponse>
      })
      .catch((error) => {
        cachedRequest = null
        throw error
      })
  }
  return cachedRequest
}

export function loadWindData() {
  if (!cachedWindRequest) {
    cachedWindRequest = fetch(endpoint('/api/wind'))
      .then(async (response) => {
        const body = await response.json() as WindResponse
        if (!response.ok && !body.meta) throw new Error(`Wind endpoint returned HTTP ${response.status}`)
        return body
      })
      .catch((error) => {
        cachedWindRequest = null
        throw error
      })
  }
  return cachedWindRequest
}

export function loadTradeWindData() {
  if (!cachedTradeWindRequest) {
    cachedTradeWindRequest = fetch(endpoint('/api/trade-winds'))
      .then(async (response) => {
        const body = await response.json() as TradeWindResponse
        if (!response.ok && !body.meta) throw new Error(`Trade-wind endpoint returned HTTP ${response.status}`)
        return body
      })
      .catch((error) => {
        cachedTradeWindRequest = null
        throw error
      })
  }
  return cachedTradeWindRequest
}
