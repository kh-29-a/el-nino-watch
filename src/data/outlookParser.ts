import { load } from 'cheerio'
import type { EnsoForecastRow, OutlookData } from './enso.js'

function normalizedText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function headerKey(value: string) {
  return normalizedText(value).toLowerCase().replace(/ñ/g, 'n')
}

function percentage(value: string, label: string) {
  const cleaned = normalizedText(value).replace(/%/g, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) throw new Error(`Invalid ${label} probability`)
  const result = Number(cleaned)
  if (!Number.isFinite(result) || result < 0 || result > 100) throw new Error(`Invalid ${label} probability`)
  return result
}

export function parseEnsoOutlook(html: string): OutlookData {
  const $ = load(html)
  const table = $('table').filter((_, element) => {
    // NOAA's legacy layout contains nested tables, so inspect only this table's direct rows.
    const headers = $(element).children('tbody').children('tr').children('th').map((__, cell) => headerKey($(cell).text())).get()
    return headers.some((header) => header === 'season')
      && headers.some((header) => header.includes('la nina'))
      && headers.some((header) => header === 'neutral')
      && headers.some((header) => header.includes('el nino'))
  }).first()

  if (!table.length) throw new Error('Official ENSO probability table was not found')

  const tableRows = table.children('tbody').children('tr')
  const headingRow = tableRows.filter((_, row) => $(row).children('th').toArray().some((cell) => headerKey($(cell).text()) === 'season')).first()
  const headingCells = headingRow.find('th, td')
  const columns = new Map<string, number>()
  headingCells.each((index, cell) => {
    columns.set(headerKey($(cell).text()), index)
  })
  const findColumn = (matcher: (value: string) => boolean) => [...columns].find(([name]) => matcher(name))?.[1]
  const seasonColumn = findColumn((name) => name === 'season')
  const laNinaColumn = findColumn((name) => name.includes('la nina'))
  const neutralColumn = findColumn((name) => name === 'neutral')
  const elNinoColumn = findColumn((name) => name.includes('el nino'))
  if ([seasonColumn, laNinaColumn, neutralColumn, elNinoColumn].some((column) => column === undefined)) {
    throw new Error('Official ENSO probability columns are incomplete')
  }

  const rows: EnsoForecastRow[] = []
  tableRows.each((_, row) => {
    const cells = $(row).children('th, td').toArray()
    if (cells.length < 4 || row === headingRow.get(0)) return
    const seasonText = normalizedText($(cells[seasonColumn!]).text())
    const season = seasonText.match(/\b[A-Z]{3}\b/)?.[0]
    if (!season) throw new Error('Forecast row is missing a valid season')
    const forecast: EnsoForecastRow = {
      season,
      laNina: percentage($(cells[laNinaColumn!]).text(), 'La Niña'),
      neutral: percentage($(cells[neutralColumn!]).text(), 'Neutral'),
      elNino: percentage($(cells[elNinoColumn!]).text(), 'El Niño'),
    }
    const total = forecast.laNina + forecast.neutral + forecast.elNino
    if (Math.abs(total - 100) > 2) throw new Error(`${season} probabilities total ${total}, not approximately 100`)
    rows.push(forecast)
  })

  if (!rows.length) throw new Error('No valid ENSO probability rows were found')

  const issuedText = $('h1, h2, h3, p').map((_, element) => normalizedText($(element).text())).get().find((text) => /^Issued\s+[A-Z][a-z]+\s+\d{4}$/i.test(text))
  if (!issuedText) throw new Error('ENSO outlook issued month was not found')
  const match = issuedText.match(/^Issued\s+([A-Z][a-z]+)\s+(\d{4})$/i)!
  const issuedDate = new Date(`${match[1]} 1, ${match[2]} 00:00:00 UTC`)
  if (Number.isNaN(issuedDate.getTime())) throw new Error('ENSO outlook issued month is invalid')

  return {
    issued: `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}`,
    issuedTimestamp: issuedDate.toISOString(),
    rows,
  }
}
