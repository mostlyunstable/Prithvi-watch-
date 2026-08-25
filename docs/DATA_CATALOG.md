# PRITHVI WATCH — REAL GEOSPATIAL DATA FABRIC CATALOG

This catalog provides exhaustive documentation, spatial extent, temporal depth, provider provenance, license terms, and scientific usage for all datasets integrated into the PRITHVI WATCH Real Geospatial Data Fabric across the North Eastern Region (NER) of India.

---

## Data Fabric Summary Matrix

| Dataset | Provider | Spatial Resolution | Temporal Coverage | NER Coverage | Format / Access | License | System Role |
|---|---|---|---|---|---|---|---|
| **SRTM 1 Arc-Second DEM** | NASA / USGS | 30 meters | Static baseline (2000) | 100% Core NER Tiles | Cloud-Optimized GeoTIFF | Public Domain | Topography, slope, aspect, TRI, relief, planform curvature |
| **HydroSHEDS / HydroRIVERS** | WWF / USGS | 15–30m vector | Static hydro baseline | 100% NER River Basins | RFC 7946 GeoJSON | CC-BY 4.0 | River proximity, stream network, discharge, Strahler order |
| **HydroBASINS Catchments** | HydroSHEDS / WWF | Sub-catchments | Static hydro baseline | 100% NER Catchments | RFC 7946 GeoJSON | CC-BY 4.0 | Basin delineation, watershed ID, drainage area |
| **ERA5 / ECMWF Precipitation** | ECMWF / Open-Meteo | 0.1° (~10 km) | 1940–present + 16d forecast | 100% Continuous NER | REST JSON API | Copernicus Open Access | Antecedent rainfall (1h–30d) and 30-year anomaly |
| **NASA GPM IMERG V07** | NASA GSFC / JAXA | 0.1° (~10 km) | 2000–present (30-min) | 100% Continuous NER | HDF5 / REST API | NASA Open Data | High-frequency cloudburst validation and rainfall verification |
| **Sentinel-1 GRD RTC SAR** | ESA Copernicus / PC | 10 meters (C-band) | Oct 2014–present | Full NER orbits | COG via STAC API | Copernicus Open Access | Surface roughness, backscatter (VV/VH), soil moisture change |
| **Sentinel-2 L2A MSI Optical** | ESA Copernicus / PC | 10–20 meters | Jun 2015–present | Full NER orbits | COG via STAC API | Copernicus Open Access | NDVI vegetation index, canopy stress, cloud validity filtering |
| **ESA WorldCover 10m** | ESA / VITO | 10 meters | 2020–2023 | 100% NER Land Surface | Raster / GeoJSON | CC-BY 4.0 | Land-cover classification (forest, crop, urban, bare, water) |
| **Survey of India / OSM Roads** | Survey of India / OSM | Sub-10m vector | Current quarterly | All 8 NER States | RFC 7946 GeoJSON | ODbL / Open Govt Data | National highway corridors, road cut proximity, settlements |
| **NASA Global Landslide Catalog** | NASA GSFC / COOLR | Point + Accuracy radius | 2007–2018 | 483 Verified NER Events | GeoJSON & CSV | NASA Open Data | Ground truth training, spatial holdout, historical hazard context |
| **CWC / ASDMA Flood Inventory** | CWC / Assam SDMA | Reach / District polygons | 1998–2024 | Brahmaputra & Barak | RFC 7946 GeoJSON | OGD India | Historical flood events, inundation area, multi-hazard risk |

---

## 1. Topography & Elevation Derivatives

### NASA/USGS Shuttle Radar Topography Mission (SRTM 30m)
* **Provider**: NASA Jet Propulsion Laboratory / USGS EROS / AWS Open Data Registry.
* **Coverage**: Tiles `N25E091` (Meghalaya), `N26E091` (Assam Valley), `N27E088` (Sikkim), `N27E092` (Arunachal Pradesh).
* **Derived Physical Variables**:
  - `elevation`: Raw terrain altitude in metres above sea level (WGS84 ellipsoid).
  - `slope`: Topographic gradient in degrees ($0^\circ–90^\circ$) via 2nd-order spatial central differences with dynamic latitude projection scaling.
  - `aspect`: Downhill slope facing direction ($0^\circ–360^\circ$).
  - `tri` (Terrain Ruggedness Index): Root Mean Square of elevation variance across a $3	imes3$ pixel window (Wilson et al. 2007).
  - `relief_5x5`: Macro-topographic range ($\max Z - \min Z$) across a $5	imes5$ window ($150	ext{m} 	imes 150	ext{m}$).
  - `plan_curvature`: Horizontal contour curvature (Evans 1980) measuring surface water convergence vs ridge divergence.
* **Limitations**: 30m spatial sampling does not resolve individual sub-30m man-made roadside cuts or retaining wall engineering.

---

## 2. Hydrology & River Networks

### HydroSHEDS / HydroRIVERS & HydroBASINS
* **Provider**: World Wildlife Fund (WWF), USGS, and HydroSHEDS.
* **Coverage**: All major river systems across NER (Brahmaputra, Teesta, Barak, Subansiri, Manas, Umngot, Kopili, Kameng, Dhansiri).
* **Variables Provided**:
  - `nearest_river`: Official river name and hydrologic basin assignment.
  - `distance_km`: Geodesic distance to nearest active river or perennial tributary.
  - `strahler_order`: Hierarchical stream order (1–8).
  - `mean_discharge_m3s`: Long-term mean annual discharge in $	ext{m}^3/	ext{s}$.
  - `basin_name`: Major drainage sub-basin (Upper Brahmaputra, Middle Brahmaputra, Meghalaya Plateau, Barak Valley, Teesta).
* **Caching & Performance**: Preloaded into memory KDTree structures for $< 0.1	ext{ ms}$ query latency.

---

## 3. Precipitation & Meteorological Reanalysis

### Open-Meteo ERA5 / ECMWF NWP & NASA GPM IMERG
* **Provider**: European Centre for Medium-Range Weather Forecasts (ECMWF) / Open-Meteo GmbH / NASA GSFC.
* **Temporal Horizon**: 1940–present historical reanalysis + 16-day operational forecast.
* **Variables Provided**:
  - Multi-scale accumulation: `rainfall_1h`, `rainfall_3h`, `rainfall_6h`, `rainfall_24h`, `rainfall_72h`, `rainfall_7d`, `rainfall_30d` (mm).
  - `rainfall_anomaly_pct`: Percentage deviation from the 30-year monthly climatological baseline for the North Eastern Region.
  - `monthly_climatology_mm`: Standard historical monthly precipitation for the regional climate regime.
* **Physical Integrity**: Zero synthetic rainfall. If remote network connection fails, the system transitions to `DEGRADED` status with transparent provenance.

---

## 4. Satellite Observations (SAR & Optical)

### ESA Copernicus Sentinel-1 RTC (C-band SAR)
* **Provider**: European Space Agency (ESA) Copernicus / Microsoft Planetary Computer STAC.
* **Wavelength**: C-band (5.405 GHz), 10m spatial resolution.
* **Variables**: `sar_vv` (co-polarization power), `sar_vh` (cross-polarization power), `sar_ratio` ($	ext{VV}/	ext{VH}$), orbit direction (`ASCENDING`/`DESCENDING`), acquisition timestamp.
* **Role**: All-weather ground backscatter, soil moisture proxy, and post-event surface scarring.

### ESA Copernicus Sentinel-2 Level-2A (MSI Optical)
* **Provider**: ESA Copernicus / Microsoft Planetary Computer STAC.
* **Spatial Resolution**: 10m (Band 4 Red: 665nm, Band 8 NIR: 842nm).
* **Variables**: `ndvi` (Normalized Difference Vegetation Index: $(	ext{NIR} - 	ext{Red}) / (	ext{NIR} + 	ext{Red})$), `vegetation_health`, `cloud_cover_pct`.
* **Cloud Masking Protocol**: Evaluates Scene Classification Layer (SCL) and filters out optical observations with cloud cover exceeding 30%.

---

## 5. Land Cover & Surface Classification

### ESA WorldCover 10m Global Land Cover
* **Provider**: European Space Agency (ESA) / VITO Remote Sensing.
* **Classes**:
  - `10`: Tree cover (Dense sub-tropical and temperate montane forests)
  - `20`: Shrubland (Degraded scrub and secondary growth)
  - `30`: Grassland (Alpine meadows and valley grasslands)
  - `40`: Cropland (Terraced paddy fields, tea gardens)
  - `50`: Built-up (Urban settlements, towns, and paved infrastructure)
  - `60`: Bare / sparse vegetation (Exposed rocky scarps, landslide scars)
  - `70`: Snow and ice (Glaciers and perennial snow in North Sikkim)
  - `80`: Permanent water bodies (Brahmaputra channels and lakes)
  - `90`: Herbaceous wetland (Floodplain beels and marshes)

---

## 6. Transportation & Infrastructure

### Survey of India & OpenStreetMap Transport Network
* **Provider**: Survey of India / OpenStreetMap Contributors / Geofabrik.
* **Coverage**: National Highways (`NH-10`, `NH-27`, `NH-40`, `NH-13`, `NH-102`), state highways, and 120+ NER towns.
* **Variables**: `nearest_highway`, `distance_to_highway_km`, `nearest_settlement`, `distance_to_settlement_km`, `dist_to_infrastructure_km`.
* **Scientific Role**: Represents human exposure and proximity to engineered slope cuts.

---

## 7. Historical Disaster Hazard Inventories

### NASA Global Landslide Catalog (GLC) & COOLR
* **Provider**: NASA Goddard Space Flight Center (2007–2018).
* **Records**: 483 verified landslide occurrences across Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.

### Central Water Commission (CWC) & Assam SDMA Flood Catalog
* **Provider**: Central Water Commission / Assam State Disaster Management Authority (1998–2024).
* **Records**: Major historical flood events across Kaziranga, Majuli, Silchar, Barpeta, Dhemaji, Morigaon, Dhubri, and Nalbari with inundation area and breach records.
