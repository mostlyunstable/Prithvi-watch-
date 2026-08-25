# E2E Test Infra: PRITHVI WATCH Full System Audit

## Test Philosophy
- Opaque-box, requirement-driven and white-box unit/integration verification.
- Zero tolerance for simulated or cheated test outputs.
- Comprehensive coverage across backend ML APIs, spatial hazard grids, MapLibre GIS layers, and frontend UX.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Unit/Feature) | Tier 2 (Boundary/Edge) | Tier 3 (Cross-Feature) | Tier 4 (Workload/E2E) |
|---|---------|-------------|:---------------------:|:----------------------:|:----------------------:|:---------------------:|
| 1 | Health & Metrics REST API | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 2 | Predictions & SHAP Additivity | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 3 | Demo Scenarios ('A', 'B', 'C') | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 4 | External Fallbacks (SAR, Weather, DEM) | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 5 | Risk Map GeoJSON & Grid Generator | R2 | 5 tests | 5 tests | ✓ | ✓ |
| 6 | Frontend MapLibre Full-Bleed Rendering | R2, R3 | 5 tests | 5 tests | ✓ | ✓ |
| 7 | Coordinate Handling & Event Propagation | R2, R3 | 5 tests | 5 tests | ✓ | ✓ |
| 8 | Historical Date & NaN Sanitization | R3 | 5 tests | 5 tests | ✓ | ✓ |
| 9 | Frontend TypeScript Build | R4 | 1 build check | 1 typecheck | ✓ | ✓ |
| 10 | Pytest Backend Suite | R4 | 12 tests | 12 tests | ✓ | ✓ |

## Test Architecture
- **Backend Test Runner**:
  ```bash
  PYTHONPATH=backend DYLD_LIBRARY_PATH=/Users/caffinelove/.homebrew/Cellar/libomp/22.1.8/lib \
  uv run --with "fastapi,pydantic,xgboost,shap,rasterio,pandas,numpy,requests,urllib3,pyproj,pytest,httpx,pytest-mock,scikit-learn" \
  pytest backend/tests/ -v
  ```
- **Frontend Test Runner**:
  ```bash
  cd frontend && npx tsc --noEmit && npm run build
  ```
- **Live Assessment Probing**:
  Direct script-based verification of predictions, SHAP log-odds mathematical equality, and GeoJSON bounding box calculations.
