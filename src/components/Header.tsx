import { useEffect, useRef, useState } from 'react'
import type { IndicatorName, RoutePath } from '../types'
import type { EnsoResponse, SourceKey } from '../data/enso'
import type { TradeWindResponse } from '../data/tradeWind'

const statusRows: IndicatorName[] = [
  'Niño 3.4',
  'SOI',
  'ONI',
  'ENSO Outlook',
  'SST Map',
  'Trade Wind Index',
]

interface HeaderProps {
  route: RoutePath
  onNavigate: (path: RoutePath) => void
  enso: EnsoResponse | null
  endpointError: string | null
  tradeWind?: TradeWindResponse | null
  tradeWindError: string | null
}

const sourceForRow: Partial<Record<IndicatorName, SourceKey>> = {
  'Niño 3.4': 'nino34', SOI: 'soi', ONI: 'oni', 'ENSO Outlook': 'outlook', 'SST Map': 'sstMap',
}

export function Header({ route, onNavigate, enso, tradeWind, endpointError, tradeWindError }: HeaderProps) {
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

  const overall = enso?.overall === 'red' || (!enso && (endpointError || tradeWindError))
    ? 'red'
    : enso?.overall === 'green' && tradeWind?.meta.health === 'healthy' ? 'green' : 'yellow'

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
                  const isTradeWind = row === 'Trade Wind Index'
                  const label = isTradeWind
                    ? tradeWind?.meta.health === 'healthy' ? 'Connected' : tradeWind?.meta.health === 'degraded' ? 'Partial' : tradeWind || tradeWindError ? 'Unavailable' : 'Connecting'
                    : source?.meta.success
                      ? source.meta.stale ? 'Connected · stale' : 'Connected'
                      : enso || endpointError ? 'Unavailable' : 'Connecting'
                  return (
                    <div className="status-row" key={row}>
                      <span>{row}</span>
                      <small className={isTradeWind ? tradeWind?.meta.health === 'healthy' ? 'success' : tradeWind?.meta.health === 'degraded' ? 'stale' : 'problem' : source?.meta.success ? 'success' : 'problem'}>{label}</small>
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
