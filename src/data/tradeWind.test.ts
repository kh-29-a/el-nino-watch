import { describe, expect, it } from 'vitest'
import {
  getOverallTradeWindStatus,
  interpretTradeWind,
  parseCpcTradeWindIndex,
  type TradeWindData,
} from './tradeWind'

const fixture = `
ORIGINAL DATA
2026  1 2 3 4 5 6 7 8 9 10 11 12
ANOMALY
2026  -4.9 -3.2 -2.0 -999.9 -999.9 -999.9 -999.9 -999.9 -999.9 -999.9 -999.9 -999.9
STANDARDIZED    DATA
2025  0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1.0 1.1 1.2
2026  -0.2 -0.6 -1.0 -1.4 -1.7 -1.9 -2.0-999.9-999.9-999.9-999.9-999.9
`

function data(values: [number | null, number | null, number | null]): TradeWindData {
  return { west: values[0], central: values[1], east: values[2], period: 'July 2026', updatedAt: '2026-07-01T00:00:00.000Z' }
}

describe('CPC Trade Wind Index parsing', () => {
  it('uses only standardized values and excludes -999.9 sentinels', () => {
    const points = parseCpcTradeWindIndex(fixture)
    expect(points.at(-1)).toEqual({ year: 2026, month: 7, value: -2 })
    expect(points).not.toContainEqual(expect.objectContaining({ value: -4.9 }))
    expect(points).not.toContainEqual(expect.objectContaining({ value: -999.9 }))
  })

  it('fails closed when the standardized section is missing', () => {
    expect(() => parseCpcTradeWindIndex('ANOMALY\n2026 -2.4')).toThrow(/standardized/i)
  })
})

describe('trade-wind interpretation', () => {
  it('preserves NOAA CPC sign direction', () => {
    expect(interpretTradeWind(-0.6)).toMatchObject({ label: 'Weaker ↓', tone: 'weaker' })
    expect(interpretTradeWind(0.6)).toMatchObject({ label: 'Stronger ↑', tone: 'stronger' })
    expect(interpretTradeWind(-0.5).label).toBe('Near Normal')
    expect(interpretTradeWind(0.5).label).toBe('Near Normal')
  })

  it('calculates overall states and gives mixed patterns precedence', () => {
    expect(getOverallTradeWindStatus(data([-2, -2.4, -1.4]))).toBe('WEAKER THAN NORMAL')
    expect(getOverallTradeWindStatus(data([1.1, 0.7, 0.8]))).toBe('STRONGER THAN NORMAL')
    expect(getOverallTradeWindStatus(data([0.1, -0.2, 0.3]))).toBe('NEAR NORMAL')
    expect(getOverallTradeWindStatus(data([-1, 0.8, 0]))).toBe('MIXED')
    expect(getOverallTradeWindStatus(data([null, null, null]))).toBe('DATA UNAVAILABLE')
  })
})
