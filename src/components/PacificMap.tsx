import type { WindResponse } from '../data/wind'
import { SST_MAP_GEOMETRY } from '../data/sstMap'
import { WindCanvas } from './WindCanvas'

interface PacificMapProps { wind?: WindResponse | null; loading: boolean }

export function PacificMap({ wind, loading }: PacificMapProps) {
  const box = SST_MAP_GEOMETRY.nino34
  const field = wind?.meta.health !== 'failed' ? wind?.data : null
  return (
    <>
    <div className={`sst-live-map wind-map ${field ? 'has-wind' : 'wind-fallback'}`} role="img" aria-label={`${field ? 'Animated NOAA GFS 10 meter surface wind' : 'Pacific surface wind map unavailable'}, from 120 degrees east to 80 degrees west and 20 degrees south to 20 degrees north, with the Niño 3.4 region outlined`}>
      <svg className="sst-fallback-coasts" viewBox="0 0 1000 250" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,12 L70,10 105,36 96,68 132,88 118,120 148,148 130,178 92,185 60,222 0,237Z" />
        <path d="M892,8 L927,42 910,72 944,98 930,126 958,151 938,184 966,216 1000,232 1000,0Z" />
      </svg>
      <div className="sst-grid" aria-hidden="true" />
      {field && <WindCanvas field={field} />}
      <div className="sst-nino-box" style={{ left: `${box.leftPercent}%`, top: `${box.topPercent}%`, width: `${box.widthPercent}%`, height: `${box.heightPercent}%` }}>
        <span>Niño 3.4</span>
      </div>
      {!field && <div className="wind-unavailable"><strong>{loading ? 'Checking live wind field…' : 'Live wind field unavailable.'}</strong><span>Wind integration planned.</span></div>}
      <span className="sst-lat north">20°N</span><span className="sst-lat equator">0°</span><span className="sst-lat south">20°S</span>
      <div className="sst-longitudes"><span>120°E</span><span>180°</span><span>120°W</span><span>80°W</span></div>
    </div>
    <div className="wind-map-footer">
      <div><span>Update interval</span><strong>Every 6 hours</strong></div>
      <div><span>Source observation</span><strong>{field ? `NOAA/NCEP GFS · 10 m U/V · valid ${new Date(field.validTimestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })}` : '10 m U/V unavailable'}</strong></div>
    </div>
    </>
  )
}
