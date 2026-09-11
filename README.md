# El Niño Watch

An editorial ENSO monitoring website with independently loaded NOAA CPC indicators. The remaining forecast and map sections intentionally stay as placeholders and display no fabricated climate values.

## Integration status

The Current Conditions section now loads three independent NOAA Climate Prediction Center feeds through the cached `/api/enso` serverless endpoint:

- Niño 3.4 weekly OISST anomaly, with 52 weeks of history
- Monthly SOI, with 24 months of valid history and `-999.9` values excluded
- Seasonal ONI, with 36 historical seasons
- Official NOAA CPC ENSO probabilities for overlapping three-month seasons
- NOAA CoastWatch daily MUR SST anomaly map for the fixed 120°E–80°W, 20°S–20°N Pacific viewport

Absolute SST remains intentionally unintegrated. The Pacific Trade Wind Anomaly block loads NOAA CPC’s monthly standardized 850-hPa Trade Wind Indices independently from `wpac850`, `cpac850`, and `epac850`. It selects the latest shared valid observation month from each file’s `STANDARDIZED DATA` section, excludes CPC’s `-999.9` missing values, and keeps failures isolated by region. Three successful regions are healthy, one or two are partial/degraded, and zero are failed.

The map uses a locally bundled public-domain [Natural Earth 110m land GeoJSON](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/) with a Pacific-centered equirectangular projection. It shows the CPC West, Central, and East index regions; the SST-specific Niño 3.4 box is intentionally absent. Raw GFS 10 m wind vectors are no longer used as the primary anomaly indicator. Negative CPC index values are displayed as weaker easterly trades / anomalous westerlies (El Niño-like), while positive values are displayed as stronger easterlies (La Niña-like). The ±0.5 display bands are website interpretation aids, not official NOAA ENSO classification thresholds.

The SST map uses the verified `jplMURSST41anom1day_Lon0360` dataset and `sstAnom` variable. A server endpoint proxies one fixed 1200×300 WMS PNG for the Pacific crop; the browser never downloads the underlying global 0.01° grid. The WMS variable declares a symmetric −3°C to +3°C color range, for which ERDDAP uses its default diverging BlueWhiteRed palette. Temperature remains disabled until an equally robust absolute-SST presentation is added.

## Local development

```bash
npm install
npm run dev
```

Build and preview the production site:

```bash
npm run build
npm run preview
```

## Architecture

- `src/components/` contains reusable presentation components for the header, status panel, data blocks, maps, section headings, and footer.
- `src/pages/` contains the Home, Guide, and About route shells.
- `src/types.ts` contains shared UI types. A future data layer can be added separately without coupling API requests to presentation components.

## EdgeOne Pages deployment

If the EdgeOne CLI is authenticated in your environment, build the app and deploy the `dist` directory:

```bash
npm install
npm run build
edgeone makers deploy dist --name el-nino-watch --env production --area global
```

Configure the project as an SPA so `/guide` and `/about` fall back to `index.html`.

The current EdgeOne project uses direct static upload. On EdgeOne, the browser client reads the same cached Vercel `/api/enso` endpoint used by the primary deployment because direct-upload projects do not include the Vercel serverless function.
