# Project: PRITHVI WATCH Full System Audit and Debugging

## Architecture
PRITHVI WATCH is an AI-powered landslide early warning and risk intelligence system for India's North Eastern Region (NER).
- **Backend**: FastAPI (Python 3.12) with XGBoost ML inference, TreeSHAP log-odds feature attribution, spatial DEM sampling (SRTM 30m), Sentinel-1 RTC satellite radar telemetry, and Open-Meteo ERA5 precipitation forecasts.
- **Frontend**: React 18, TypeScript, Tailwind CSS, MapLibre GL for full-bleed GIS cartography with floating contextual HUDs and analytical panels.
- **Data & GIS**: 0.05° hazard grid generator, EPSG:4326 WGS 84 coordinate mapping, STAC Planetary Computer client, and historical GSI landslide databases.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Health & Telemetry REST API | `/api/health` and `/api/metrics` with system status and operational counters | M1 | Survey (Backend) |
| 2 | Landslide Prediction & SHAP Inference | `/api/predictions/run` with log-odds SHAP additive explanations & demo scenarios ('A','B','C') | M1 | Survey (Backend) |
| 3 | Spatial Hazard Grid API | `/api/risk_map` generating GeoJSON FeatureCollections within bounding boxes | M1 | Survey (Backend & GIS) |
| 4 | External Fallback Pipelines | Graceful degradation for Sentinel-1 radar, Open-Meteo weather, and DEM bounds | M1 | Survey (Backend) |
| 5 | GeoJSON Property Synchronization | Harmonize `risk_probability` key across backend and frontend `geoAnalytics.ts` & `Map.tsx` | M1 | Survey (GIS) |
| 6 | Viewport Zoom-Adaptive Grid Resolution | Dynamically scale grid resolution at low zoom (<7.0) to prevent >10,000 cells HTTP 400 | M1 | Survey (GIS) |
| 7 | Map Style Switch Layer Retention | Retain `spatial-risk-map` across basemap changes in `style.load` and enforce `beforeId` order | M1 | Survey (GIS) |
| 8 | Full-Bleed Map Layout & HUDs | 85–90% map canvas workspace with floating overlay panels and zero 50/50 split regressions | M2 | Survey (Frontend) |
| 9 | Temporal & Coordinate Sanitization | No 1970/01/01 epoch dates ("Date unavailable" fallback) and zero NaN/undefined coordinates | M2 | Survey (Frontend) |
| 10 | Interactive Map Event Propagation | Drop-pin selection, click/hover popup handlers, and instant floating panel assessment updates | M2 | Survey (GIS & Frontend) |
| 11 | Backend Automated Pytest Suite | Comprehensive pytest test suite with 100% pass rate (`pytest backend/tests/ -v`) | M3 | Survey (Backend/QA) |
| 12 | Frontend Production TypeScript Build | 0-error typecheck and production build (`npx tsc --noEmit && npm run build`) | M3 | Survey (Frontend/QA) |
| 13 | Forensic Integrity Verification | Clean forensic audit report verifying authentic ML inference, no cheating/facades | M3 | Survey (Audit) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | GIS Spatial Grid & API Property Remediation | Fix `risk_probability` property synchronization, adaptive zoom resolution in `Map.tsx`, basemap style switch persistence, and layer ordering | none | DONE |
| 2 | Frontend UX & Edge Cases Hardening | Verify interactive event propagation, coordinate drop-pin updates, date sanitization, and responsive floating HUDs | M1 | DONE |
| 3 | Comprehensive Quality Assurance & Forensic Audit | Run full backend test suite, frontend production build, adversarial E2E checks, and forensic integrity audit | M1, M2 | DONE |

## Interface Contracts
### Backend `/api/risk_map` ↔ Frontend `Map.tsx` & `geoAnalytics.ts`
- **Request**: `GET /api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}`
- **Response**: GeoJSON `FeatureCollection` with properties:
  - `risk_probability`: float `[0.0, 1.0]` (frontend also supports legacy fallback `probability` / `landslide_probability`)
  - `risk_level`: `"LOW"` | `"MODERATE"` | `"HIGH"` | `"CRITICAL"`
  - `fill`: hex color string (e.g. `"#ef4444"`)
  - `elevation`: float
  - `slope`: float

### Backend `/api/predictions/run` ↔ Frontend `api.ts` & `AppContext.tsx`
- **Request**: `POST /api/predictions/run` with `{ latitude: float, longitude: float, scenario?: 'A' | 'B' | 'C' }`
- **Response**:
  - `prediction`: `{ landslide_probability: float, risk_level: string, confidence: string }`
  - `features`: `{ elevation, slope, aspect, rainfall_7d_mm, sar_vv, sar_vh }`
  - `shap_values`: `{ base_value: float, values: float[], feature_names: string[] }` where `1 / (1 + exp(-(base_value + sum(values)))) == landslide_probability`
  - `data_quality`: `{ dem: string, weather: string, satellite: string }`
  - `telemetry`: `{ sar_imputed: boolean, rainfall_imputed: boolean, live_mode: boolean }`

## Code Layout
- `backend/app/main.py`: FastAPI entrypoint and REST router definitions.
- `backend/app/api/endpoints.py`: REST endpoint handlers.
- `backend/app/ml/inference.py`: XGBoost inference, TreeSHAP explainer, probability calibration.
- `backend/app/ml/features.py`: DEM raster sampling, Open-Meteo weather fetch, Sentinel-1 radar STAC client & neutral fallbacks.
- `backend/app/ml/map_generator.py`: Bounding box hazard grid generation and GeoJSON serialization.
- `backend/tests/`: Pytest suite (`test_api.py`, `test_hardened.py`).
- `frontend/src/components/Map.tsx`: MapLibre GL map component, layer configurations, and event handlers.
- `frontend/src/utils/geoAnalytics.ts`: Spatial grid analysis, historical date formatting, and risk statistics.
- `frontend/src/pages/`: Page views (`OverviewPage.tsx`, `RiskMapPage.tsx`, `AssessmentPage.tsx`, `HistoryPage.tsx`, etc.).
- `frontend/src/context/AppContext.tsx`: Global application state, coordinate selection, and prediction dispatcher.
