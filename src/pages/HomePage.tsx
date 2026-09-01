import { DataBlock } from '../components/DataBlock'
import { PacificMap } from '../components/PacificMap'
import { SectionHeader } from '../components/SectionHeader'
import type { EnsoResponse } from '../data/enso'
import { OutlookChart } from '../components/OutlookChart'
import { SstMap } from '../components/SstMap'
import type { WindResponse } from '../data/wind'

interface HomePageProps {
  enso: EnsoResponse | null
  loading: boolean
  wind?: WindResponse | null
  windLoading: boolean
}

function value(value: number | undefined, decimals: number, unit = '') {
  if (value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit}`
}

export function HomePage({ enso, loading, wind, windLoading }: HomePageProps) {
  const nino34 = enso?.sources.nino34.data?.value
  const soi = enso?.sources.soi.data?.value
  const oni = enso?.sources.oni.data?.value
  // This is a simplified display signal only—not an official NOAA ENSO event declaration.
  const signal = oni === undefined ? '—' : oni >= 0.5 ? 'El Niño-like' : oni <= -0.5 ? 'La Niña-like' : 'Neutral-like'

  return (
    <main>
      <section className="hero content-width">
        <p className="eyebrow">Equatorial Pacific climate monitor</p>
        <div className="hero-grid">
          <div>
            <span>Current ENSO signal</span>
            <h1 className={signal === '—' ? 'signal-empty' : 'signal-value'}>{signal}</h1>
          </div>
          <p className="hero-copy">Ocean and atmosphere indicators for monitoring El Niño and La Niña.</p>
        </div>
        <dl className="hero-metrics">
          <div><dt>Niño 3.4</dt><dd>{value(nino34, 2, '°C')}</dd></div>
          <div><dt>SOI</dt><dd>{value(soi, 1)}</dd></div>
          <div><dt>ONI</dt><dd>{value(oni, 2, '°C')}</dd></div>
        </dl>
        <p className="signal-disclaimer">Simplified signal based on the latest ONI value. Not an official NOAA event declaration.</p>
      </section>

      <section className="page-section content-width" id="conditions">
        <SectionHeader title="Current Conditions" />
        <div className="data-grid">
          <DataBlock title="Niño 3.4 SST" result={enso?.sources.nino34} loading={loading} decimals={2} unit="°C" referenceLines={[0.5, 0, -0.5]} />
          <DataBlock title="SOI" result={enso?.sources.soi} loading={loading} decimals={1} />
          <DataBlock title="ONI" result={enso?.sources.oni} loading={loading} decimals={2} unit="°C" referenceLines={[0.5, 0, -0.5]} />
        </div>
      </section>

      <section className="page-section content-width" id="outlook">
        <SectionHeader title="ENSO Outlook" />
        <OutlookChart result={enso?.sources.outlook} loading={loading} />
      </section>

      <section className="page-section map-section content-width" id="sst">
        <SectionHeader title="Pacific SST" subtitle="Sea Surface Temperature" />
        <SstMap map={enso?.sources.sstMap} nino34={enso?.sources.nino34} loading={loading} />
      </section>

      <section className="page-section map-section content-width" id="winds">
        <SectionHeader title="Pacific Trade Winds" subtitle="Surface Wind" />
        <PacificMap wind={wind} loading={windLoading} />
      </section>
    </main>
  )
}
