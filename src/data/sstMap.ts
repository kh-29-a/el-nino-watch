import type { SstMapData } from './enso.js'

export const SST_MAP_GEOMETRY = {
  longitude: [120, 280] as const,
  latitude: [-20, 20] as const,
  nino34: {
    longitude: [190, 240] as const,
    latitude: [-5, 5] as const,
    leftPercent: 43.75,
    topPercent: 37.5,
    widthPercent: 31.25,
    heightPercent: 25,
  },
}

export function buildSstWmsUrl(time: string, width = 1200, height = 300) {
  const dataset = 'jplMURSST41anom1day_Lon0360'
  const parameters = new URLSearchParams({
    service: 'WMS', version: '1.3.0', request: 'GetMap',
    // WMS 1.3 EPSG:4326 uses latitude,longitude axis order.
    bbox: '-20,120,20,280', crs: 'EPSG:4326',
    width: String(width), height: String(height),
    layers: `Land,${dataset}:sstAnom,Coastlines`, styles: '',
    format: 'image/png', transparent: 'FALSE', bgcolor: '0xEEF1F2', time,
  })
  return `https://coastwatch.pfeg.noaa.gov/erddap/wms/${dataset}/request?${parameters}`
}

interface ErddapInfo {
  table?: {
    columnNames?: string[]
    rows?: unknown[][]
  }
}

export function parseSstMapInfo(payload: unknown): SstMapData {
  const info = payload as ErddapInfo
  const columns = info.table?.columnNames
  const rows = info.table?.rows
  if (!Array.isArray(columns) || !Array.isArray(rows)) throw new Error('ERDDAP metadata table is missing')

  const column = (name: string) => columns.indexOf(name)
  const rowTypeIndex = column('Row Type')
  const variableIndex = column('Variable Name')
  const attributeIndex = column('Attribute Name')
  const valueIndex = column('Value')
  if ([rowTypeIndex, variableIndex, attributeIndex, valueIndex].some((index) => index < 0)) {
    throw new Error('ERDDAP metadata columns are incomplete')
  }

  const attribute = (name: string) => rows.find((row) => row[rowTypeIndex] === 'attribute' && row[variableIndex] === 'NC_GLOBAL' && row[attributeIndex] === name)?.[valueIndex]
  const hasVariable = rows.some((row) => row[rowTypeIndex] === 'variable' && row[variableIndex] === 'sstAnom')
  if (!hasVariable) throw new Error('ERDDAP anomaly variable sstAnom is missing')

  const longitudeMin = Number(attribute('geospatial_lon_min'))
  const longitudeMax = Number(attribute('geospatial_lon_max'))
  if (longitudeMin !== 0 || longitudeMax < 359.9) throw new Error('ERDDAP dataset is not the required 0–360 longitude version')

  const observationTimestamp = String(attribute('time_coverage_end') ?? '')
  if (!observationTimestamp || Number.isNaN(new Date(observationTimestamp).getTime())) {
    throw new Error('ERDDAP observation timestamp is missing')
  }

  return {
    datasetId: 'jplMURSST41anom1day_Lon0360',
    variable: 'sstAnom',
    observationTimestamp,
    imageUrl: `https://el-nino-watch.vercel.app/api/sst-map?time=${encodeURIComponent(observationTimestamp)}`,
    mode: 'anomaly',
  }
}
