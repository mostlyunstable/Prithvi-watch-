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

export interface OperationalSourceStatus {
  source_name: string;
  domain: string;
  status: 'AVAILABLE' | 'STALE' | 'DEGRADED' | 'UNAVAILABLE';
  observed_at: string;
  retrieved_at: string;
  age_display: string;
  cadence: string;
}

export interface LiveOperationsStatusResponse {
  system_status: string;
  mode: string;
  last_assessment_timestamp: string | null;
  sources: {
    weather: OperationalSourceStatus;
    satellite: OperationalSourceStatus;
    terrain: OperationalSourceStatus;
    landslides: OperationalSourceStatus;
    model: {
      name: string;
      status: string;
      validation: string;
      explainability: string;
      cadence: string;
    };
  };
}

export interface OperationalEventRecord {
  event_id: string;
  timestamp: string;
  event_type: string;
  title: string;
  description: string;
  location_name: string;
  coordinates: [number, number];
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata: Record<string, any>;
}

export interface LiveActivityFeedResponse {
  activity: OperationalEventRecord[];
  count: number;
  timestamp: string;
}

export interface RegionalRiskSummaryResponse {
  region: string;
  total_monitored_cells: number;
  counts: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
  };
  updated_at: string;
}

export const fetchOperationsStatus = async (): Promise<LiveOperationsStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/operations/status`);
  if (!response.ok) throw new Error(`Operations status fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchOperationsActivity = async (limit: number = 20): Promise<LiveActivityFeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/operations/activity?limit=${limit}`);
  if (!response.ok) throw new Error(`Operations activity fetch failed: ${response.statusText}`);
  return response.json();
};

export const triggerWeatherRefresh = async (lat: number = 25.5788, lon: number = 91.8933) => {
  const response = await fetch(`${API_BASE_URL}/operations/refresh_weather?lat=${lat}&lon=${lon}`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error(`Weather refresh failed: ${response.statusText}`);
  return response.json();
};

export const fetchRegionalRiskSummary = async (): Promise<RegionalRiskSummaryResponse> => {
  const response = await fetch(`${API_BASE_URL}/operations/risk_summary`);
  if (!response.ok) throw new Error(`Risk summary fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchPlaces = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/infrastructure/places`);
  if (!response.ok) throw new Error(`Places fetch failed: ${response.statusText}`);
  return response.json();
};

export interface FabricEnrichResponse {
  latitude: number;
  longitude: number;
  timestamp: string;
  fabric_version: string;
  topography: {
    elevation: number;
    slope: number;
    aspect: number;
    tri: number;
    relief_5x5: number;
    plan_curvature: number;
    status: string;
    provider: string;
  };
  hydrology: {
    nearest_river: string;
    distance_km: number;
    distance_m: number;
    basin: string;
    strahler_order: number;
    mean_discharge_m3s: number;
    status: string;
    provider: string;
  };
  precipitation: {
    rainfall_1h_mm: number;
    rainfall_3h_mm: number;
    rainfall_6h_mm: number;
    rainfall_24h_mm: number;
    rainfall_72h_mm: number;
    rainfall_7d_mm: number;
    rainfall_30d_mm: number;
    rainfall_anomaly_pct: number;
    status: string;
    provider: string;
    observation_time?: string;
  };
  satellite_sar: {
    sar_vv: number;
    sar_vh: number;
    sar_ratio: number;
    acquisition_date: string | null;
    orbit_pass: string;
    status: string;
    provider: string;
  };
  satellite_optical: {
    ndvi: number;
    vegetation_health: string;
    cloud_cover_pct: number;
    acquisition_date: string | null;
    status: string;
    provider: string;
  };
  land_cover: {
    class_code: number;
    class_label: string;
    description?: string;
    status: string;
    provider: string;
  };
  infrastructure: {
    nearest_settlement: string;
    settlement_state: string;
    distance_to_settlement_km: number;
    nearest_highway: string;
    distance_to_highway_km: number;
    distance_to_infrastructure_km: number;
    status: string;
    provider: string;
  };
  historical_hazards: {
    nearest_landslide: {
      distance_km: number | null;
      date: string | null;
      location: string | null;
      events_within_25km: number;
    };
    nearest_flood: {
      distance_km: number | null;
      location: string | null;
      year: number | null;
      severity: string | null;
    };
    status: string;
    provider: string;
  };
  fabric_health: {
    available_providers: number;
    total_providers: number;
    completeness_pct: number;
    providers: Record<string, any>;
  };
}

export const fetchFabricEnrich = async (lat: number, lon: number): Promise<FabricEnrichResponse> => {
  const response = await fetch(`${API_BASE_URL}/fabric/enrich?lat=${lat}&lon=${lon}`);
  if (!response.ok) throw new Error(`Fabric enrich fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchFabricCatalog = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/fabric/catalog`);
  if (!response.ok) throw new Error(`Fabric catalog fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchFabricRivers = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/fabric/layers/rivers`);
  if (!response.ok) throw new Error(`Fabric rivers fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchFabricBasins = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/fabric/layers/basins`);
  if (!response.ok) throw new Error(`Fabric basins fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchFabricFloods = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/fabric/layers/floods`);
  if (!response.ok) throw new Error(`Fabric floods fetch failed: ${response.statusText}`);
  return response.json();
};

export const fetchFabricRoads = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/fabric/layers/roads`);
  if (!response.ok) throw new Error(`Fabric roads fetch failed: ${response.statusText}`);
  return response.json();
};

export interface FloodFeatureContribution {
  feature: string;
  value: string;
  contribution_pct: number;
  direction: string;
  source: string;
  description: string;
}

export interface FloodAssessmentResponse {
  latitude: number;
  longitude: number;
  timestamp: string;
  engine_version: string;
  geographic_context: {
    in_ner_domain: boolean;
    elevation_m: number;
    slope_deg: number;
    plan_curvature: number;
  };
  assessment: {
    flood_probability: number;
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    advisory: string;
  };
  flood_susceptibility: {
    score: number;
    nearest_river: string;
    distance_to_river_km: number;
    distance_to_river_m: number;
    basin: string;
    strahler_order: number;
    mean_annual_discharge_m3s: number;
  };
  meteorological_forcing: {
    score: number;
    rainfall_1h_mm?: number | null;
    rainfall_6h_mm?: number | null;
    rainfall_24h_mm?: number | null;
    rainfall_72h_mm?: number | null;
    rainfall_7d_mm?: number | null;
    rainfall_30d_mm?: number | null;
    rainfall_anomaly_pct?: number | null;
    status: string;
  };
  current_flood_evidence: {
    detected: boolean;
    evidence_level: string;
    detection_label: string;
    sar_observed: boolean;
    sar_vv?: number | null;
    sar_vh?: number | null;
    acquisition_date?: string | null;
  };
  historical_recurrence: {
    distance_km: number;
    location?: string | null;
    year?: number | null;
  };
  data_confidence: {
    confidence_level: 'HIGH_CONFIDENCE' | 'DEGRADED_CONFIDENCE' | 'INSUFFICIENT_DATA';
    completeness_pct: number;
    sources_available: number;
    sources_total: number;
    status_flags: Record<string, string>;
  };
  feature_contributions: FloodFeatureContribution[];
}

export const fetchFloodAssessment = async (lat: number, lon: number): Promise<FloodAssessmentResponse> => {
  const response = await fetch(`${API_BASE_URL}/floods/assess?lat=${lat}&lon=${lon}`);
  if (!response.ok) throw new Error(`Flood assessment failed: ${response.statusText}`);
  return response.json();
};




