# Original User Request

## 2026-08-24T07:41:14Z

Perform an end-to-end full system audit and debugging pass on PRITHVI WATCH across backend APIs, ML inference, MapLibre GIS layers, and frontend edge cases.

Working directory: `/Users/caffinelove/untitled folder/prithvi watch`
Integrity mode: development

## Requirements

### R1. Backend & ML Inference Health
Audit and verify all REST endpoints (`/api/health`, `/api/predictions/run`, `/api/risk_map`, `/api/model/info`, `/api/history/landslides`, `/api/metrics`), spatial holdout model metrics, and data pipeline error fallbacks (Open-Meteo ERA5 weather, Sentinel-1 RTC satellite radar, SRTM 30m DEM). Ensure graceful degradation and accurate SHAP log-odds feature contributions.

### R2. GIS Map & Spatial Grid Integrity
Audit MapLibre GL canvas rendering, 0.05° hazard grid calculation, spatial layer controls (historical landslides, boundaries, labels), drop-pin coordinate updates, and hover/click event propagation across North Eastern Region coordinates.

### R3. Frontend Operational UX & Edge Cases
Ensure full-bleed map layout (85–90% workspace) with floating contextual panels, zero 50/50 split screen regressions, responsive behavior across desktop/mobile viewports, and zero invalid/epoch dates (no 1970/01/01) or NaN coordinates.

### R4. Verification & Automated Quality Assurance
Run and verify both the backend Python test suite and frontend TypeScript production build.

## Verification Resources
- Backend Test Suite: `pytest backend/tests/ -v`
- Frontend Typecheck & Build: `cd frontend && npx tsc --noEmit && npm run build`
- Live Endpoint Health: `GET http://127.0.0.1:8000/api/health`

## Acceptance Criteria

### Backend & Model
- [ ] All backend `pytest` tests pass (100% pass rate).
- [ ] `/api/predictions/run` handles both live data and demo scenarios ('A', 'B', 'C') returning valid probabilities [0.0, 1.0] and risk levels.
- [ ] `/api/risk_map` generates valid GeoJSON feature collections within bounding boxes.

### Frontend & Cartography
- [ ] `npx tsc --noEmit && npm run build` compiles with 0 errors.
- [ ] MapLibre map renders full-bleed without layout distortion or 50/50 split widgets.
- [ ] Clicking any map coordinate triggers location assessment and updates the floating panel.
- [ ] Historical landslide records display verified dates or "Date unavailable" (never Unix epoch 1970/01/01).
- [ ] Zero runtime console errors during map navigation, search, and layer toggles.
