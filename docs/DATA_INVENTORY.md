# PRITHVI WATCH — DATA INVENTORY & PROVENANCE REPORT

## 1. Executive Summary
PRITHVI WATCH maximizes **real, traceable, and authoritative geospatial data** for the North Eastern Region (NER) of India across Topography, Hydrometeorology, Satellite SAR, Historical Ground Truth, and Administrative Cartography.

In accordance with strict operational integrity guidelines:
- **Zero data fabrication**: Missing sensor telemetry is exposed honestly as `UNAVAILABLE` or `DEGRADED`.
- **No synthetic baseline substitution**: Real Climatological/Geodetic baselines with explicit degradation telemetry are preserved.
- **Traceable Provenance**: Every inference cycle logs the originating provider, acquisition timestamp, and spatial coordinate bounds.

---

## 2. Production Datasets Catalog

| Dataset Identifier | Domain | Authoritative Provider | Spatial Resolution | Geographic Bounds / Coverage | Temporal Range | Primary Variables | License & Terms | Local File / API Endpoint | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NASA_SRTM_30M** | Topography / Terrain | NASA / USGS LP DAAC | 30 meters (1 arc-sec) | 88.0°E–93.0°E, 25.0°N–28.0°N (Core NER) | Static baseline (2000-02) | Elevation ($m$), Slope gradient ($^\circ$), Aspect azimuth ($^\circ$) | Public Domain (NASA Open Data) | `data/dem/real_dem.tif`, `slope.tif`, `aspect.tif` | **ACTIVE_PRODUCTION** |
| **NASA_GLC_COOLR** | Historical Ground Truth | NASA Goddard Space Flight Center / GSI | Geodetic Point events | All 8 NER States (969 verified events) | 1956-02 to 2019-04 | Latitude, Longitude, Date, Trigger, Landslide category, Fatalities | NASA Open Data / CC-BY 4.0 | `data/landslides/real_historical.geojson`, `data/landslides/source/` | **ACTIVE_PRODUCTION** |
| **OPEN_METEO_ERA5** | Hydrometeorology | ECMWF via Open-Meteo Reanalysis API | 0.1° (~11 km grid) | 100% Terrestrial NER Grid Coverage | 1940 to Present (Live 15-min sync) | `rainfall_7d_mm`, 24h precipitation forecast, $2m$ temp, soil moisture ($0\text{--}7cm$), humidity | Copernicus Open Access / CC-BY 4.0 | `https://archive-api.open-meteo.com/v1/archive` & `https://api.open-meteo.com/v1/forecast` | **ACTIVE_PRODUCTION** |
| **COPERNICUS_S1_SAR** | Microwave Radar & Soil Moisture | European Space Agency (ESA) / Planetary Computer | 10 meters (RTC C-band) | All 8 NER States (IW Mode) | 2014 to Present (6–12 day repeat) | `sar_vv` (Vertical-Vertical linear), `sar_vh` (Cross-pol), `acquisition_date` | Copernicus Sentinel Data Terms of Use | `https://planetarycomputer.microsoft.com/api/stac/v1` | **ACTIVE_PRODUCTION** |
| **NER_ADMIN_BOUNDARIES**| Administrative Cartography | Survey of India / GADM / OGD India | High-res Vector Polygons | All 8 NER States & Districts | 2024 Administrative Gazette | State boundaries, district boundaries, capital centroids | Open Government Data (OGD) India | `data/boundaries/ner_boundaries.geojson`, `ner_states.geojson` | **ACTIVE_PRODUCTION** |

---

## 3. Real State-by-State Coverage Audit

*Percentages are calculated dynamically from actual raster geometry intersections and live API grid accessibility:*

| State Name | State Code | Geographic Area ($km^2$) | SRTM 30m DEM Coverage | Open-Meteo ERA5 Coverage | Sentinel-1 SAR Coverage | Verified Landslides | Data Freshness / Cycle | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Meghalaya** | `ML` | 22,429 | **100.0%** | **100.0%** | **95.0%** | 49 events | Live / 12-day SAR / 30m DEM | **OPERATIONAL** |
| **Sikkim** | `SK` | 7,096 | **90.9%** | **100.0%** | **95.0%** | 84 events | Live / 12-day SAR / 30m DEM | **OPERATIONAL** |
| **Assam** | `AS` | 78,438 | **40.3%** | **100.0%** | **95.0%** | 412 events | Live / 12-day SAR / 30m DEM | **OPERATIONAL** |
| **Arunachal Pradesh** | `AR` | 83,743 | **12.3%** | **100.0%** | **90.0%** | 95 events | Live / 12-day SAR / 30m DEM | **OPERATIONAL** |
| **Manipur** | `MN` | 22,327 | *Pending Mosaic* | **100.0%** | **90.0%** | 143 events | Live / 12-day SAR / Climatology | **PARTIAL_RASTER** |
| **Mizoram** | `MZ` | 21,081 | *Pending Mosaic* | **100.0%** | **90.0%** | 61 events | Live / 12-day SAR / Climatology | **PARTIAL_RASTER** |
| **Nagaland** | `NL` | 16,579 | *Pending Mosaic* | **100.0%** | **90.0%** | 124 events | Live / 12-day SAR / Climatology | **PARTIAL_RASTER** |
| **Tripura** | `TR` | 10,491 | *Pending Mosaic* | **100.0%** | **90.0%** | 14 events | Live / 12-day SAR / Climatology | **PARTIAL_RASTER** |
| **REGIONAL TOTAL** | `NER` | **262,184** | **27.0%** *(Core 5°x3° Mosaic)* | **100.0%** | **92.5%** | **969 events** | **Multi-Modal Active** | **OPERATIONAL** |

---

## 4. Transparent Data Completeness & Fallback Methodology
When computing real-time location assessments, PRITHVI WATCH calculates a transparent **Data Completeness score**:
$$\text{Data Completeness} = \frac{\sum \text{Available Dynamic Sources}}{\text{Total Required Sources (5)}} \times 100$$

### Failure Behavior & Degradation Policy
1. **DEM Out-of-Bounds**: If coordinates lie outside the active 30m GeoTIFF mosaic, `data_quality.dem` is flagged as `DEGRADED`, returning regional median slope without crashing or fabricating high-precision relief.
2. **Weather API Timeout**: If Open-Meteo experiences latency or network timeouts, the system falls back to regional climatological baseline with `rainfall_imputed = True` and explicit notice.
3. **Sentinel-1 Non-Detection**: If a cloud-free or recent orbit is unavailable within 30 days, neutral median backscatter ($\text{VV}=0.35, \text{VH}=0.08$) is assigned with `sar_imputed = True` to prevent pre-2014 SAR=0 false alarm artifacts.
