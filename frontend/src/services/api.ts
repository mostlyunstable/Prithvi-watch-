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
