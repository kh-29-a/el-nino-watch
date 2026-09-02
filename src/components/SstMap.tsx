import { useState } from 'react'
import type { IndicatorResult, SstMapResult } from '../data/enso'
import { SST_MAP_GEOMETRY } from '../data/sstMap'

interface SstMapProps {
  map?: SstMapResult
  nino34?: IndicatorResult
  loading: boolean
}

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}°C`
}

export function SstMap({ map, nino34, loading }: SstMapProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const mapData = map?.data
  const nino = nino34?.data
  const showMap = Boolean(mapData && mapData.imageUrl !== failedUrl)
  const box = SST_MAP_GEOMETRY.nino34

  return (
    <>
      <div className="sst-controls" aria-label="SST map display mode">
        <button type="button" disabled title="Absolute SST will be added in a later integration">Temperature</button>
        <button className="selected" type="button" aria-pressed="true">Anomaly</button>
      </div>

      <div className={`sst-live-map ${showMap ? 'has-raster' : 'map-fallback'}`}>
        {showMap ? (
          <img src={mapData!.imageUrl} alt="NOAA CoastWatch daily MUR sea-surface temperature anomaly across the equatorial Pacific" onError={() => setFailedUrl(mapData!.imageUrl)} />
        ) : (
          <>
            <svg className="sst-fallback-coasts" viewBox="0 0 1000 250" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,12 L70,10 105,36 96,68 132,88 118,120 148,148 130,178 92,185 60,222 0,237Z" />
              <path d="M892,8 L927,42 910,72 944,98 930,126 958,151 938,184 966,216 1000,232 1000,0Z" />
            </svg>
            <p className="sst-unavailable">{loading ? 'Loading NOAA CoastWatch map…' : 'SST map temporarily unavailable.'}</p>
          </>
        )}
        <div className="sst-grid" aria-hidden="true" />
        <div className="sst-nino-box" style={{ left: `${box.leftPercent}%`, top: `${box.topPercent}%`, width: `${box.widthPercent}%`, height: `${box.heightPercent}%` }}>
          <span>Niño 3.4 {nino ? `· ${signed(nino.value)}` : ''}</span>
        </div>
        <span className="sst-lat north">20°N</span><span className="sst-lat equator">0°</span><span className="sst-lat south">20°S</span>
        <div className="sst-longitudes"><span>120°E</span><span>180°</span><span>120°W</span><span>80°W</span></div>
      </div>

      <div className="sst-legend" aria-label="Sea-surface temperature anomaly legend from minus 3 to plus 3 degrees Celsius">
        <span>Colder</span>
        <div><i /><div>{[-3, -2, -1, 0, 1, 2, 3].map((tick) => <small key={tick}>{tick > 0 ? '+' : ''}{tick}</small>)}</div></div>
        <span>Warmer</span><b>°C</b>
      </div>

      <div className="sst-map-footer">
        <div><span>Niño 3.4 anomaly</span><strong>{nino ? `${signed(nino.value)} · ${nino.interpretation.toLowerCase()}` : 'Temporarily unavailable'}</strong></div>
        <div><span>Update interval</span><strong>Daily · typically 2–4 days behind</strong></div>
        <div><span>Map observation</span><strong>{mapData ? new Date(mapData.observationTimestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Unavailable'}</strong></div>
      </div>
    </>
  )
}
