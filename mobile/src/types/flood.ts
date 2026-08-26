/**
 * PRITHVI WATCH — Flood Assessment Types
 * Matches the exact schema returned by GET/POST /api/floods/assess
 * DO NOT add or compute any values client-side.
 */

export type EvidenceLevel =
  | 'CONFIRMED_FLOOD'
  | 'LIKELY_FLOOD'
  | 'POSSIBLE_FLOOD'
  | 'NO_OBSERVATION'
  | 'UNCONFIRMED'
  | 'NO_FLOOD_DETECTED';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type ConfidenceLevel =
  | 'HIGH_CONFIDENCE'
  | 'DEGRADED_CONFIDENCE'
  | 'INSUFFICIENT_DATA'
  | 'NO_OBSERVATION';

export type DataStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';

export interface FloodGeographicContext {
  in_ner_domain: boolean;
  elevation_m: number | null;
  slope_deg: number | null;
  plan_curvature: number | null;
}

export interface FloodSusceptibility {
  score: number;
  nearest_river: string | null;
  distance_to_river_km: number | null;
  distance_to_river_m: number | null;
  basin: string | null;
  strahler_order: number | null;
  mean_annual_discharge_m3s: number | null;
}

export interface MeteorologicalForcing {
  score: number;
  rainfall_1h_mm: number | null;
  rainfall_6h_mm: number | null;
  rainfall_24h_mm: number | null;
  rainfall_72h_mm: number | null;
  rainfall_7d_mm: number | null;
  rainfall_30d_mm: number | null;
  rainfall_anomaly_pct: number | null;
  status: DataStatus;
}

export interface CurrentFloodEvidence {
  detected: boolean;
  evidence_level: EvidenceLevel;
  detection_label: string;
  sar_observed: boolean;
  sar_vv: number | null;
  sar_vh: number | null;
  acquisition_date: string | null;
}

export interface HistoricalRecurrence {
  distance_km: number | null;
  location: string | null;
  year: number | null;
}

export interface FloodAssessmentResult {
  flood_probability: number;
  risk_level: RiskLevel;
  advisory: string;
}

export interface DataConfidence {
  confidence_level: ConfidenceLevel;
  completeness_pct: number;
  sources_available: number;
  sources_total: number;
  status_flags: {
    topography: DataStatus;
    hydrology: DataStatus;
    meteorology: DataStatus;
    satellite_sar: DataStatus;
  };
}

export interface FloodAssessmentResponse {
  latitude: number;
  longitude: number;
  timestamp: string;
  engine_version: string;
  geographic_context: FloodGeographicContext;
  flood_susceptibility: FloodSusceptibility;
  meteorological_forcing: MeteorologicalForcing;
  current_flood_evidence: CurrentFloodEvidence;
  historical_recurrence: HistoricalRecurrence;
  assessment: FloodAssessmentResult;
  data_confidence: DataConfidence;
}
