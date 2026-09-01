import type { EnsoForecastRow, OutlookResult } from '../data/enso'

interface OutlookChartProps {
  result?: OutlookResult
  loading: boolean
}

const categories: Array<{ key: keyof Pick<EnsoForecastRow, 'laNina' | 'neutral' | 'elNino'>; label: string }> = [
  { key: 'laNina', label: 'La Niña' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'elNino', label: 'El Niño' },
]

export function OutlookChart({ result, loading }: OutlookChartProps) {
  const data = result?.data
  if (!data) {
    return (
      <div className="outlook-unavailable">
        <strong>—</strong>
        <p>{loading ? 'Loading official NOAA CPC forecast…' : 'Forecast temporarily unavailable.'}</p>
      </div>
    )
  }

  const first = data.rows[0]
  const leading = categories.reduce((highest, category) => first[category.key] > first[highest.key] ? category : highest)

  return (
    <div className="outlook-live">
      <div className="outlook-summary">
        <div className="outlook-headline">
          <span>{first.season}</span>
          <strong>{leading.label.toUpperCase()}</strong>
          <b>{first[leading.key]}%</b>
        </div>
        <dl>
          {categories.map((category) => (
            <div key={category.key}>
              <dt><i className={category.key} />{category.label}</dt>
              <dd>{first[category.key]}%</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="stacked-chart" aria-label="Official NOAA CPC ENSO forecast probabilities by overlapping three-month season">
        <div className="stacked-legend" aria-hidden="true">
          {categories.map((category) => <span key={category.key}><i className={category.key} />{category.label}</span>)}
        </div>
        <div className="stacked-rows">
          {data.rows.map((row) => (
            <div className="stacked-row" key={row.season}>
              <span>{row.season}</span>
              <div className="stacked-bar" aria-label={`${row.season}: La Niña ${row.laNina}%, Neutral ${row.neutral}%, El Niño ${row.elNino}%`}>
                {categories.map((category) => row[category.key] > 0 && (
                  <i className={category.key} style={{ width: `${row[category.key]}%` }} key={category.key}>
                    {row[category.key] >= 12 && <small>{row[category.key]}%</small>}
                  </i>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="outlook-source">Official NOAA CPC ENSO Outlook <span>Issued {data.issued}</span></p>
    </div>
  )
}
