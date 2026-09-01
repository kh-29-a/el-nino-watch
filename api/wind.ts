import { buildGfsWindUrl, candidateGfsCycles, decodeGfsWind } from '../src/data/windServer.js'
import { healthForWindTimestamp, type WindResponse } from '../src/data/wind.js'

async function fetchCycle(cycle: Date, now: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(buildGfsWindUrl(cycle), { signal: controller.signal })
    if (!response.ok) throw new Error(`NOMADS returned HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength < 16 || new TextDecoder().decode(buffer.slice(0, 4)) !== 'GRIB') throw new Error('NOMADS did not return GRIB2 data')
    return decodeGfsWind(buffer, now)
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  const now = Date.now()
  const fetchedAt = new Date(now).toISOString()
  const errors: string[] = []
  for (const cycle of candidateGfsCycles(new Date(now))) {
    try {
      const data = await fetchCycle(cycle, now)
      const body: WindResponse = {
        meta: { health: healthForWindTimestamp(data.validTimestamp, now), fetchedAt, dataTimestamp: data.validTimestamp, error: null },
        data,
      }
      return Response.json(body, {
        headers: {
          'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=21600',
          'Access-Control-Allow-Origin': '*',
          'X-Wind-Source': 'NOAA-NCEP-GFS',
          'X-Wind-Level': '10m-above-ground',
          'X-Wind-Bbox-0360': '120,280,-20,20',
        },
      })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown GFS error')
    }
  }
  const body: WindResponse = {
    meta: { health: 'failed', fetchedAt, dataTimestamp: null, error: `No usable GFS analysis: ${errors.at(-1) ?? 'no cycles available'}` },
    data: null,
  }
  return Response.json(body, { status: 503, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } })
}
