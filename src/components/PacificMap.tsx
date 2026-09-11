import { geoPath, type GeoPermissibleObjects } from 'd3-geo'
import land from '../assets/ne_110m_land.json'
import {
  getOverallTradeWindStatus,
  interpretTradeWind,
  tradeWindStatusMeaning,
  type TradeWindRegion,
  type TradeWindResponse,
} from '../data/tradeWind'
import {
  createPacificProjection,
  TRADE_WIND_MAP_HEIGHT as HEIGHT,
  TRADE_WIND_MAP_WIDTH as WIDTH,
  TRADE_WIND_REGIONS,
} from '../data/tradeWindMap'

interface PacificMapProps {
  tradeWind?: TradeWindResponse | null
  loading: boolean
}

function projected(projection: ReturnType<typeof createPacificProjection>, longitude360: number, latitude: number) {
  const longitude = longitude360 > 180 ? longitude360 - 360 : longitude360
  return projection([longitude, latitude]) ?? [0, 0]
}

function displayValue(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

export function PacificMap({ tradeWind, loading }: PacificMapProps) {
  const projection = createPacificProjection()
  const path = geoPath(projection)
  const data = tradeWind?.data ?? { west: null, central: null, east: null, period: null, updatedAt: null }
  const overall = getOverallTradeWindStatus(data)
  const available = tradeWind?.meta.successfulRegions ?? 0
  const landPath = path(land as GeoPermissibleObjects) ?? ''
  const longitudeLabels = [
    [120, '120°E'], [180, '180°'], [240, '120°W'], [280, '80°W'],
  ] as const
  const latitudeLabels = [
    [20, '20°N'], [0, '0°'], [-20, '20°S'],
  ] as const

  return (
    <div className="trade-wind-card">
      <div className="trade-wind-map" role="img" aria-label="Pacific-centered map from 120 degrees east to 80 degrees west showing NOAA CPC West, Central, and East Pacific 850 hectopascal Trade Wind Index regions">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <rect width={WIDTH} height={HEIGHT} className="trade-ocean" />
          {longitudeLabels.map(([longitude]) => {
            const [x] = projected(projection, longitude, 0)
            return <line key={longitude} x1={x} x2={x} y1={0} y2={HEIGHT} className="trade-grid-line" />
          })}
          {latitudeLabels.map(([latitude]) => {
            const [, y] = projected(projection, 200, latitude)
            return <line key={latitude} x1={0} x2={WIDTH} y1={y} y2={y} className={latitude === 0 ? 'trade-equator' : 'trade-grid-line'} />
          })}
          <path d={landPath} className="trade-land" />
          {TRADE_WIND_REGIONS.map((region) => {
            const [x1, y1] = projected(projection, region.west, 5)
            const [x2, y2] = projected(projection, region.east, -5)
            return (
              <g key={region.key} className={`trade-region trade-region-${region.key}`}>
                <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} />
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2}>{region.label}</text>
              </g>
            )
          })}
          {latitudeLabels.map(([latitude, label]) => {
            const [, y] = projected(projection, 200, latitude)
            return <text key={label} x={10} y={latitude === 20 ? y + 13 : latitude === -20 ? y - 7 : y - 6} className="trade-coordinate">{label}</text>
          })}
          {longitudeLabels.map(([longitude, label]) => {
            const [x] = projected(projection, longitude, 0)
            const anchor = longitude === 120 ? 'start' : longitude === 280 ? 'end' : 'middle'
            return <text key={label} x={longitude === 120 ? x + 10 : longitude === 280 ? x - 10 : x} y={HEIGHT - 8} textAnchor={anchor} className="trade-coordinate">{label}</text>
          })}
        </svg>
        {loading && <div className="trade-map-message">Loading CPC indices…</div>}
        {!loading && available === 0 && <div className="trade-map-message">Data unavailable</div>}
      </div>

      <div className="trade-indicators">
        {TRADE_WIND_REGIONS.map((region) => {
          const value = data[region.key as TradeWindRegion]
          const interpretation = interpretTradeWind(value)
          return (
            <div className={`trade-indicator ${interpretation.tone}`} key={region.key}>
              <span>{region.longLabel}</span>
              <strong>{displayValue(value)}</strong>
              <small>{interpretation.label}</small>
            </div>
          )
        })}
      </div>

      <div className="trade-summary">
        <div>
          <span>Overall</span>
          <strong>{overall}</strong>
          <p>{tradeWindStatusMeaning(overall)}</p>
          {available > 0 && available < 3 && <small>Based on {available} of 3 available regions.</small>}
        </div>
        <div className="trade-explanation">
          <p>
            Negative CPC Trade Wind Index values indicate anomalous westerlies / weakened easterly trade winds.
            {overall === 'STRONGER THAN NORMAL' && ' Positive values indicate enhanced easterly trade winds.'}
          </p>
          <span className="trade-info" tabIndex={0} aria-label="About trade wind anomalies">
            i
            <span role="tooltip">Pacific trade winds normally blow from east to west. During El Niño they often weaken, producing a westerly wind anomaly. During La Niña they often strengthen.</span>
          </span>
        </div>
      </div>

      <div className="trade-source">
        <div><span>Index</span><strong>NOAA CPC · 850-hPa Trade Wind Index</strong></div>
        <div><span>Latest</span><strong>{data.period ?? 'Data unavailable'}</strong><small>Monthly · updated around the 10th</small></div>
      </div>
    </div>
  )
}
