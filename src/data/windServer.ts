import { decodeFieldValues, parseFields, parseGrid, parseProduct, splitMessages, type GribField, type LatLonGrid } from '@azohra/meteo.grib'
import { healthForWindTimestamp, type WindField } from './wind.js'

const CYCLE_HOURS = [0, 6, 12, 18]
const HOUR_MS = 3_600_000

export function candidateGfsCycles(now = new Date()) {
  const latest = new Date(now)
  latest.setUTCMinutes(0, 0, 0)
  latest.setUTCHours(Math.floor(latest.getUTCHours() / 6) * 6)
  const candidates: Date[] = []
  for (let age = 0; age <= 36; age += 6) {
    const candidate = new Date(latest.getTime() - age * HOUR_MS)
    if (CYCLE_HOURS.includes(candidate.getUTCHours())) candidates.push(candidate)
  }
  return candidates
}

export function buildGfsWindUrl(cycle: Date) {
  const date = cycle.toISOString().slice(0, 10).replaceAll('-', '')
  const hour = cycle.getUTCHours().toString().padStart(2, '0')
  const parameters = new URLSearchParams({
    file: `gfs.t${hour}z.pgrb2.0p25.f000`,
    var_UGRD: 'on',
    var_VGRD: 'on',
    lev_10_m_above_ground: 'on',
    subregion: '',
    leftlon: '120',
    rightlon: '280',
    toplat: '20',
    bottomlat: '-20',
    dir: `/gfs.${date}/${hour}/atmos`,
  })
  return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?${parameters}`
}

function timestamp(field: GribField) {
  const id = field.identification
  return new Date(Date.UTC(id.year, id.month - 1, id.day, id.hour, id.minute, id.second))
}

function assertGrid(field: GribField): LatLonGrid {
  const grid = parseGrid(field.section3)
  if (grid.kind !== 'latlon' || grid.ni !== 641 || grid.nj !== 161 || grid.numberOfDataPoints !== 103_201) throw new Error('GFS wind grid dimensions are invalid')
  if (grid.latitudeOfFirstGridPoint !== -20 || grid.latitudeOfLastGridPoint !== 20 || grid.longitudeOfFirstGridPoint !== 120 || grid.longitudeOfLastGridPoint !== 280) throw new Error('GFS wind grid bounds are invalid')
  if (grid.iDirectionIncrement !== 0.25 || grid.jDirectionIncrement !== 0.25 || grid.iScansNegatively || !grid.jScansPositively || grid.jPointsAreConsecutive) throw new Error('GFS wind grid orientation is unsupported')
  return grid
}

export function decodeGfsWind(buffer: ArrayBuffer, now = Date.now()): WindField {
  const fields = splitMessages(new Uint8Array(buffer)).flatMap((message) => parseFields(message))
  const components = new Map<number, GribField>()
  for (const field of fields) {
    const product = parseProduct(field.section4)
    const level = product.scaledValueOfFirstFixedSurface! * 10 ** -(product.scaleFactorOfFirstFixedSurface ?? 0)
    if (field.discipline === 0 && product.parameterCategory === 2 && [2, 3].includes(product.parameterNumber) && product.typeOfFirstFixedSurface === 103 && level === 10 && product.forecastTime === 0) {
      components.set(product.parameterNumber, field)
    }
  }
  const uField = components.get(2)
  const vField = components.get(3)
  if (!uField || !vField || components.size !== 2) throw new Error('GFS response does not contain 10 m U and V analysis fields')
  const uGrid = assertGrid(uField)
  const vGrid = assertGrid(vField)
  if (uGrid.gridKey !== vGrid.gridKey) throw new Error('GFS U/V grids do not match')
  const run = timestamp(uField)
  if (run.getTime() !== timestamp(vField).getTime()) throw new Error('GFS U/V timestamps do not match')
  const validTimestamp = run.toISOString()
  if (healthForWindTimestamp(validTimestamp, now) === 'failed') throw new Error('GFS wind analysis is older than 18 hours')

  const decodedU = decodeFieldValues(uField)
  const decodedV = decodeFieldValues(vField)
  if (decodedU.missingCount || decodedV.missingCount) throw new Error('GFS wind analysis contains missing values')
  const u: number[] = []
  const v: number[] = []
  for (let row = 0; row < 161; row += 4) {
    for (let column = 0; column < 641; column += 4) {
      const index = row * 641 + column
      const uValue = decodedU.values[index]
      const vValue = decodedV.values[index]
      if (!Number.isFinite(uValue) || !Number.isFinite(vValue)) throw new Error('GFS wind analysis contains invalid values')
      u.push(Math.round(uValue * 100) / 100)
      v.push(Math.round(vValue * 100) / 100)
    }
  }
  if (u.length !== 6_601 || v.length !== 6_601) throw new Error('Downsampled GFS wind grid is incomplete')
  return {
    source: 'NOAA/NCEP GFS',
    runTimestamp: run.toISOString(),
    validTimestamp,
    levelMeters: 10,
    units: 'm s-1',
    west: 120,
    east: 280,
    south: -20,
    north: 20,
    width: 161,
    height: 41,
    u,
    v,
  }
}
