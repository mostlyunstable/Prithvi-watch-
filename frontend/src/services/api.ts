const API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname || '127.0.0.1'}:8000/api`
  : 'http://127.0.0.1:8000/api';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  mode: string;
  timestamp: string;
}

export interface ModelInfoResponse {
  model_version: string;
  algorithm: string;
  feature_count: number;
  features: string[];
  spatial_validation: string;
  audited_metrics: {
    clean_concurrent_era_roc_auc: number;
    terrain_only_baseline_roc_auc: number;
    full_spatial_roc_auc: number;
    spatial_precision: number;
    spatial_recall: number;
    spatial_f1: number;
  };
  data_sources: {
    [key: string]: {
      name: string;
      status: string;
      type: string;
    };
  };
  coverage: string;
}

export interface PredictionFeatures {
  elevation: number;
  slope: number;
  aspect: number;
  rainfall_7d_mm: number;
  sar_vv: number;
  sar_vh: number;
}

export interface SHAPExplanation {
  feature: string;
  impact: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';
  value: number;
  direction?: 'increases' | 'decreases';
}

export interface HistoricalContext {
  nearby_count: number;
  radius_km: number;
  nearest_event?: {
    distance_km: number;
    event_date: string;
    state_name: string;
    trigger: string;
  } | null;
}

export interface DataQuality {
  dem: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  weather: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  satellite: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
}

export interface SensorTelemetry {
  dem_error?: string | null;
  weather_error?: string | null;
  satellite_error?: string | null;
  sar_acquisition_date?: string | null;
  sar_imputed?: boolean;
  rainfall_imputed?: boolean;
}

export interface RiskVelocityProperties {
  current_risk: number;
  previous_risk: number | null;
  risk_delta: number | null;
  risk_delta_pct: number | null;
  trend: 'RAPIDLY_INCREASING' | 'INCREASING' | 'STABLE' | 'DECREASING' | 'RAPIDLY_DECREASING' | 'INSUFFICIENT_HISTORY';
  confidence: 'HIGH' | 'REDUCED' | 'UNKNOWN';
  observation_age_hours: number | null;
  fill: string;
  primary_driver: string;
  data_quality?: string;
  feature_deltas?: {
    rainfall_delta_mm?: number;
    sar_vv_delta?: number;
  };
}

export interface SnapshotTimelineRecord {
  id?: string;
  timestamp: string;
  risk_probability: number;
  rainfall_7d_mm?: number;
  sar_vv?: number;
  elevation?: number;
  slope?: number;
  data_quality?: string;
}

export interface PredictionResponse {
  prediction_id: string;
  region_id: string;
  region_name: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  features: PredictionFeatures;
  landslide_probability: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  explanation: SHAPExplanation[];
  timeline: {
    Current: string;
    '+6h': string;
    '+12h': string;
    '+24h': string;
  };
  risk_velocity?: RiskVelocityProperties;
  timeline_snapshots?: SnapshotTimelineRecord[];
  historical_context?: HistoricalContext;
  data_quality?: DataQuality;
  telemetry?: SensorTelemetry;
  model_version: string;
  mode: string;
}

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
  return response.json();
};

export const fetchModelInfo = async (): Promise<ModelInfoResponse> => {
  const response = await fetch(`${API_BASE_URL}/model/info`);
  if (!response.ok) throw new Error(`Model info fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchRegions = async () => {
  const response = await fetch(`${API_BASE_URL}/regions`);
  if (!response.ok) throw new Error(`Regions fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchHistoricalLandslides = async () => {
  const response = await fetch(`${API_BASE_URL}/history/landslides`);
  if (!response.ok) throw new Error(`Historical landslides fetch failed: ${response.statusText}`);
  return response.json();
};

export const runPrediction = async (lat: number, lng: number, scenario?: string): Promise<PredictionResponse> => {
  const response = await fetch(`${API_BASE_URL}/predictions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, scenario })
  });
  if (!response.ok) throw new Error(`Prediction execution failed: ${response.statusText}`);
  return response.json();
};

export const fetchRiskMap = async (minLon: number, minLat: number, maxLon: number, maxLat: number, resolution: number = 0.05) => {
  const response = await fetch(
    `${API_BASE_URL}/risk_map?min_lon=${minLon}&min_lat=${minLat}&max_lon=${maxLon}&max_lat=${maxLat}&resolution=${resolution}`
  );
  if (!response.ok) throw new Error(`Risk map generation failed: ${response.statusText}`);
  return response.json();
};

export const fetchRiskVelocity = async (
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  resolution: number = 0.05,
  scenario?: string
) => {
  const scenarioParam = scenario ? `&scenario=${scenario}` : '';
  const response = await fetch(
    `${API_BASE_URL}/risk_velocity?min_lon=${minLon}&min_lat=${minLat}&max_lon=${maxLon}&max_lat=${maxLat}&resolution=${resolution}${scenarioParam}`
  );
  if (!response.ok) throw new Error(`Risk velocity generation failed: ${response.statusText}`);
  return response.json();
};

export const fetchPredictionTimeline = async (lat: number, lng: number, limit: number = 5) => {
  const response = await fetch(`${API_BASE_URL}/predictions/timeline?lat=${lat}&lng=${lng}&limit=${limit}`);
  if (!response.ok) throw new Error(`Prediction timeline fetch failed: ${response.statusText}`);
  return response.json();
};

export interface StateCoverageMetric {
  state_code: string;
  capital: string;
  area_sq_km: number;
  dem_coverage_pct: number;
  rainfall_coverage_pct: number;
  sar_coverage_pct: number;
  historical_landslides: number;
  data_age: string;
  status: 'OPERATIONAL' | 'PARTIAL_RASTER';
  terrain_type: string;
}

export interface DataCoverageResponse {
  region: string;
  states_count: number;
  total_geographic_area_sq_km: number;
  overall_dem_coverage_pct: number;
  overall_weather_coverage_pct: number;
  overall_sar_coverage_pct: number;
  total_historical_landslides: number;
  states: Record<string, StateCoverageMetric>;
  audit_timestamp: string;
}

export interface DatasetSource {
  id: string;
  name: string;
  provider: string;
  domain: string;
  resolution: string;
  coverage: string;
  temporal_range: string;
  variables: string[];
  license: string;
  local_files?: string[];
  api_endpoint?: string;
  status: string;
}

export interface DataInventoryResponse {
  datasets: DatasetSource[];
  last_audited: string;
}

export const fetchDataCoverage = async (): Promise<DataCoverageResponse> => {
  const response = await fetch(`${API_BASE_URL}/data/coverage`);
  if (!response.ok) throw new Error(`Data coverage fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchDataInventory = async (): Promise<DataInventoryResponse> => {
  const response = await fetch(`${API_BASE_URL}/data/inventory`);
  if (!response.ok) throw new Error(`Data inventory fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchDataAcquisitions = async () => {
  const response = await fetch(`${API_BASE_URL}/data/acquisitions`);
  if (!response.ok) throw new Error(`Data acquisitions fetch failed: ${response.statusText}`);
  return response.json();
};

