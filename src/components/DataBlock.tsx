import type { IndicatorResult } from '../data/enso'
import { LineChart } from './LineChart'

interface DataBlockProps {
  title: string
  result?: IndicatorResult
  loading: boolean
  decimals: number
  unit?: string
  referenceLines?: number[]
}

function formattedValue(value: number, decimals: number, unit = '') {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(decimals)}${unit}`
}

export function DataBlock({ title, result, loading, decimals, unit, referenceLines }: DataBlockProps) {
  const data = result?.data
  return (
    <article className="data-block">
      <div className="data-block-head">
        <h3>{title}</h3>
        <span>{data?.period ?? 'Historical series'}</span>
      </div>
      {data ? (
        <>
          <strong className="empty-value live-value">{formattedValue(data.value, decimals, unit)}</strong>
          <p className="interpretation">{data.interpretation}</p>
          <p>{data.description}</p>
          {data.location && <p className="location">{data.location}</p>}
          <LineChart data={data.history} referenceLines={referenceLines} label={`${title} historical line chart`} />
        </>
      ) : (
        <div className="data-placeholder">
          <strong className="empty-value">—</strong>
          <p>{loading ? 'Loading NOAA CPC data…' : 'Data integration temporarily unavailable'}</p>
          <div className="chart-reserve" aria-hidden="true" />
        </div>
      )}
    </article>
  )
}
