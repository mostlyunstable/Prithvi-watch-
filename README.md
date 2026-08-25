# PRITHVI WATCH

### Observe. Predict. Protect.
**Multimodal Geospatial Landslide Risk Monitoring & Early Warning System for North Eastern India**

---

## Overview

**PRITHVI WATCH** is an operational geospatial disaster-monitoring platform and early warning system designed for the North Eastern Region (NER) of India (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura).

It fuses multi-source Earth Observation data, real-time meteorological observations, and machine learning into an interactive, map-first GIS workstation with TreeSHAP model explainability and decision-support guidance.

---

## Core Capabilities

- **Map-First GIS Workstation**: Full-bleed (85–90%) interactive MapLibre GL canvas with hardware-accelerated vector rendering.
- **Multimodal Data Fusion**:
  - **Terrain**: NASA SRTM 30m DEM (Elevation, Slope, Aspect with cos-latitude curvature scaling).
  - **Precipitation**: ECMWF ERA5 & Open-Meteo 7-day cumulative antecedent rainfall.
  - **Satellite Radar**: ESA Copernicus Sentinel-1 RTC STAC C-band SAR backscatter (VV & VH polarizations).
  - **Historical Ground Truth**: 969 verified landslide failure events from the NASA Global Landslide Catalog (GLC/COOLR).
- **Machine Learning Inference**:
  - Trained gradient-boosted decision tree classifier (XGBoost) evaluated with Spatial GroupKFold cross-validation (1° geographic block holdouts).
  - Continuous landslide probability estimation $[0.0, 1.0]$ and 4-tier risk classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
- **Explainable AI (TreeSHAP)**:
  - Exact additive log-odds feature attribution determining which environmental factors increase or decrease local risk.
- **Dynamic 0.05° Regional Hazard Grid**:
  - Adaptive resolution scaling for regional viewports with translucent risk contours over OpenStreetMap/Carto basemaps.
- **What-If Simulation Sandbox**:
  - Deterministic simulation scenarios (Monsoon Storm Surges, Post-Dry Slope Failures, Heavy Orographic Rain).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, MapLibre GL, Lucide Icons, React Router |
| **Backend** | Python 3.14, FastAPI, Uvicorn, Pydantic v2 |
| **Machine Learning** | XGBoost, TreeSHAP, Scikit-learn, NumPy |
| **Geospatial & Cartography** | GeoJSON, Rasterio, Planetary Computer STAC, Open-Meteo, Carto Voyager/Dark, OpenTopoMap |

---

## Architecture & Data Flow

```text
Client (React + MapLibre GL)
       │
       ▼
FastAPI Gateway (backend/app/main.py)
       ├──> Multimodal Feature Extractor (SRTM DEM, ERA5, Sentinel-1)
       ├──> XGBoost Classifier (models/landslide_xgb_v4.json)
       ├──> TreeSHAP Explainer (Exact Log-Odds Feature Contributions)
       └──> Spatial Hazard Grid Generator (0.05° Vector Polygons)
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/mostlyunstable/Prithvi-watch-.git
cd Prithvi-watch-

# Create and activate Python virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server
export PYTHONPATH=backend
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```

Visit **http://127.0.0.1:5173/** in your browser.

---

## Testing & Quality Assurance

### Run Backend Tests
```bash
source .venv/bin/activate
export PYTHONPATH=backend
pytest backend/tests/ -v
```

### Run Frontend Typecheck & Build
```bash
cd frontend
npx tsc --noEmit && npm run build
```

---

## License
MIT License. Built for disaster risk mitigation and geospatial research.
