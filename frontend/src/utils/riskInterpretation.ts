import type { PredictionResponse, SHAPExplanation } from '../services/api';
import { safeToFixed, type HistoricalRadiusStats } from './geoAnalytics';

export interface HumanFeatureInterpretation {
  featureKey: string;
  name: string;
  rawValue: number | string;
  formattedValue: string;
  badgeText: string;
  plainMeaning: string;
  whyItMatters: string;
  shapImpact?: string;
  shapDirection?: 'increases' | 'decreases';
  shapValue?: number;
}

export interface RiskSummaryInterpretation {
  headline: string;
  overviewText: string;
  riskDefinition: string;
  primaryDrivers: Array<{
    number: string;
    title: string;
    description: string;
    directionText: string;
    direction: 'increases' | 'decreases' | 'neutral';
  }>;
  features: HumanFeatureInterpretation[];
  takeawayText: string;
  dataQualitySummary: {
    scoreText: string;
    description: string;
  };
}

export function getAspectCompassDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'North';
  if (normalized >= 22.5 && normalized < 67.5) return 'Northeast';
  if (normalized >= 67.5 && normalized < 112.5) return 'East';
  if (normalized >= 112.5 && normalized < 157.5) return 'Southeast';
  if (normalized >= 157.5 && normalized < 202.5) return 'South';
  if (normalized >= 202.5 && normalized < 247.5) return 'Southwest';
  if (normalized >= 247.5 && normalized < 292.5) return 'West';
  return 'Northwest';
}

export function getSlopeCategory(degrees: number): { label: string; description: string } {
  if (degrees < 10) return { label: 'Gentle', description: 'Shows how steep the ground is at this location.' };
  if (degrees < 20) return { label: 'Moderate', description: 'Shows how steep the ground is at this location.' };
  if (degrees < 30) return { label: 'Steep', description: 'Steeper slopes can become less stable when other risk conditions are present.' };
  return { label: 'Very Steep', description: 'Steeper slopes can become less stable when other risk conditions are present.' };
}

export function getRiskLevelDefinition(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'The system estimates very high landslide risk at this location based on the environmental conditions currently available.';
    case 'HIGH':
      return 'The system estimates elevated landslide risk at this location based on the environmental conditions currently available.';
    case 'MODERATE':
      return 'The system estimates moderate landslide risk at this location based on the environmental conditions currently available.';
    default:
      return 'The system estimates low landslide risk at this location based on the environmental conditions currently available.';
  }
}

export function generateRiskInterpretation(
  prediction: PredictionResponse,
  historicalStats?: HistoricalRadiusStats
): RiskSummaryInterpretation {
  const probPct = safeToFixed((prediction.landslide_probability ?? 0) * 100, 1, '0.0');
  const risk = prediction.risk_level;
  const f = prediction.features || {};

  const slopeCat = getSlopeCategory(f.slope ?? 0);
  const aspectDir = getAspectCompassDirection(f.aspect ?? 0);

  // Map SHAP explanations to readable features
  const shapMap = new Map<string, SHAPExplanation>();
  (prediction.explanation || []).forEach((exp) => {
    shapMap.set(exp.feature, exp);
  });

  const featureInterpretations: HumanFeatureInterpretation[] = [
    {
      featureKey: 'elevation',
      name: 'Height Above Sea Level',
      rawValue: f.elevation ?? 0,
      formattedValue: `${safeToFixed(f.elevation, 0, '0')} m`,
      badgeText: 'Elevation',
      plainMeaning: 'Elevation of the selected location.',
      whyItMatters: 'Provides terrain context alongside slope and weather.',
      shapImpact: shapMap.get('elevation')?.impact,
      shapDirection: (shapMap.get('elevation')?.value ?? 0) >= 0 ? 'increases' : 'decreases',
      shapValue: shapMap.get('elevation')?.value
    },
    {
      featureKey: 'slope',
      name: 'Ground Steepness',
      rawValue: f.slope ?? 0,
      formattedValue: `${safeToFixed(f.slope, 1, '0.0')}°`,
      badgeText: slopeCat.label,
      plainMeaning: slopeCat.description,
      whyItMatters: 'Steeper slopes can become less stable when other risk conditions are present.',
      shapImpact: shapMap.get('slope')?.impact,
      shapDirection: (shapMap.get('slope')?.value ?? 0) >= 0 ? 'increases' : 'decreases',
      shapValue: shapMap.get('slope')?.value
    },
    {
      featureKey: 'aspect',
      name: 'Slope Direction',
      rawValue: f.aspect ?? 0,
      formattedValue: `${aspectDir} (${safeToFixed(f.aspect, 0, '0')}°)`,
      badgeText: aspectDir,
      plainMeaning: 'Direction the slope faces.',
      whyItMatters: 'Orientation of the hillside.',
      shapImpact: shapMap.get('aspect')?.impact,
      shapDirection: (shapMap.get('aspect')?.value ?? 0) >= 0 ? 'increases' : 'decreases',
      shapValue: shapMap.get('aspect')?.value
    },
    {
      featureKey: 'rainfall_7d_mm',
      name: 'Rainfall in the Last 7 Days',
      rawValue: f.rainfall_7d_mm ?? 0,
      formattedValue: `${safeToFixed(f.rainfall_7d_mm, 1, '0.0')} mm`,
      badgeText: '7-Day Total',
      plainMeaning: 'Total rainfall recorded over the previous 7 days.',
      whyItMatters: 'Accumulated rainfall can increase soil moisture and contribute to slope instability.',
      shapImpact: shapMap.get('rainfall_7d_mm')?.impact,
      shapDirection: (shapMap.get('rainfall_7d_mm')?.value ?? 0) >= 0 ? 'increases' : 'decreases',
      shapValue: shapMap.get('rainfall_7d_mm')?.value
    },
    {
      featureKey: 'sar_vv',
      name: 'Satellite Observation',
      rawValue: f.sar_vv ?? 0,
      formattedValue: 'Available',
      badgeText: 'Observation Available',
      plainMeaning: 'Recent radar observation is available for this location.',
      whyItMatters: 'Radar observations provide surface information even through cloud cover.',
      shapImpact: shapMap.get('sar_vv')?.impact,
      shapDirection: (shapMap.get('sar_vv')?.value ?? 0) >= 0 ? 'increases' : 'decreases',
      shapValue: shapMap.get('sar_vv')?.value
    }
  ];

  // Derive human-readable primary drivers sorted by absolute SHAP impact
  const sortedByImpact = [...featureInterpretations].sort(
    (a, b) => Math.abs(b.shapValue ?? 0) - Math.abs(a.shapValue ?? 0)
  );

  const primaryDrivers: Array<{
    number: string;
    title: string;
    description: string;
    directionText: string;
    direction: 'increases' | 'decreases' | 'neutral';
  }> = [];

  // Top 2 SHAP drivers
  sortedByImpact.slice(0, 2).forEach((feat, idx) => {
    const shapVal = feat.shapValue ?? 0;
    const absShap = Math.abs(shapVal);
    let dirText = 'Within normal range';
    let dir: 'increases' | 'decreases' | 'neutral' = 'neutral';

    if (absShap >= 0.1) {
      if (shapVal > 0) {
        dirText = '↑ Increasing risk';
        dir = 'increases';
      } else {
        dirText = '↓ Lowering risk';
        dir = 'decreases';
      }
    }

    primaryDrivers.push({
      number: `0${idx + 1}`,
      title: feat.name === 'Rainfall in the Last 7 Days' ? 'Recent Rainfall' : feat.name,
      description: feat.formattedValue,
      directionText: dirText,
      direction: dir
    });
  });

  // 3rd driver: Historical Evidence
  const pastEventsCount = historicalStats?.within50km ?? prediction.historical_context?.nearby_count ?? 0;
  primaryDrivers.push({
    number: '03',
    title: 'Past Landslides Nearby',
    description: `${pastEventsCount} recorded within 50 km`,
    directionText: pastEventsCount > 0 ? 'Historical evidence' : 'No recent nearby records',
    direction: 'neutral'
  });

  // Deterministic takeaway text
  let takeawayText = '';
  if (risk === 'CRITICAL' || risk === 'HIGH') {
    takeawayText = `The selected location currently shows elevated model-estimated landslide risk (${probPct}%). Recent rainfall and terrain conditions are contributing to the assessment. Historical landslides have also been recorded in this area.`;
  } else if (risk === 'MODERATE') {
    takeawayText = `The selected location currently shows moderate model-estimated landslide risk (${probPct}%). Some environmental conditions associated with slope instability are present.`;
  } else {
    takeawayText = `The selected location currently shows low model-estimated landslide risk (${probPct}%). Current rainfall and terrain conditions are within baseline levels.`;
  }

  const availableCount = [
    prediction.data_quality?.dem === 'AVAILABLE',
    prediction.data_quality?.weather === 'AVAILABLE',
    prediction.data_quality?.satellite === 'AVAILABLE',
    true
  ].filter(Boolean).length;

  return {
    headline: `${risk} RISK`,
    overviewText: getRiskLevelDefinition(risk),
    riskDefinition: getRiskLevelDefinition(risk),
    primaryDrivers,
    features: featureInterpretations,
    takeawayText,
    dataQualitySummary: {
      scoreText: `${availableCount} / 4 Data Sources Available`,
      description:
        availableCount === 4
          ? 'Terrain, weather, satellite, and historical records are all available.'
          : 'Assessment continues using the available environmental information.'
    }
  };
}
