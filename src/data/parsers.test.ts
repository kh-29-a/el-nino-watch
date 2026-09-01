import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET as handler } from '../../api/enso'
import { parseNino34, parseOni, parseSoi } from './parsers'
import { parseEnsoOutlook } from './outlookParser'
import { parseSstMapInfo, SST_MAP_GEOMETRY } from './sstMap'

const weeklyFixture = `
Weekly SST data starts week centered on 2Sept1981
                Nino1+2      Nino3        Nino34        Nino4
 Week          SST SSTA     SST SSTA     SST SSTA     SST SSTA
 12AUG2026     25.0 4.0     28.4 3.2     29.6 2.7     29.7 1.0
 19AUG2026     24.8 4.0     28.3 3.3     29.4 2.6     29.5 0.8
`

const soiFixture = `
(STAND TAHITI - STAND DARWIN) SEA LEVEL PRESSURE ANOMALY
YEAR JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC
2025 0.2 0.5 1.7 0.5 0.4 0.3 0.6 0.4 0.0 1.1 1.1 -0.0
2026 1.1 1.4 1.2 -0.6 -0.9 -1.4 -2.4-999.9-999.9-999.9-999.9-999.9
`

const oniFixture = `
SEAS YR TOTAL ANOM
FMA 2026 27.34 0.11
MAM 2026 28.09 0.46
AMJ 2026 28.74 0.95
MJJ 2026 29.02 1.39
`

const outlookFixture = `
<html><body><div class="probabilities-description"><h2>Issued August 2026</h2></div>
<table><caption>ENSO Probabilities</caption><tbody>
<tr><th>Season</th><th>La Niña</th><th>Neutral</th><th>El Niño</th></tr>
<tr><th><abbr>JAS <span>Jul Aug Sep</span></abbr></th><td>0</td><td>0</td><td>100</td></tr>
<tr><th><abbr>ASO</abbr></th><td>0%</td><td>3%</td><td>97%</td></tr>
</tbody></table></body></html>`

const sstMapInfoFixture = {
  table: {
    columnNames: ['Row Type', 'Variable Name', 'Attribute Name', 'Data Type', 'Value'],
    rows: [
      ['attribute', 'NC_GLOBAL', 'geospatial_lon_min', 'double', '0.0'],
      ['attribute', 'NC_GLOBAL', 'geospatial_lon_max', 'double', '359.99'],
      ['attribute', 'NC_GLOBAL', 'time_coverage_end', 'String', '2026-08-27T09:00:00Z'],
      ['variable', 'sstAnom', '', 'float', 'time, latitude, longitude'],
    ],
  },
}

describe('NOAA CPC parsers', () => {
  it('uses the documented third SST/SSTA pair for Niño 3.4', () => {
    const parsed = parseNino34(weeklyFixture)
    expect(parsed.value).toBe(2.6)
    expect(parsed.period).toBe('19AUG2026')
  })

  it('ignores SOI -999.9 sentinels even when values touch', () => {
    const parsed = parseSoi(soiFixture)
    expect(parsed.value).toBe(-2.4)
    expect(parsed.period).toBe('JUL 2026')
    expect(parsed.history.some((point) => point.value === -999.9)).toBe(false)
  })

  it('uses the final ONI anomaly column', () => {
    const parsed = parseOni(oniFixture)
    expect(parsed.value).toBe(1.39)
    expect(parsed.period).toBe('MJJ 2026')
  })

  it('maps named outlook columns and validates official probabilities', () => {
    const parsed = parseEnsoOutlook(outlookFixture)
    expect(parsed.issued).toBe('August 2026')
    expect(parsed.rows[0]).toEqual({ season: 'JAS', laNina: 0, neutral: 0, elNino: 100 })
    expect(parsed.rows[1]).toEqual({ season: 'ASO', laNina: 0, neutral: 3, elNino: 97 })
  })

  it('rejects outlook rows that do not total approximately 100%', () => {
    expect(() => parseEnsoOutlook(outlookFixture.replace('<td>97%</td>', '<td>75%</td>'))).toThrow(/total/)
  })

  it('validates the 0–360 anomaly dataset and fixed Pacific geometry', () => {
    const parsed = parseSstMapInfo(sstMapInfoFixture)
    expect(parsed.variable).toBe('sstAnom')
    expect(parsed.mode).toBe('anomaly')
    expect(SST_MAP_GEOMETRY.longitude).toEqual([120, 280])
    expect(SST_MAP_GEOMETRY.latitude).toEqual([-20, 20])
    expect(SST_MAP_GEOMETRY.nino34).toMatchObject({ leftPercent: 43.75, topPercent: 37.5, widthPercent: 31.25, heightPercent: 25 })
  })
})

describe('source independence', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns working feeds when one NOAA source fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/soi')) return Promise.resolve(new Response('', { status: 503 }))
      if (url.includes('wksst')) return Promise.resolve(new Response(weeklyFixture))
      if (url.includes('oni.ascii')) return Promise.resolve(new Response(oniFixture))
      if (url.includes('/info/jplMURSST41')) return Promise.resolve(Response.json(sstMapInfoFixture))
      if (url.includes('/wms/jplMURSST41')) return Promise.resolve(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/png' } }))
      return Promise.resolve(new Response(outlookFixture))
    }))

    const response = await handler()
    const body = await response.json()
    expect(body.overall).toBe('yellow')
    expect(body.sources.nino34.meta.success).toBe(true)
    expect(body.sources.soi.meta.success).toBe(false)
    expect(body.sources.oni.meta.success).toBe(true)
    expect(body.sources.outlook.meta.success).toBe(true)
    expect(body.sources.sstMap.meta.success).toBe(true)
  })

  it('marks status yellow and preserves current indicators when Outlook fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/probabilities/')) return Promise.resolve(new Response('', { status: 503 }))
      if (url.includes('wksst')) return Promise.resolve(new Response(weeklyFixture))
      if (url.endsWith('/soi')) return Promise.resolve(new Response(soiFixture))
      if (url.includes('/info/jplMURSST41')) return Promise.resolve(Response.json(sstMapInfoFixture))
      if (url.includes('/wms/jplMURSST41')) return Promise.resolve(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/png' } }))
      return Promise.resolve(new Response(oniFixture))
    }))

    const response = await handler()
    const body = await response.json()
    expect(body.overall).toBe('yellow')
    expect(body.sources.nino34.meta.success).toBe(true)
    expect(body.sources.soi.meta.success).toBe(true)
    expect(body.sources.oni.meta.success).toBe(true)
    expect(body.sources.outlook.meta.success).toBe(false)
    expect(body.sources.outlook.data).toBeNull()
  })
})
