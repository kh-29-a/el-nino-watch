const guideSections = [
  ['Niño 3.4', 'The weekly sea-surface temperature anomaly across 5°N–5°S and 170°W–120°W, sourced from NOAA CPC OISST data.'],
  ['SOI', 'A monthly atmospheric pressure index. The displayed tendency is descriptive only; a single SOI reading does not officially define ENSO.'],
  ['ONI', 'NOAA’s three-month running mean of Niño 3.4 sea-surface temperature anomalies. The homepage uses thresholds of ±0.5°C as a simplified display signal only, not an official NOAA event declaration.'],
  ['ENSO Outlook', 'The official NOAA CPC outlook gives probabilities for La Niña, Neutral, and El Niño. Each label represents an overlapping three-month season. These forecast probabilities are not certainties, and they are different from the current ONI observation.'],
  ['SST anomaly', 'A future guide to reading departures from the long-term average sea-surface temperature.'],
  ['Trade winds', 'Trade winds normally blow east-to-west across the tropical Pacific. Weaker trade winds are associated with El Niño-like conditions, while stronger trade winds are associated with La Niña-like conditions. Current wind and wind anomaly are different quantities: an anomaly requires subtracting an appropriate climatology. Surface wind and 850-hPa trade-wind indices measure different levels and are not interchangeable.'],
]

export function GuidePage() {
  return (
    <main className="plain-page">
      <h1>Guide</h1>
      <p>A guide to the indicators that will appear on El Niño Watch.</p>
      {guideSections.map(([title, description]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
            {title === 'SST anomaly' && <p>Documentation pending.</p>}
          </section>
      ))}
    </main>
  )
}
