import { useEffect, useRef, useState } from 'react'
import type { IndicatorName, RoutePath } from '../types'
import type { EnsoResponse, SourceKey } from '../data/enso'
import type { WindResponse } from '../data/wind'

const statusRows: IndicatorName[] = [
  'Niño 3.4',
  'SOI',
  'ONI',
  'ENSO Outlook',
  'SST Map',
  'Surface Wind',
]

interface HeaderProps {
  route: RoutePath
  onNavigate: (path: RoutePath) => void
  enso: EnsoResponse | null
  endpointError: string | null
  wind?: WindResponse | null
  windError: string | null
}

const sourceForRow: Partial<Record<IndicatorName, SourceKey>> = {
  'Niño 3.4': 'nino34', SOI: 'soi', ONI: 'oni', 'ENSO Outlook': 'outlook', 'SST Map': 'sstMap',
}

export function Header({ route, onNavigate, enso, wind, endpointError, windError }: HeaderProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function navigate(path: RoutePath) {
    onNavigate(path)
    setStatusOpen(false)
  }

  const overall = enso?.overall === 'red' || (!enso && (endpointError || windError))
    ? 'red'
    : enso?.overall === 'green' && wind?.meta.health === 'healthy' ? 'green' : 'yellow'

  return (
    <header className="site-header">
      <button className="wordmark" type="button" onClick={() => navigate('/')}>
        <span className="wordmark-symbol" aria-hidden="true">≈</span>
        <span>El Niño Watch</span>
      </button>

      <nav aria-label="Primary navigation">
        <button className={route === '/about' ? 'active' : ''} type="button" onClick={() => navigate('/about')}>About</button>
        <button className={route === '/guide' ? 'active' : ''} type="button" onClick={() => navigate('/guide')}>Guide</button>
        <div className="status-wrap" ref={panelRef}>
          <button
            className="status-trigger"
            type="button"
            aria-expanded={statusOpen}
            aria-controls="status-panel"
            onClick={() => setStatusOpen((open) => !open)}
          >
            <span className={`status-dot ${overall}`} aria-hidden="true" /> Status
          </button>

          {statusOpen && (
            <aside className="status-panel" id="status-panel" aria-label="Data integration status">
              <div className="status-heading">
                <span>System status</span>
                <button type="button" aria-label="Close status panel" onClick={() => setStatusOpen(false)}>×</button>
              </div>
              <div className="status-list">
                {statusRows.map((row) => {
                  const sourceKey = sourceForRow[row]
                  const source = sourceKey && enso?.sources[sourceKey]
                  const isWind = row === 'Surface Wind'
                  const label = isWind
                    ? wind?.meta.health === 'healthy' ? 'Connected' : wind?.meta.health === 'degraded' ? 'Connected · stale' : wind || windError ? 'Unavailable' : 'Connecting'
                    : source?.meta.success
                      ? source.meta.stale ? 'Connected · stale' : 'Connected'
                      : enso || endpointError ? 'Unavailable' : 'Connecting'
                  return (
                    <div className="status-row" key={row}>
                      <span>{row}</span>
                      <small className={isWind ? wind?.meta.health === 'healthy' ? 'success' : wind?.meta.health === 'degraded' ? 'stale' : 'problem' : source?.meta.success ? 'success' : 'problem'}>{label}</small>
                    </div>
                  )
                })}
              </div>
              <p>{enso ? `Last checked ${new Date(Object.values(enso.sources)[0].meta.fetchedAt).toLocaleString()}` : endpointError ?? 'Connecting to NOAA CPC…'}</p>
            </aside>
          )}
        </div>
      </nav>
    </header>
  )
}
