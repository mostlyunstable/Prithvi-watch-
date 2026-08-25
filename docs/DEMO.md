# PRITHVI WATCH — SIH Judge Demonstration Guide

**Project Title**: PRITHVI WATCH — AI-Powered Landslide Risk Monitoring & Early Warning System for North Eastern India (NER)  
**Target Event**: Smart India Hackathon (SIH26001)

---

## 1. Quick 30-Second Judge Overview

1. **The Problem**: The North Eastern Region of India (Sikkim, Meghalaya, Assam, Arunachal Pradesh) suffers deadly monsoon-induced landslides due to extreme relief and cloudburst events.
2. **Our Solution**: An operational AI early-warning system that combines **30m SRTM topography** (elevation, slope, aspect), **Open-Meteo ERA5 antecedent rainfall**, and **Sentinel-1 SAR C-band radar backscatter** to predict slope instability and issue decision-support advisories with SHAP explainability.
3. **Scientific Defense**: Zero synthetic production data; validated with **Spatial GroupKFold** holding out whole 1-degree regional blocks ($\approx 111\text{ km}$), lifting the baseline terrain model ($0.575\text{ ROC-AUC}$) to a multimodal **$0.757\text{ ROC-AUC}$** on concurrent satellite eras.

---

## 2. Live Demonstration Workflow (Step-by-Step)

### Step 1: Select a Target Hotspot
* Use the **Region Jump** dropdown in the top header (e.g. *Shillong - Meghalaya*, *Gangtok - Sikkim*, or *Cherrapunji - High Monsoon Zone*), or click directly on any coordinate on the MapLibre map.
* The map smoothly flies to the region and sets the active investigation marker.

### Step 2: Observe Live Environmental Sensor Vector
* The sidebar extracts the live 6-feature vector from local rasters and APIs:
  - **Elevation**: e.g., $1,496\text{ m}$ (SRTM 30m)
  - **Slope**: e.g., $28.4^\circ$
  - **Aspect**: e.g., $142^\circ$
  - **7-day Rainfall**: e.g., $214.6\text{ mm}$ (Open-Meteo ERA5 / ECMWF)
  - **Sentinel-1 SAR VV / VH**: e.g., $0.785 / 0.142$ (Planetary Computer STAC)

### Step 3: Inspect SHAP Feature Attribution (Why the AI made the decision)
* Under **Primary Physical Drivers**, observe the directional SHAP bars:
  - `↑ +risk` (Orange/Red): High slope and heavy antecedent rainfall increasing failure probability.
  - `↓ -risk` (Green): Moderate elevation or stable radar backscatter mitigating risk.

### Step 4: Early Warning Advisory Generation
* When probability exceeds **$60\%$ (HIGH)** or **$80\%$ (CRITICAL)**, the **Landslide Early Warning Advisory** appears automatically, recommending targeted monitoring and alerting local emergency road clearance teams.

### Step 5: Toggle Spatial Risk Grid & Historical Landslides
* In the map layer panel (top-right), toggle **Spatial Risk Grid (0.05°)** to render live colored hazard polygons across the entire regional corridor.
* Hover over any red historical point to view verified NASA Global Landslide Catalog records.

### Step 6: Controlled Demo Scenarios (Deterministic Presentation Mode)
* Click the **REAL DATA / DEMO SCENARIOS** toggle in the header.
* Switch between:
  - **Scenario A (Normal)**: Low rainfall ($18\text{ mm}$), moderate slope $\to$ **LOW RISK ($18.5\%$)**.
  - **Scenario B (Heavy Rain)**: Saturated slope ($218\text{ mm}$ rain, $33.8^\circ$ slope) $\to$ **HIGH RISK ($74.2\%$)**.
  - **Scenario C (Cloudburst)**: Extreme forcing ($412\text{ mm}$ rain, $42.4^\circ$ slope) $\to$ **CRITICAL ALERT ($92.8\%$)**.
* Notice how SHAP feature contribution bars and warning banners adapt dynamically.

### Step 7: Show Scientific Validation & Architecture Modals
* Click **ML Holdout ROC-AUC: 0.757** in the header to show the scientific audit summary and proof of spatial holdout validation.
* Click **Architecture** to show the complete data flow pipeline.

---

## 3. How to Run Locally

### Start Backend (Port 8000)
```bash
cd backend
source ../.venv/bin/activate
export DYLD_LIBRARY_PATH="/Users/caffinelove/.homebrew/opt/libomp/lib:$DYLD_LIBRARY_PATH"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173`.
