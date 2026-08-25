# PRITHVI WATCH — Machine Learning Model & Methodology

This document details the machine learning methodology, feature engineering pipeline, spatial and temporal validation strategies, and explainability framework implemented in PRITHVI WATCH (Phase 2).

---

## 1. Problem Formulation & Modeling Approach

Landslide risk prediction is formulated as a spatial classification problem:
$$\text{Risk Probability} = f(\text{Topography}, \text{Morphology}, \text{Exposure}, \text{Meteorological Trigger}, \text{Satellite Radar Indicator})$$

* **Model Algorithm**: Extreme Gradient Boosting (`XGBClassifier`) with log-loss objective.
* **Model Artifact**: `models/xgboost_model.json` (`v4.2-multimodal-morphology-enhanced`)
* **Architecture Principle**:
  $$\text{Topography} + \text{Morphological Ruggedness (TRI/Relief)} + \text{Curvature} + \text{Human Exposure} + \text{Antecedent Rainfall} + \text{Sentinel-1 SAR} \longrightarrow \text{AI Landslide Risk Assessment}$$

---

## 2. Feature Schema (10-Dimensional Vector)

The model operates on a strictly validated 10-dimensional physical feature vector:

| Feature Name | Type | Unit | Description | Source |
|---|---|---|---|---|
| `elevation` | Continuous | metres | Ground elevation above sea level | NASA/USGS SRTM 30m DEM |
| `slope` | Continuous | degrees (0-90) | Terrain steepness via spatial central differences | Derived from DEM raster |
| `aspect` | Continuous | degrees (0-360) | Compass direction that the slope faces | Derived from DEM raster |
| `tri` | Continuous | metres | Terrain Ruggedness Index (RMS elevation difference in 3x3 window) | Derived from 30m DEM (Wilson et al. 2007) |
| `relief_5x5` | Continuous | metres | Local elevation range in 5x5 window (150m x 150m) | Derived from 30m DEM |
| `plan_curvature`| Continuous | $100 \times \text{m}^{-1}$ | Horizontal contour curvature (negative = convergent hollows) | Derived from 30m DEM (Evans 1980) |
| `dist_to_infrastructure_km` | Continuous | kilometres | Geodesic distance to nearest verified transport/settlement node | Survey of India / OSM Gazetteer |
| `rainfall_7d_mm` | Continuous | millimetres | 7-day antecedent precipitation strictly prior to reference date $[T-7\text{d}, T-1\text{d}]$ | Open-Meteo ERA5 / ECMWF |
| `sar_vv` | Continuous | linear power | Sentinel-1 RTC C-band VV co-polarization backscatter $[T-30\text{d}, T]$ | Planetary Computer / Copernicus |
| `sar_vh` | Continuous | linear power | Sentinel-1 RTC C-band VH cross-polarization backscatter $[T-30\text{d}, T]$ | Planetary Computer / Copernicus |

---

## 3. Ground Truth Sampling & Temporal Realism

### Positive Samples (`label = 1`)
* Verified historical landslide occurrences from NASA Global Landslide Catalog (2007–2018) filtered to the exact administrative and raster extent of the North Eastern Region ($N=162$).
* Real historical event timestamp $T$ preserved.

### Background / Negative Samples (`label = 0`)
* Non-event background pixels sampled across valid DEM coverage ($N=162$, balanced 1:1 ratio).
* **Temporally Matched Reference Dates**: Each background location is assigned a historical reference date drawn from the positive event date distribution in the same spatial group or regional pool, preserving historical monsoon seasonality (May–October) and annual distribution across 2007–2018.
* Zero coordinate overlap with positive events.

---

## 4. Dual Validation Strategy

### A. Spatial GroupKFold Validation (1-Degree Grid)
Cross-validation groups samples by 1-degree geographic blocks ($\approx 111\text{ km} \times 111\text{ km}$) to test generalization across unseen terrain regions.
* **Spatial ROC-AUC**: **0.8069**
* **Spatial PR-AUC**: **0.7639**
* **Spatial Precision**: **0.7136**
* **Spatial Recall**: **0.6492**
* **Spatial F1 Score**: **0.6571**
* **Spatial Brier Score**: **0.2230**

### B. Temporal Holdout Validation (Pre-2014 vs 2014–2018)
Model is trained exclusively on earlier historical events ($\le 2013$, $N=169$) and evaluated on unseen future events ($\ge 2014$, $N=155$).
* **Temporal ROC-AUC**: **0.8057**
* **Temporal PR-AUC**: **0.7891**
* **Temporal Precision**: **0.7342**
* **Temporal Recall**: **0.7733**
* **Temporal F1 Score**: **0.7532**
* **Temporal Brier Score**: **0.1902**

---

## 5. Feature Ablation Study

Evaluated under identical Spatial GroupKFold partitions on the leak-free dataset:

| Model Configuration | Active Feature Schema | Spatial ROC-AUC | F1 Score | Brier Score |
|---|---|---|---|---|
| **1. Baseline Terrain** | Elevation, Slope, Aspect | 0.5882 | 0.3377 | 0.4234 |
| **2. Morphology** | Baseline + TRI, Relief (5x5), Plan Curvature | 0.6222 | 0.4025 | 0.4027 |
| **3. Morphology + Rain (7d)** | Morphology + Antecedent Rain (7d) | 0.6352 | 0.4149 | 0.4011 |
| **4. Full Enhanced (10 Feat)** | Topography + Morphology + Infrastructure + Rain + SAR | **0.8069** | **0.6571** | **0.2230** |

---

## 6. Model Architecture Comparison

Evaluated on identical spatial and temporal holdouts:

| Model Architecture | Spatial ROC-AUC | Temporal ROC-AUC | Spatial F1 | Temporal F1 | Spatial Brier |
|---|---|---|---|---|---|
| **XGBoost (Production)** | 0.8093 | 0.8188 | 0.6459 | 0.7742 | 0.2274 |
| **Random Forest** | 0.8199 | 0.8569 | 0.6158 | 0.7895 | 0.2131 |
| **Logistic Regression** | 0.8462 | 0.8615 | 0.7219 | 0.8000 | 0.1774 |
| **Calibrated XGBoost (Platt)** | 0.8299 | 0.8160 | 0.6025 | 0.8026 | 0.2125 |

---

## 7. Model Explainability (TreeSHAP)

Every inference prediction computes exact Shapley attributions via `shap.TreeExplainer`:
* Produces signed log-odds contributions across all 10 environmental and anthropogenic features.
* Ranks features by impact magnitude and categorizes drivers into human-interpretable severity tiers (`LOW`, `MODERATE`, `HIGH`, `VERY HIGH`) for disaster management operators.


