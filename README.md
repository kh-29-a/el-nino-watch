# El Niño Watch

An editorial ENSO monitoring website with independently loaded NOAA CPC indicators. The remaining forecast and map sections intentionally stay as placeholders and display no fabricated climate values.

## Integration status

The Current Conditions section now loads three independent NOAA Climate Prediction Center feeds through the cached `/api/enso` serverless endpoint:

- Niño 3.4 weekly OISST anomaly, with 52 weeks of history
- Monthly SOI, with 24 months of valid history and `-999.9` values excluded
- Seasonal ONI, with 36 historical seasons
- Official NOAA CPC ENSO probabilities for overlapping three-month seasons
- NOAA CoastWatch daily MUR SST anomaly map for the fixed 120°E–80°W, 20°S–20°N Pacific viewport

Absolute SST remains intentionally unintegrated. Surface wind loads independently from the latest available NOAA/NCEP GFS `f000` analysis. The server requests only UGRD and VGRD at 10 m above ground for 120–280°E and 20°S–20°N through the NOMADS GRIB filter, validates and decodes the Pacific-only GRIB2 subset, and downsamples it from 0.25° to compact 1° JSON. The browser receives no global GRIB data and renders the vectors as a lightweight Canvas particle field.

Wind health is healthy through 12 hours, degraded from 12–18 hours, and failed thereafter. A wind failure makes overall status yellow without affecting the other feeds, and the complete static Pacific/Niño 3.4 fallback remains visible. The map reports current 10 m wind only; it does not fabricate a climatological anomaly or substitute an 850-hPa trade-wind index.

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
