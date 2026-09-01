import type { HistoryPoint, IndicatorData } from './enso.js'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function isoDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString()
}

function parseWeeklyDate(value: string) {
  const match = value.match(/^(\d{2})([A-Z]{3})(\d{4})$/)
  if (!match) throw new Error(`Invalid weekly date: ${value}`)
  const month = MONTHS.indexOf(match[2])
  if (month < 0) throw new Error(`Invalid weekly month: ${value}`)
  return isoDate(Number(match[3]), month, Number(match[1]))
}

export function parseNino34(text: string): IndicatorData {
  if (!text.includes('Nino34') || !text.includes('SST SSTA')) {
    throw new Error('NOAA weekly SST header is not recognized')
  }

  const history: HistoryPoint[] = []
  for (const line of text.split(/\r?\n/)) {
    const date = line.trim().match(/^(\d{2}[A-Z]{3}\d{4})/)?.[1]
    if (!date) continue
    const values = line.slice(line.indexOf(date) + date.length).match(/-?\d+(?:\.\d+)?/g)?.map(Number)
    // NOAA documents four SST/SSTA pairs: Niño1+2, Niño3, Niño3.4, Niño4.
    // Niño3.4 is therefore the third pair: array positions 4 (SST) and 5 (SSTA).
    if (!values || values.length < 8 || !Number.isFinite(values[5])) continue
    history.push({ label: date, timestamp: parseWeeklyDate(date), value: values[5] })
  }

  if (!history.length) throw new Error('No valid Niño 3.4 observations found')
  const latest = history[history.length - 1]
  const interpretation = latest.value > 0.2 ? 'Warmer than normal' : latest.value < -0.2 ? 'Colder than normal' : 'Near normal'

  return {
    value: latest.value,
    period: latest.label,
    interpretation,
    description: 'Sea-surface temperature anomaly across the central equatorial Pacific.',
    location: '5°N–5°S · 170°W–120°W',
    history: history.slice(-52),
  }
}

export function parseSoi(text: string): IndicatorData {
  if (!text.includes('YEAR') || !text.includes('JAN') || !text.includes('DEC')) {
    throw new Error('NOAA SOI header is not recognized')
  }

  const history: HistoryPoint[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*\d{4}/.test(line)) continue
    // Regex parsing handles NOAA rows where negative values have no separating space.
    const values = line.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
    if (!values || values.length < 2) continue
    const year = values[0]
    values.slice(1, 13).forEach((value, monthIndex) => {
      if (value === -999.9 || !Number.isFinite(value)) return
      const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0))
      history.push({
        label: `${MONTHS[monthIndex]} ${year}`,
        timestamp: endOfMonth.toISOString(),
        value,
      })
    })
  }

  if (!history.length) throw new Error('No valid SOI observations found')
  const latest = history[history.length - 1]
  const interpretation = latest.value < -0.5 ? 'El Niño-like atmosphere' : latest.value > 0.5 ? 'La Niña-like atmosphere' : 'Near neutral'

  return {
    value: latest.value,
    period: latest.label,
    interpretation,
    description: 'Monthly Southern Oscillation Index pressure signal.',
    history: history.slice(-24),
  }
}

const SEASON_END_MONTH: Record<string, { month: number; nextYear?: boolean }> = {
  DJF: { month: 1 }, JFM: { month: 2 }, FMA: { month: 3 }, MAM: { month: 4 },
  AMJ: { month: 5 }, MJJ: { month: 6 }, JJA: { month: 7 }, JAS: { month: 8 },
  ASO: { month: 9 }, SON: { month: 10 }, OND: { month: 11 }, NDJ: { month: 0, nextYear: true },
}

export function parseOni(text: string): IndicatorData {
  if (!text.includes('SEAS') || !text.includes('ANOM')) {
    throw new Error('NOAA ONI header is not recognized')
  }

  const history: HistoryPoint[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/)
    if (!match) continue
    const season = match[1]
    const year = Number(match[2])
    const value = Number(match[4])
    const end = SEASON_END_MONTH[season]
    if (!end || value === -999.9 || !Number.isFinite(value)) continue
    const endYear = end.nextYear ? year + 1 : year
    const endOfMonth = new Date(Date.UTC(endYear, end.month + 1, 0))
    history.push({ label: `${season} ${year}`, timestamp: endOfMonth.toISOString(), value })
  }

  if (!history.length) throw new Error('No valid ONI observations found')
  const latest = history[history.length - 1]
  return {
    value: latest.value,
    period: latest.label,
    interpretation: '',
    description: 'Three-month average Niño 3.4 sea-surface temperature anomaly.',
    history: history.slice(-36),
  }
}
