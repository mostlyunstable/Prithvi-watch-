# PRITHVI WATCH — Machine Learning Model & Methodology

This document details the machine learning methodology, feature engineering pipeline, spatial validation strategy, and explainability framework implemented in PRITHVI WATCH.

---

## 1. Problem Formulation & Modeling Approach

Landslide risk prediction is formulated as a spatial classification problem:
$$\text{Risk Probability} = f(\text{Topography}, \text{Meteorological Trigger}, \text{Satellite Radar Indicator})$$

* **Model Algorithm**: Extreme Gradient Boosting (`XGBClassifier`) with log-loss objective.
* **Architecture Principle**:
  $$\text{Static Susceptibility (DEM Derivatives)} + \text{Dynamic Environmental Hazard (Rainfall)} + \text{Surface Backscatter (Sentinel-1 SAR)} \longrightarrow \text{AI Landslide Risk Assessment}$$

---

## 2. Feature Schema

The model operates on a strictly validated 6-dimensional feature vector:

| Feature Name | Type | Unit | Description | Source |
|---|---|---|---|---|
| `elevation` | Continuous | metres | Ground elevation above sea level | NASA/USGS SRTM 30m DEM |
| `slope` | Continuous | degrees (0-90) | Terrain steepness calculated via spatial central differences | Derived from DEM raster |
| `aspect` | Continuous | degrees (0-360) | Compass direction that the slope faces | Derived from DEM raster |
| `rainfall_7d_mm` | Continuous | millimetres | 7-day cumulative antecedent precipitation | Open-Meteo ERA5 / ECMWF Forecast |
| `sar_vv` | Continuous | linear power | Sentinel-1 RTC C-band VV co-polarization backscatter | Planetary Computer / Copernicus |
| `sar_vh` | Continuous | linear power | Sentinel-1 RTC C-band VH cross-polarization backscatter | Planetary Computer / Copernicus |

---

## 3. Ground Truth Sampling & Class Balance

* **Positive Samples (`label = 1`)**: Verified historical landslide occurrences from NASA Global Landslide Catalog filtered to the exact administrative and raster extent of the North Eastern Region.
* **Background Samples (`label = 0`)**: Scientifically sampled non-event background locations across valid raster extents, explicitly excluding positive coordinate locations, with fixed seed reproducibility (`seed = 42`).
* **Terminology**: Labeled as *background / non-event samples* rather than "confirmed permanently landslide-free" to maintain geoscientific integrity.

---

## 4. Spatial Validation Strategy

Standard random train/test splitting introduces severe spatial autocorrelation leakage in geospatial models (over-optimistic performance due to geographic proximity).

* **Validation Methodology**: **Spatial GroupKFold Validation**.
* **Grouping**: 1-degree geographic latitude/longitude grid cells ($\approx 111 \text{ km} \times 111 \text{ km}$).
* **Folds**: Cross-validation holds out entire regional geographic blocks during training and tests exclusively on unseen regions.

---

## 5. Model Explainability (SHAP)

Every inference prediction is passed through a dedicated `shap.TreeExplainer`:
* Computes exact Shapley values for each of the 6 features.
* Ranks features by impact magnitude on the output probability.
* Categorizes drivers into human-interpretable severity tiers (`LOW`, `MODERATE`, `HIGH`, `VERY HIGH`) for operational disaster management teams.

---

## 6. Spatial Risk Map Generation

* Function: `backend/app/ml/map_generator.py` (`/api/risk_map`)
* Grids geographic bounding boxes at configurable resolutions (e.g., $0.05^\circ \approx 5.5\text{ km}$).
* Extracts terrain and environmental values per grid centroid, performs vectorized XGBoost batch inference, and generates colored GeoJSON polygons for native MapLibre GL rendering.
