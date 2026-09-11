export type TradeWindRegion = 'west' | 'central' | 'east'

export interface TradeWindData {
  west: number | null
  central: number | null
  east: number | null
  period: string | null
  updatedAt: string | null
}

export type TradeWindHealth = 'healthy' | 'degraded' | 'failed'

export interface TradeWindResponse {
  meta: {
    health: TradeWindHealth
    fetchedAt: string
    successfulRegions: number
    error: string | null
  }
  data: TradeWindData
}

export interface TradeWindPoint {
  year: number
  month: number
  value: number
}

export type TradeWindTone = 'weaker' | 'normal' | 'stronger' | 'unavailable'

export interface TradeWindInterpretation {
  label: 'Weaker ↓' | 'Near Normal' | 'Stronger ↑' | 'Data unavailable'
  tone: TradeWindTone
}

export type OverallTradeWindStatus =
  | 'WEAKER THAN NORMAL'
  | 'NEAR NORMAL'
  | 'STRONGER THAN NORMAL'
  | 'MIXED'
  | 'DATA UNAVAILABLE'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Parse only CPC's standardized-index table. Raw data and anomaly tables have different units. */
export function parseCpcTradeWindIndex(text: string): TradeWindPoint[] {
  const marker = /STANDARDIZED\s+DATA/i.exec(text)
  if (!marker) throw new Error('CPC standardized data section was not found')
  const rows = text.slice(marker.index + marker[0].length).split(/\r?\n/)
  const points: TradeWindPoint[] = []

  for (const row of rows) {
    const numbers = row.match(/[-+]?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    if (numbers.length < 13 || numbers[0] < 1900 || numbers[0] > 2200) continue
    const year = numbers[0]
    numbers.slice(1, 13).forEach((value, index) => {
      if (Number.isFinite(value) && value > -999) points.push({ year, month: index + 1, value })
    })
  }

  if (!points.length) throw new Error('CPC standardized data section contained no valid observations')
  return points
}

export function pointKey(point: Pick<TradeWindPoint, 'year' | 'month'>) {
  return `${point.year}-${String(point.month).padStart(2, '0')}`
}

export function formatTradeWindPeriod(key: string | null) {
  if (!key) return null
  const [year, month] = key.split('-').map(Number)
  return Number.isInteger(year) && month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${year}` : null
}

export function periodTimestamp(key: string | null) {
  if (!key) return null
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toISOString()
}

/**
 * NOAA CPC sign convention: negative means anomalous westerlies / weakened
 * easterly trades; positive means enhanced easterlies / stronger trades.
 * The ±0.5 cutoffs below are website display aids, not NOAA ENSO thresholds.
 */
export function interpretTradeWind(value: number | null): TradeWindInterpretation {
  if (value === null || !Number.isFinite(value)) return { label: 'Data unavailable', tone: 'unavailable' }
  if (value < -0.5) return { label: 'Weaker ↓', tone: 'weaker' }
  if (value > 0.5) return { label: 'Stronger ↑', tone: 'stronger' }
  return { label: 'Near Normal', tone: 'normal' }
}

export function getOverallTradeWindStatus(data: TradeWindData): OverallTradeWindStatus {
  const values = [data.west, data.central, data.east].filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return 'DATA UNAVAILABLE'
  if (values.some((value) => value > 0.5) && values.some((value) => value < -0.5)) return 'MIXED'
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (mean <= -0.5) return 'WEAKER THAN NORMAL'
  if (mean >= 0.5) return 'STRONGER THAN NORMAL'
  return 'NEAR NORMAL'
}

export function tradeWindStatusMeaning(status: OverallTradeWindStatus) {
  if (status === 'WEAKER THAN NORMAL') return 'Pattern favors El Niño'
  if (status === 'STRONGER THAN NORMAL') return 'Pattern favors La Niña'
  if (status === 'NEAR NORMAL') return 'No strong ENSO wind signal'
  if (status === 'MIXED') return 'Mixed atmospheric signal'
  return 'No current atmospheric signal available'
}
