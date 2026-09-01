import { buildSstWmsUrl } from '../src/data/sstMap.js'

const DATASET = 'jplMURSST41anom1day_Lon0360'

export async function GET(request: Request) {
  const requestedTime = new URL(request.url).searchParams.get('time')
  if (!requestedTime || Number.isNaN(new Date(requestedTime).getTime())) {
    return new Response('A valid observation time is required', { status: 400 })
  }

  const url = buildSstWmsUrl(requestedTime)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`NOAA WMS returned HTTP ${response.status}`)
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('image/png')) throw new Error('NOAA WMS did not return a PNG image')
    const image = await response.arrayBuffer()
    if (!image.byteLength || image.byteLength > 5_000_000) throw new Error('NOAA WMS image size is invalid')
    return new Response(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'X-SST-Dataset': DATASET,
        'X-SST-Variable': 'sstAnom',
        'X-SST-Bbox-0360': '120,280,-20,20',
      },
    })
  } catch {
    return new Response('SST map temporarily unavailable.', { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
