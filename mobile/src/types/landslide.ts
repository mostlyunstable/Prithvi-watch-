/**
 * PRITHVI WATCH — Landslide Prediction Types
 * Matches the exact schema returned by POST /api/predictions/run
 * DO NOT compute any values client-side.
 */

export type LandslideRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type DataQualityStatus = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
export type ImpactLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';
export type RiskTrend =
  | 'STABLE'
  | 'INCREASING'
  | 'DECREASING'
  | 'RAPIDLY_INCREASING'
  | 'RAPIDLY_DECREASING'
  | 'INSUFFICIENT_HISTORY';

export interface LandslideFeatures {
  elevation: number | null;
  slope: number | null;
  aspect: number | null;
  tri: number | null;
  relief_5x5: number | null;
  plan_curvature: number | null;
  dist_to_infrastructure_km: number | null;
  rainfall_7d_mm: number | null;
  sar_vv: number | null;
  sar_vh: number | null;
}

export interface ExplanationEntry {
  feature: string;
  impact: ImpactLevel | string;
  value: number;
  direction?: 'increases' | 'decreases';
}

export interface DataCompleteness {
  sources_available: number;
  sources_total: number;
  completeness_pct: number;
  completeness_label: string;
  breakdown: Record<string, DataQualityStatus>;
}

export interface DataQuality {
  dem: DataQualityStatus;
  weather: DataQualityStatus;
  satellite: DataQualityStatus;
  completeness: DataCompleteness;
}

export interface HistoricalEvent {
  distance_km: number;
  event_date: string;
  state_name: string;
  trigger: string;
}

export interface HistoricalContext {
  nearby_count: number;
  radius_km?: number;
  nearest_event: HistoricalEvent | null;
}

export interface RiskVelocity {
  current_risk: number;
  previous_risk: number | null;
  risk_delta: number | null;
  risk_delta_pct: number | null;
  trend: RiskTrend;
  confidence: string;
  observation_age_hours: number | null;
  fill: string;
  primary_driver: string | null;
  data_quality: string;
  feature_deltas: Record<string, number>;
}

export interface TimelineSnapshot {
  id: string;
  timestamp: string;
  grid_key: string;
  lat: number;
  lon: number;
  risk_probability: number;
  rainfall_7d_mm: number | null;
  sar_vv: number | null;
  sar_vh: number | null;
  elevation: number | null;
  slope: number | null;
  data_quality: string;
  model_version: string;
}

export interface LandslidePrediction {
  prediction_id: string;
  region_id: string;
  region_name: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  features: LandslideFeatures;
  landslide_probability: number;
  risk_level: LandslideRiskLevel;
  explanation: ExplanationEntry[];
  timeline: Record<string, LandslideRiskLevel>;
  risk_velocity: RiskVelocity;
  timeline_snapshots: TimelineSnapshot[];
  historical_context: HistoricalContext;
  data_quality: DataQuality;
  telemetry: {
    dem_error: string | null;
    weather_error: string | null;
    satellite_error: string | null;
    sar_acquisition_date: string | null;
    sar_imputed: boolean;
    rainfall_imputed: boolean;
  };
  model_version: string;
  mode: string;
}
