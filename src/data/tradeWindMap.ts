import { geoEquirectangular } from 'd3-geo'

export const TRADE_WIND_MAP_WIDTH = 1000
export const TRADE_WIND_MAP_HEIGHT = 250

export const TRADE_WIND_REGIONS = [
  { key: 'west', label: 'West', longLabel: 'West Pacific', west: 135, east: 180 },
  { key: 'central', label: 'Central', longLabel: 'Central Pacific', west: 185, east: 220 },
  { key: 'east', label: 'East', longLabel: 'East Pacific', west: 225, east: 240 },
] as const

/** Pacific-centered equirectangular projection: 120°E–280°E and 20°S–20°N. */
export function createPacificProjection() {
  return geoEquirectangular()
    .rotate([160, 0])
    .scale(TRADE_WIND_MAP_WIDTH / (160 * Math.PI / 180))
    .translate([TRADE_WIND_MAP_WIDTH / 2, TRADE_WIND_MAP_HEIGHT / 2])
    .precision(0.1)
    .clipExtent([[0, 0], [TRADE_WIND_MAP_WIDTH, TRADE_WIND_MAP_HEIGHT]])
}
