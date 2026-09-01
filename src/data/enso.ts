export type SourceState = 'success' | 'error'

export interface HistoryPoint {
  label: string
  timestamp: string
  value: number
}

export interface SourceMeta {
  success: boolean
  fetchedAt: string
  dataTimestamp: string | null
  stale: boolean
  error: string | null
}

export interface IndicatorData {
  value: number
  period: string
  interpretation: string
  description: string
  location?: string
  history: HistoryPoint[]
}

export interface IndicatorResult {
  meta: SourceMeta
  data: IndicatorData | null
}

export type EnsoForecastRow = {
  season: string
  laNina: number
  neutral: number
  elNino: number
}

export interface OutlookData {
  issued: string
  issuedTimestamp: string
  rows: EnsoForecastRow[]
}

export interface OutlookResult {
  meta: SourceMeta
  data: OutlookData | null
}

export interface SstMapData {
  datasetId: 'jplMURSST41anom1day_Lon0360'
  variable: 'sstAnom'
  observationTimestamp: string
  imageUrl: string
  mode: 'anomaly'
}

export interface SstMapResult {
  meta: SourceMeta
  data: SstMapData | null
}

export interface EnsoResponse {
  sources: {
    nino34: IndicatorResult
    soi: IndicatorResult
    oni: IndicatorResult
    outlook: OutlookResult
    sstMap: SstMapResult
  }
  overall: 'green' | 'yellow' | 'red'
}

export type SourceKey = keyof EnsoResponse['sources']
