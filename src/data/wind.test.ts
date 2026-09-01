import { describe, expect, it } from 'vitest'
import { SST_MAP_GEOMETRY } from './sstMap'
import { advect, healthForWindTimestamp, interpolateWind, projectWindPoint, type WindField } from './wind'
import { buildGfsWindUrl, candidateGfsCycles } from './windServer'

function field(uValue = 5, vValue = 2): WindField {
  return {
    source: 'NOAA/NCEP GFS',
    runTimestamp: '2026-09-01T00:00:00.000Z',
    validTimestamp: '2026-09-01T00:00:00.000Z',
    levelMeters: 10,
    units: 'm s-1',
    west: 120,
    east: 280,
    south: -20,
    north: 20,
    width: 161,
    height: 41,
    u: Array(6_601).fill(uValue),
    v: Array(6_601).fill(vValue),
  }
}

describe('GFS wind source', () => {
  it('searches six-hour cycles newest-first over 36 hours', () => {
    const cycles = candidateGfsCycles(new Date('2026-09-01T17:30:00Z'))
    expect(cycles).toHaveLength(7)
    expect(cycles[0].toISOString()).toBe('2026-09-01T12:00:00.000Z')
    expect(cycles.at(-1)?.toISOString()).toBe('2026-08-31T00:00:00.000Z')
  })

  it('requests only Pacific 10 m U/V analysis fields', () => {
    const url = new URL(buildGfsWindUrl(new Date('2026-08-31T00:00:00Z')))
    expect(url.searchParams.get('file')).toBe('gfs.t00z.pgrb2.0p25.f000')
    expect(url.searchParams.get('var_UGRD')).toBe('on')
    expect(url.searchParams.get('var_VGRD')).toBe('on')
    expect(url.searchParams.get('lev_10_m_above_ground')).toBe('on')
    expect([url.searchParams.get('leftlon'), url.searchParams.get('rightlon'), url.searchParams.get('bottomlat'), url.searchParams.get('toplat')]).toEqual(['120', '280', '-20', '20'])
  })

  it('interpolates the compact grid and preserves meteorological directions', () => {
    expect(interpolateWind(field(), 200.5, 0.5)).toEqual({ u: 5, v: 2 })
    const eastNorth = advect(200, 0, { u: 5, v: 2 }, 3_600)
    const westSouth = advect(200, 0, { u: -5, v: -2 }, 3_600)
    expect(eastNorth.longitude).toBeGreaterThan(200)
    expect(eastNorth.latitude).toBeGreaterThan(0)
    expect(westSouth.longitude).toBeLessThan(200)
    expect(westSouth.latitude).toBeLessThan(0)
    expect(projectWindPoint(eastNorth.longitude, eastNorth.latitude, 1_000, 250).x).toBeGreaterThan(projectWindPoint(200, 0, 1_000, 250).x)
    expect(projectWindPoint(eastNorth.longitude, eastNorth.latitude, 1_000, 250).y).toBeLessThan(projectWindPoint(200, 0, 1_000, 250).y)
  })

  it('uses healthy, degraded and failed freshness thresholds', () => {
    const now = new Date('2026-09-01T18:00:00Z').getTime()
    expect(healthForWindTimestamp('2026-09-01T07:00:00Z', now)).toBe('healthy')
    expect(healthForWindTimestamp('2026-09-01T04:00:00Z', now)).toBe('degraded')
    expect(healthForWindTimestamp('2026-08-31T23:00:00Z', now)).toBe('failed')
  })

  it('shares the exact SST Niño 3.4 geometry', () => {
    expect(SST_MAP_GEOMETRY.nino34).toMatchObject({ leftPercent: 43.75, topPercent: 37.5, widthPercent: 31.25, heightPercent: 25 })
  })
})
