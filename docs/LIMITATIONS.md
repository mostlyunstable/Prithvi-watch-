# PRITHVI WATCH — Current Limitations & Production Roadmap

This document honestly identifies the architectural, spatial, temporal, and data constraints of the current prototype ahead of the August 25, 2026 milestone.

---

## 1. Topographic & Spatial Extent
* **Current Coverage**: 4 mosaicked 1-arcsecond SRTM tiles covering key landslide hotspots in Meghalaya, Assam, Sikkim, and Arunachal Pradesh.
* **Production Roadmap**: Expand mosaicking pipeline across all 8 North Eastern Region states (Manipur, Mizoram, Nagaland, Tripura) using multi-resolution Copernicus DEM (GLO-30) / Cartosat-1 DEM.

---

## 2. Temporal & Meteorological Resolution
* **Current Implementation**: 7-day antecedent cumulative precipitation extracted strictly prior to event timestamp ($[T-7\text{d}, T-1\text{d}]$) via Open-Meteo ERA5 reanalysis and live ECMWF forecasts.
* **Production Roadmap**: Integrate high-frequency (30-minute / 0.1°) IMD radar and NASA GPM/IMERG Early Run satellite precipitation estimates for sub-hourly flash-flood and debris-flow warning.

---

## 3. Satellite SAR Constellation Temporal Horizon
* **Current Implementation**: Sentinel-1 RTC radiometrically terrain-corrected backscatter intensity (VV/VH polarizations) queried dynamically via Microsoft Planetary Computer STAC.
* **Constellation Horizon**: Sentinel-1 was launched in April 2014 and began routine operational data acquisition in October 2014. For historical landslides occurring prior to October 2014, SAR features are imputed with regional neutral medians ($\text{VV}=0.35, \text{VH}=0.08$) and flagged via `sar_available = 0`.
* **Production Roadmap**: Full InSAR (Interferometric SAR) processing using Sentinel-1 SLC pairs to derive line-of-sight (LOS) millimeter-scale ground displacement velocity and coherence loss for contemporary monitoring.

---

## 4. Model Architecture & Sequential Learning
* **Current Model**: Extreme Gradient Boosting (`XGBClassifier`) with SHAP TreeExplainer, validated via Spatial GroupKFold and Temporal Holdout.
* **Production Roadmap**: Spatio-temporal graph neural networks (GNNs) or ConvLSTM architectures incorporating geological lithology, soil moisture profiles, and proximity to fault zones and road cuts.

---

## 5. Data Store & Geo-Server
* **Current Storage**: High-performance in-memory GeoJSON / Cloud-Optimized GeoTIFF raster queries to guarantee zero external database daemon dependencies during local evaluation.
* **Production Roadmap**: PostgreSQL 16 + PostGIS 3.4 spatial backend with pg_tileserv MVT vector tile generation for sub-second pan/zoom across millions of grid cells.

