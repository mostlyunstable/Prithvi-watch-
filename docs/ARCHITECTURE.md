# PRITHVI WATCH — System Architecture

PRITHVI WATCH is an AI-powered landslide risk monitoring and early warning system specifically tailored for the mountainous terrain of the North Eastern Region (NER) of India.

---

## High-Level Architecture

```
                                 [ DATA INGESTION ]
   +-----------------------+  +----------------------+  +---------------------+
   | NASA / USGS SRTM DEM  |  | NASA Global Landslide|  | Open-Meteo ERA5 /   |
   | (1 Arc-sec / 30m)     |  | Catalog (COOLR)      |  | Forecast Weather API|
   +-----------+-----------+  +----------+-----------+  +----------+----------+
               |                         |                         |
               | (Elevation/Slope/Aspect)| (Ground Truth Labels)   | (7-day Rainfall)
               v                         v                         v
   +--------------------------------------------------------------------------+
   |          FEATURE ENGINEERING & DATASET BUILDER (Spatial Grouping)        |
   |           [ Elevation | Slope | Aspect | Rain_7d | SAR_VV | SAR_VH ]      |
   +-------------------------------------+------------------------------------+
                                         |
                                         v
   +--------------------------------------------------------------------------+
   |         MACHINE LEARNING PIPELINE (backend/scripts/train_model.py)       |
   |             - XGBoost Binary Classifier with Log-Loss Objective          |
   |             - Spatial GroupKFold Cross-Validation (1° Grid Holdout)      |
   |             - SHAP TreeExplainer Feature Importance Driver               |
   +-------------------------------------+------------------------------------+
                                         |
                                         v
   +--------------------------------------------------------------------------+
   |                       FASTAPI BACKEND SERVICE                            |
   |  - POST /api/predictions/run : Real-time coordinate risk & SHAP drivers   |
   |  - GET  /api/risk_map        : Dynamic 0.05° spatial polygon risk grid   |
   |  - GET  /api/regions         : NER administrative boundary GeoJSON       |
   |  - GET  /api/history/landslides: Historical landslide event GeoJSON      |
   +-------------------------------------+------------------------------------+
                                         |
                                         v
   +--------------------------------------------------------------------------+
   |                    REACT + VITE + MAPLIBRE FRONTEND                      |
   |  - Interactive Multi-Layer GIS Map (Terrain, Boundaries, Events, Risk Grid)|
   |  - AI Prediction Panel (Risk %, Dynamic Timeline, SHAP Primary Drivers)  |
   |  - Early Warning Emergency Alert Banner & Disaster Management Dispatch   |
   |  - Verified Mode Switch (Real Data vs. Isolated Demo Scenarios)          |
   +--------------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Geospatial & Environmental Engine (`backend/app/ml/`)
- `providers.py`: Abstract multi-provider catalog ingestion (NASA -> GSI -> Local -> Mirror).
- `features.py`: Real-time coordinate feature extractor querying local GeoTIFFs, live Open-Meteo rainfall, and Sentinel-1 SAR.
- `weather.py`: Interface for Open-Meteo ERA5 reanalysis and ECMWF NWP live forecasting.
- `satellite.py`: Windowed Cloud-Optimized GeoTIFF (COG) reader querying Sentinel-1 RTC C-band SAR backscatter from Microsoft Planetary Computer STAC.
- `map_generator.py`: Generates spatial grid polygons with model probabilities across arbitrary bounding boxes.

### 2. Machine Learning Core (`backend/app/ml/model.py`)
- `LandslideRiskModel`: Thread-safe inference wrapper managing model weights (`xgboost_model.json`) and tree explainers.
- Risk Classification: Strict thresholding into `LOW`, `MODERATE`, `HIGH`, `CRITICAL` probability tiers.
- Explainability: SHAP Shapley values computed and ranked by relative driver contribution.

### 3. API Gateway (`backend/app/main.py`)
- High-performance asynchronous endpoints powered by Starlette & Uvicorn.
- CORS-enabled with complete request schema validation via Pydantic.

### 4. Interactive GIS Dashboard (`frontend/`)
- TypeScript + React with MapLibre GL for client-side WebGL geospatial rendering.
- Tailwind CSS v4 design system with operational emergency UI styling.
