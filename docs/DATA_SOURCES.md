# PRITHVI WATCH — Data Sources & Provenance

This document details the real, documented data sources utilized in PRITHVI WATCH for geospatial processing, landslide inventory, weather forcing, and satellite SAR observations.

---

## 1. Digital Elevation Model (DEM) & Topographic Derivatives

* **Source**: NASA / USGS Shuttle Radar Topography Mission (SRTM) 1 Arc-Second Global (30m)
* **Provider**: AWS Open Data Registry (`s3://elevation-tiles-prod/skadi/`)
* **Tiles Acquired**:
  - `N25E091` (Meghalaya / South Assam)
  - `N26E091` (Central Assam / Brahmaputra Valley)
  - `N27E088` (Sikkim / North Bengal)
  - `N27E092` (Arunachal Pradesh / Upper Assam)
* **Processing**:
  - Native `.hgt` tiles mosaicked via `rasterio.merge` to create unified regional coverage GeoTIFF (`data/dem/real_dem.tif`).
  - True Terrain Slope (degrees) computed via central differences on geographic coordinates with dynamic meter-per-degree projection scaling (`data/dem/slope.tif`).
  - True Terrain Aspect (degrees 0-360) computed via gradient arctangent (`data/dem/aspect.tif`).
* **License**: Public Domain (NASA/USGS).

---

## 2. Historical Landslide Inventory

* **Source**: NASA Global Landslide Catalog (GLC) / Cooperative Open Online Landslide Repository (COOLR)
* **Provider & Provenance**: 
  - Canonical NASA export mirrored at verified research repository (`Arsalaan-Alam/landsafe`) and persisted locally at `data/landslides/source/historical_landslides.csv`.
  - Implemented resilient multi-tier `LandslideDataProvider` architecture (NASA Portal -> GSI -> Local File -> Verified Mirror).
* **Validation & Spatial Filtering**:
  - Total Catalog Records: 13,493 events worldwide.
  - Indian NER Subset: 483 verified events across Arunachal Pradesh (30), Assam (161), Manipur (25), Meghalaya (22), Mizoram (51), Nagaland (5), Sikkim (181), and Tripura (8).
  - Spatial Intersection: Events falling precisely within the active 4-tile DEM mosaic boundaries are retained as verified positive ground truth labels (`label = 1`).
* **License**: NASA Open Data Policy (Open Access).

---

## 3. Meteorological Data (Rainfall)

* **Source**: Open-Meteo Historical ERA5 Reanalysis & Live ECMWF/GFS Forecast API
* **Provider**: Open-Meteo GmbH
* **Variables**:
  - `rainfall_7d_mm`: 7-day antecedent cumulative precipitation (mm).
  - Live forecast precipitation (past 7 days + 48h forecast).
* **Usage**:
  - Historical: Concurrently queried per historical event date and background coordinate to provide the dynamic triggering factor.
  - Live: Real-time query per user inference request / spatial grid cell.
* **Resolution**: ~10 km gridded reanalysis / NWP forecast.
* **License**: Open-Meteo Open Data / CC-BY 4.0 (Copernicus ERA5).

---

## 4. Satellite Observations (Sentinel-1 SAR)

* **Source**: Sentinel-1 Synthetic Aperture Radar (SAR) Ground Range Detected (GRD) Radiometrically Terrain Corrected (RTC)
* **Provider**: Microsoft Planetary Computer STAC API (`collection: sentinel-1-rtc`) / ESA Copernicus Programme
* **Variables**:
  - `sar_vv`: Vertical transmit / Vertical receive backscatter intensity (linear power).
  - `sar_vh`: Vertical transmit / Horizontal receive cross-polarization backscatter intensity.
* **Processing**:
  - Query STAC endpoint for nearest pre-event Sentinel-1 RTC Cloud-Optimized GeoTIFF (COG).
  - High-performance windowed `rasterio` read retrieving target pixel without full 1.8 GB scene transfer.
* **Resolution**: 10m spatial resolution, C-band SAR.
* **License**: Copernicus Open Access Policy.

---

## 5. Administrative Boundaries

* **Source**: geoBoundaries / GADM Global Administrative Areas
* **Coverage**: North Eastern Region (NER) state boundaries (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura).
* **File**: `data/boundaries/ner_boundaries.geojson`
* **License**: CC BY 4.0.
