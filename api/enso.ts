import type { EnsoResponse, IndicatorData, IndicatorResult, OutlookResult, SstMapResult } from '../src/data/enso.js'
import { parseNino34, parseOni, parseSoi } from '../src/data/parsers.js'
import { parseEnsoOutlook } from '../src/data/outlookParser.js'
import { buildSstWmsUrl, parseSstMapInfo } from '../src/data/sstMap.js'

const SOURCES = {
  nino34: {
    url: 'https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for',
    parse: parseNino34,
    maxAgeDays: 15,
  },
  soi: {
    url: 'https://www.cpc.ncep.noaa.gov/data/indices/soi',
    parse: parseSoi,
    maxAgeDays: 75,
  },
  oni: {
    url: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
    parse: parseOni,
    maxAgeDays: 120,
  },
} as const

const OUTLOOK_URL = 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities/'
const SST_MAP_INFO_URL = 'https://coastwatch.pfeg.noaa.gov/erddap/info/jplMURSST41anom1day_Lon0360/index.json'

async function loadSource(source: typeof SOURCES[keyof typeof SOURCES], fetchedAt: string): Promise<IndicatorResult> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('NOAA request timed out'))
      }, 8_000)
    })
    const response = await Promise.race([fetch(source.url, { signal: controller.signal }), timeout])
    if (!response.ok) throw new Error(`NOAA returned HTTP ${response.status}`)
    const data: IndicatorData = source.parse(await response.text())
    const dataTimestamp = data.history[data.history.length - 1]?.timestamp ?? null
    const age = dataTimestamp ? Date.now() - new Date(dataTimestamp).getTime() : Number.POSITIVE_INFINITY
    return {
      meta: {
        success: true,
        fetchedAt,
        dataTimestamp,
        stale: age > source.maxAgeDays * 86_400_000,
        error: null,
      },
      data,
    }
  } catch (error) {
    return {
      meta: {
        success: false,
        fetchedAt,
        dataTimestamp: null,
        stale: false,
        error: error instanceof Error ? error.message : 'Unknown source error',
      },
      data: null,
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function loadSstMap(fetchedAt: string): Promise<SstMapResult> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('NOAA CoastWatch metadata request timed out'))
      }, 8_000)
    })
    const response = await Promise.race([fetch(SST_MAP_INFO_URL, { signal: controller.signal }), timeout])
    if (!response.ok) throw new Error(`NOAA CoastWatch returned HTTP ${response.status}`)
    const data = parseSstMapInfo(await response.json())
    // A tiny fixed-crop request verifies the actual anomaly WMS layer without downloading a grid.
    const mapCheck = await fetch(buildSstWmsUrl(data.observationTimestamp, 64, 16), { signal: controller.signal })
    if (!mapCheck.ok || !(mapCheck.headers.get('content-type') ?? '').includes('image/png')) {
      throw new Error('NOAA CoastWatch anomaly WMS layer is unavailable')
    }
    const age = Date.now() - new Date(data.observationTimestamp).getTime()
    return {
      meta: {
        success: true,
        fetchedAt,
        dataTimestamp: data.observationTimestamp,
        stale: age > 6 * 86_400_000,
        error: null,
      },
      data,
    }
  } catch (error) {
    return {
      meta: {
        success: false,
        fetchedAt,
        dataTimestamp: null,
        stale: false,
        error: error instanceof Error ? error.message : 'Unknown SST map error',
      },
      data: null,
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function loadOutlook(fetchedAt: string): Promise<OutlookResult> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('NOAA outlook request timed out'))
      }, 8_000)
    })
    const response = await Promise.race([fetch(OUTLOOK_URL, { signal: controller.signal }), timeout])
    if (!response.ok) throw new Error(`NOAA returned HTTP ${response.status}`)
    const data = parseEnsoOutlook(await response.text())
    const age = Date.now() - new Date(data.issuedTimestamp).getTime()
    return {
      meta: {
        success: true,
        fetchedAt,
        dataTimestamp: data.issuedTimestamp,
        stale: age > 75 * 86_400_000,
        error: null,
      },
      data,
    }
  } catch (error) {
    return {
      meta: {
        success: false,
        fetchedAt,
        dataTimestamp: null,
        stale: false,
        error: error instanceof Error ? error.message : 'Unknown outlook error',
      },
      data: null,
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function GET() {
  const fetchedAt = new Date().toISOString()
  const [nino34, soi, oni, outlook, sstMap] = await Promise.all([
    loadSource(SOURCES.nino34, fetchedAt),
    loadSource(SOURCES.soi, fetchedAt),
    loadSource(SOURCES.oni, fetchedAt),
    loadOutlook(fetchedAt),
    loadSstMap(fetchedAt),
  ])
  const implemented = [nino34, soi, oni, outlook, sstMap]
  const successCount = implemented.filter((result) => result.meta.success).length
  const body: EnsoResponse = {
    sources: { nino34, soi, oni, outlook, sstMap },
    overall: successCount === implemented.length ? 'green' : successCount === 0 ? 'red' : 'yellow',
  }

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
