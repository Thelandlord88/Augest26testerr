# Suburb Data Pipeline (QLD — Brisbane / Ipswich / Logan)

A cleaned, **deduplicated** version of your notebook code, reorganised into a single runnable Python script (`suburb_data_pipeline.py`). It fetches polygons from **QSpatial** (fallback to **ABS ASGS 2021**), computes centroids and adjacency, and optionally **enriches** each locality with ABS **SA2/SA3/SA4/GCCSA** codes and top‑3 **POA** postcodes (by area overlap).

> Source material: your original “Map Data codes IMPORTANT.txt” which contained repeated cells; this pipeline removes duplicates and groups the logic into clear stages.

---

## What the script does

### 1) Build core dataset
- **Fetch polygons**
  - Tries **QSpatial** Local Government Areas (LGAs) and Localities.
  - If QSpatial is empty/unavailable, falls back to **ABS** (ASGS 2021 SAL/LGA).
- **Clean geometry**
  - Validates polygons with `shapely.make_valid` and filters to **Polygon/MultiPolygon**.
- **Assign LGA to locality**
  - Intersects each locality with LGAs, keeps the **largest overlap** as the LGA.
  - Clips localities to the **union** of the target LGAs (Brisbane, Ipswich, Logan).
- **Derive spatial features**
  - CRS‑safe **centroids** and **representative** label points.
  - **Distance to Brisbane CBD** using WGS84 geodesic (km).
- **Adjacency graph**
  - Neighbours if they **share an edge** (point‑touch is ignored).
  - Guarantee ≥ 2 neighbours by **backfilling** within **1.5 km** inside the same LGA (marked as `derived`).
  - Also produces a **nearest_nonsiblings** list (same LGA, non‑adjacent).
- **Outputs**
  - `suburbs.geojson` — FeatureCollection with properties including centroid/label points and provenance.
  - `suburbs.csv` — Flat extract for compatibility.
  - `adjacency.json` — For each suburb: `adjacent_suburbs`, `nearest_nonsiblings`, `derived`.
  - `clusters.json` — Slugs grouped by LGA “cluster” key.
  - `cluster_map.json` — Reverse map (`slug` → cluster).
  - `sources_index.json` — Data sources, licences, and timestamp.
  - Includes QA checks for **symmetric adjacency** & **coverage**.

### 2) Optional ABS enrichment
- Fetch ABS layers: **SA2**, **SA3**, **SA4**, **GCCSA**, **POA** (postcodes).
- Spatial join adds codes/names where polygons **intersect**.
- **Top‑3 postcodes** are selected by **area of intersection** with each locality.
- **Enriched outputs**
  - `suburbs_enriched.geojson`
  - `suburbs_enriched.csv` (includes SA2/3/4/GCCSA columns and comma‑separated postcodes)

---

## Configuration

Edit the constants at the top of `suburb_data_pipeline.py`:

```py
OUTDIR = "out"
LGAS = ["Brisbane City", "Ipswich City", "Logan City"]
STATE = "QLD"
BNE_CBD = (-27.4698, 153.0251)  # lat, lon
```

Endpoints are pre‑configured for:
- **QSpatial:** `Boundaries/AdministrativeBoundaries` MapServer (layers 1=LGA, 2=Locality)
- **ABS ASGS 2021:** `ASGS2021` MapServer for SAL/LGA/SA2/SA3/SA4/GCCSA/POA

> Licences: both sources are **CC BY 4.0**. See `sources_index.json`.

---

## Running

### Local (Python 3.10+ recommended)
```bash
python3 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install geopandas shapely pyproj requests requests_cache scikit-learn
python suburb_data_pipeline.py
```

This writes outputs under `out/`. To disable the ABS enrichment step:
```bash
python suburb_data_pipeline.py  # edit main(do_enrich=False) if you prefer
```

### (Optional) Colab helpers
The script includes `make_zip()` to zip `out/` for easy download if you run in a notebook/Colab.

---

## Output files & schemas (high‑level)

- **suburbs.geojson** — FeatureCollection of localities; each feature has:
  - `properties.name_official`, `slug`, `lga`, `state`
  - `properties.centroid` (`lat`,`lon`), `label_point` (`lat`,`lon`)
  - `properties.record_hash`, `data_edition`, `last_verified`
- **suburbs.csv** — Columns: name_official, slug, lga, state, postcodes, centroid_lat/lon, label_lat/lon, distance_to_bne_cbd_km, record_hash
- **adjacency.json** — Map of `slug` → `{ adjacent_suburbs: [...], nearest_nonsiblings: [...], derived: [...] }`
- **clusters.json** — Map of cluster key (LGA slug) → `[suburb-slug, ...]`
- **cluster_map.json** — Map of suburb slug → cluster key
- **sources_index.json** — Metadata for QSpatial/ABS, including licence info
- **suburbs_enriched.geojson / .csv** — Adds ABS codes & area‑weighted `postcode_list`

---

## Key design notes

- **Adjacency threshold:** requires **line‑segment overlap** (`length > 0 m`), excluding mere corner‑touches to keep neighbourhoods realistic.
- **Backfill rule:** ensures UI/SEO modules have at least two links from each suburb page while staying within the **same LGA**.
- **Caching:** `requests_cache` (SQLite) caches ArcGIS queries for 6 hours to speed up iterating.
- **CRS discipline:** metric ops are computed in **EPSG:3577** (Australian Albers); stored as **EPSG:4326**.
- **Determinism:** each geometry gets a short **`record_hash`** derived from `geom.wkt` for change tracking.

---

## Troubleshooting

- **Empty results from QSpatial** → script falls back to ABS automatically.
- **Asymmetric edges error** → check invalid geometries or extremely small sliver overlaps; try re‑running.
- **Isolated suburbs** warning → check source polygons; some islands or enclaves may be legitimate.
- **Large ABS requests** → the fetcher batches object IDs (800 per request) with basic retry/backoff.

---

## Attribution

Data comes from:
- **QSpatial — Administrative Boundaries (CC BY 4.0)**
- **ABS ASGS 2021 — SAL/LGA/SA2/SA3/SA4/GCCSA/POA (CC BY 4.0)**

See `sources_index.json` for reproducible references.
