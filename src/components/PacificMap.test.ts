import { describe, expect, it } from 'vitest'
import { createPacificProjection, TRADE_WIND_REGIONS } from '../data/tradeWindMap'

describe('Pacific trade-wind map', () => {
  it('projects the Pacific continuously with Asia left and the Americas right', () => {
    const projection = createPacificProjection()
    const asia = projection([120, 0])
    const dateline = projection([180, 0])
    const americas = projection([-80, 0])
    expect(asia?.[0]).toBeCloseTo(0, 5)
    expect(dateline?.[0]).toBeCloseTo(375, 5)
    expect(americas?.[0]).toBeCloseTo(1000, 5)
    expect(asia![0]).toBeLessThan(dateline![0])
    expect(dateline![0]).toBeLessThan(americas![0])
  })

  it('uses CPC region bounds rather than the Niño 3.4 SST region', () => {
    expect(TRADE_WIND_REGIONS).toEqual([
      expect.objectContaining({ key: 'west', west: 135, east: 180 }),
      expect.objectContaining({ key: 'central', west: 185, east: 220 }),
      expect.objectContaining({ key: 'east', west: 225, east: 240 }),
    ])
  })
})
