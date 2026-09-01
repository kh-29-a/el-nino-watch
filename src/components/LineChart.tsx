import type { HistoryPoint } from '../data/enso'

interface LineChartProps {
  data: HistoryPoint[]
  referenceLines?: number[]
  label: string
}

export function LineChart({ data, referenceLines = [], label }: LineChartProps) {
  if (data.length < 2) return <div className="chart-fallback">Historical data unavailable</div>

  const values = [...data.map((point) => point.value), ...referenceLines]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.15, 0.2)
  const chartMin = min - padding
  const chartMax = max + padding
  const x = (index: number) => 8 + (index / (data.length - 1)) * 384
  const y = (value: number) => 10 + ((chartMax - value) / (chartMax - chartMin)) * 90
  const points = data.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')

  return (
    <div className="line-chart">
      <svg viewBox="0 0 400 110" preserveAspectRatio="none" role="img" aria-label={label}>
        {referenceLines.map((value) => (
          <g key={value}>
            <line className={value === 0 ? 'zero-line' : 'reference-line'} x1="8" x2="392" y1={y(value)} y2={y(value)} />
            <text x="10" y={y(value) - 3}>{value > 0 ? '+' : ''}{value}°C</text>
          </g>
        ))}
        <polyline points={points} />
        <circle cx={x(data.length - 1)} cy={y(data.at(-1)!.value)} r="3" />
      </svg>
      <div className="chart-period"><span>{data[0].label}</span><span>{data.at(-1)!.label}</span></div>
    </div>
  )
}
