import {
  formatTradeWindPeriod,
  parseCpcTradeWindIndex,
  periodTimestamp,
  pointKey,
  type TradeWindData,
  type TradeWindPoint,
  type TradeWindRegion,
  type TradeWindResponse,
} from '../src/data/tradeWind.js'

const CPC_ROOT = 'https://www.cpc.ncep.noaa.gov/data/indices'
const REGIONS: TradeWindRegion[] = ['west', 'central', 'east']
const FILES: Record<TradeWindRegion, string> = { west: 'wpac850', central: 'cpac850', east: 'epac850' }

async function fetchRegion(region: TradeWindRegion) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(`${CPC_ROOT}/${FILES[region]}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'El-Nino-Watch/1.0 (NOAA CPC index monitor)' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return parseCpcTradeWindIndex(await response.text())
  } finally {
    clearTimeout(timeout)
  }
}

function latestSharedPeriod(series: Partial<Record<TradeWindRegion, TradeWindPoint[]>>) {
  const available = REGIONS.filter((region) => series[region]?.length)
  if (!available.length) return null
  const shared = new Set(series[available[0]]!.map(pointKey))
  for (const region of available.slice(1)) {
    const keys = new Set(series[region]!.map(pointKey))
    for (const key of shared) if (!keys.has(key)) shared.delete(key)
  }
  return [...shared].sort().at(-1) ?? null
}

export async function GET() {
  const fetchedAt = new Date().toISOString()
  const results = await Promise.allSettled(REGIONS.map(fetchRegion))
  const series: Partial<Record<TradeWindRegion, TradeWindPoint[]>> = {}
  const errors: string[] = []

  results.forEach((result, index) => {
    const region = REGIONS[index]
    if (result.status === 'fulfilled') series[region] = result.value
    else errors.push(`${region}: ${result.reason instanceof Error ? result.reason.message : 'unknown CPC error'}`)
  })

  const periodKey = latestSharedPeriod(series)
  const values: Record<TradeWindRegion, number | null> = { west: null, central: null, east: null }
  if (periodKey) {
    for (const region of REGIONS) values[region] = series[region]?.find((point) => pointKey(point) === periodKey)?.value ?? null
  }
  const successfulRegions = REGIONS.filter((region) => values[region] !== null).length
  const data: TradeWindData = {
    ...values,
    period: formatTradeWindPeriod(periodKey),
    updatedAt: periodTimestamp(periodKey),
  }
  const body: TradeWindResponse = {
    meta: {
      health: successfulRegions === 3 ? 'healthy' : successfulRegions > 0 ? 'degraded' : 'failed',
      fetchedAt,
      successfulRegions,
      error: errors.length ? errors.join('; ') : periodKey ? null : 'No shared valid CPC observation period',
    },
    data,
  }

  return Response.json(body, {
    status: successfulRegions ? 200 : 503,
    headers: {
      'Cache-Control': successfulRegions ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Trade-Wind-Source': 'NOAA-CPC-850hPa-Trade-Wind-Index',
    },
  })
}
