export const WIND_BOUNDS = {
  west: 120,
  east: 280,
  south: -20,
  north: 20,
} as const

export interface WindField {
  source: 'NOAA/NCEP GFS'
  runTimestamp: string
  validTimestamp: string
  levelMeters: 10
  units: 'm s-1'
  west: 120
  east: 280
  south: -20
  north: 20
  width: 161
  height: 41
  u: number[]
  v: number[]
}

export type WindHealth = 'healthy' | 'degraded' | 'failed'

export interface WindResponse {
  meta: {
    health: WindHealth
    fetchedAt: string
    dataTimestamp: string | null
    error: string | null
  }
  data: WindField | null
}

export interface WindVector { u: number; v: number }

export function interpolateWind(field: WindField, longitude: number, latitude: number): WindVector | null {
  if (longitude < field.west || longitude > field.east || latitude < field.south || latitude > field.north) return null
  const x = ((longitude - field.west) / (field.east - field.west)) * (field.width - 1)
  const y = ((latitude - field.south) / (field.north - field.south)) * (field.height - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, field.width - 1)
  const y1 = Math.min(y0 + 1, field.height - 1)
  const tx = x - x0
  const ty = y - y0
  const sample = (values: number[], row: number, column: number) => values[row * field.width + column]
  const blend = (values: number[]) => {
    const south = sample(values, y0, x0) * (1 - tx) + sample(values, y0, x1) * tx
    const north = sample(values, y1, x0) * (1 - tx) + sample(values, y1, x1) * tx
    return south * (1 - ty) + north * ty
  }
  const u = blend(field.u)
  const v = blend(field.v)
  return Number.isFinite(u) && Number.isFinite(v) ? { u, v } : null
}

export function advect(longitude: number, latitude: number, vector: WindVector, simulatedSeconds: number) {
  const metersPerDegreeLatitude = 111_320
  const metersPerDegreeLongitude = Math.max(10_000, metersPerDegreeLatitude * Math.cos(latitude * Math.PI / 180))
  return {
    longitude: longitude + vector.u * simulatedSeconds / metersPerDegreeLongitude,
    latitude: latitude + vector.v * simulatedSeconds / metersPerDegreeLatitude,
  }
}

export function projectWindPoint(longitude: number, latitude: number, width: number, height: number) {
  return {
    x: ((longitude - WIND_BOUNDS.west) / (WIND_BOUNDS.east - WIND_BOUNDS.west)) * width,
    y: ((WIND_BOUNDS.north - latitude) / (WIND_BOUNDS.north - WIND_BOUNDS.south)) * height,
  }
}

export function healthForWindTimestamp(timestamp: string, now = Date.now()): WindHealth {
  const age = now - new Date(timestamp).getTime()
  if (!Number.isFinite(age) || age < -60 * 60_000 || age > 18 * 60 * 60_000) return 'failed'
  return age <= 12 * 60 * 60_000 ? 'healthy' : 'degraded'
}
