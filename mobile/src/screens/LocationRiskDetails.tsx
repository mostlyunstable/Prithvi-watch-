import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Typography } from '../components/Typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { theme } from '../theme/theme';
import { FloodAssessmentResponse } from '../types/flood';
import { LandslidePrediction } from '../types/landslide';

interface LocationRiskDetailsProps {
  assessment: {
    location: { latitude: number, longitude: number };
    flood: FloodAssessmentResponse;
    landslide: LandslidePrediction;
    assessedAt: string;
  };
  onBack: () => void;
}

const ProgressBar = ({ progress, color }: { progress: number, color: string }) => {
  return (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: color }]} />
    </View>
  );
};

export const LocationRiskDetails: React.FC<LocationRiskDetailsProps> = ({ assessment, onBack }) => {
  const { location, flood, landslide, assessedAt } = assessment;

  const lLevel = landslide?.risk_level || 'UNKNOWN';
  const fLevel = flood?.assessment?.risk_level || 'UNKNOWN';

  const levels = [lLevel, fLevel];
  let overall = 'LOW';
  if (levels.includes('CRITICAL')) overall = 'CRITICAL';
  else if (levels.includes('HIGH')) overall = 'HIGH';
  else if (levels.includes('MODERATE')) overall = 'MODERATE';

  const lConf = landslide?.data_quality?.completeness?.completeness_pct || 0;
  const fConf = flood?.data_confidence?.completeness_pct || 0;
  
  const confidence = ((lConf + fConf) / 2);
  const confidenceTxt = isNaN(confidence) || confidence === 0 ? "DATA LIMITED" : `${confidence.toFixed(0)}%`;

  return (
    <View style={styles.container}>
      <ScreenHeader title="LOCATION RISK ASSESSMENT" onBack={onBack} />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.headerBox}>
          <Typography variant="h2">{location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E</Typography>
          <Typography variant="caption" color={theme.colors.textMuted}>Assessed at: {new Date(assessedAt).toLocaleString()}</Typography>
        </View>

        {/* OVERALL STATUS */}
        <View style={styles.card}>
          <Typography variant="h3" style={styles.cardTitle}>OVERALL HAZARD STATUS</Typography>
          
          <View style={styles.row}>
            <Typography variant="body">Flood</Typography>
            <Typography variant="body" weight="bold">{fLevel}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body">Landslide</Typography>
            <Typography variant="body" weight="bold">{lLevel}</Typography>
          </View>
          
          <View style={[styles.row, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <Typography variant="h3">Overall</Typography>
            <Typography variant="h3" color={overall === 'CRITICAL' || overall === 'HIGH' ? theme.colors.danger : theme.colors.primary}>{overall}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="caption" color={theme.colors.textMuted}>Confidence</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>{confidenceTxt}</Typography>
          </View>
        </View>

        {/* FLOOD RISK CARD */}
        <View style={styles.card}>
          <Typography variant="h3" style={styles.cardTitle}>FLOOD RISK</Typography>
          <View style={styles.row}>
            <Typography variant="h2" color={fLevel === 'HIGH' || fLevel === 'CRITICAL' ? theme.colors.danger : theme.colors.primary}>{fLevel}</Typography>
          </View>
          
          {flood?.assessment?.flood_probability != null && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Typography variant="caption" color={theme.colors.textMuted}>Risk Score: {(flood.assessment.flood_probability * 100).toFixed(0)} / 100</Typography>
            </View>
          )}

          {flood?.data_confidence?.completeness_pct != null && (
            <View style={{ marginTop: 4 }}>
              <Typography variant="caption" color={theme.colors.textMuted}>Confidence: {(flood.data_confidence.completeness_pct).toFixed(0)}%</Typography>
              <ProgressBar progress={flood.data_confidence.completeness_pct} color={theme.colors.primary} />
            </View>
          )}

          <Typography variant="label" style={{ marginTop: 16, marginBottom: 8 }} color={theme.colors.textSecondary}>Key Factors</Typography>
          
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Rainfall (7d)</Typography>
            <Typography variant="body">{flood?.meteorological_forcing?.rainfall_7d_mm != null ? `${flood.meteorological_forcing.rainfall_7d_mm.toFixed(1)} mm` : 'Not available'}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Nearest River</Typography>
            <Typography variant="body">{flood?.flood_susceptibility?.distance_to_river_km != null ? `${flood.flood_susceptibility.distance_to_river_km.toFixed(1)} km` : 'Not available'}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Elevation</Typography>
            <Typography variant="body">{flood?.geographic_context?.elevation_m != null ? `${flood.geographic_context.elevation_m.toFixed(1)} m` : 'DATA UNAVAILABLE'}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>SAR Water</Typography>
            <Typography variant="body">
              {flood?.current_flood_evidence?.sar_observed 
                ? (flood.current_flood_evidence.detected ? 'OBSERVED' : 'NOT OBSERVED') 
                : 'NO OBSERVATION'}
            </Typography>
          </View>
        </View>

        {/* LANDSLIDE RISK CARD */}
        <View style={styles.card}>
          <Typography variant="h3" style={styles.cardTitle}>LANDSLIDE RISK</Typography>
          <View style={styles.row}>
            <Typography variant="h2" color={lLevel === 'HIGH' || lLevel === 'CRITICAL' ? theme.colors.danger : theme.colors.primary}>{lLevel}</Typography>
          </View>
          
          {landslide?.landslide_probability != null && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Typography variant="caption" color={theme.colors.textMuted}>Risk Score: {(landslide.landslide_probability * 100).toFixed(0)} / 100</Typography>
            </View>
          )}
          
          {landslide?.data_quality?.completeness?.completeness_pct != null && (
            <View style={{ marginTop: 4 }}>
              <Typography variant="caption" color={theme.colors.textMuted}>Confidence: {(landslide.data_quality.completeness.completeness_pct).toFixed(0)}%</Typography>
              <ProgressBar progress={landslide.data_quality.completeness.completeness_pct} color={theme.colors.primary} />
            </View>
          )}

          <Typography variant="label" style={{ marginTop: 16, marginBottom: 8 }} color={theme.colors.textSecondary}>Key Factors</Typography>
          
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Slope</Typography>
            <Typography variant="body">{landslide?.features?.slope != null ? `${landslide.features.slope.toFixed(1)}°` : 'Not available'}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Elevation</Typography>
            <Typography variant="body">{landslide?.features?.elevation != null ? `${landslide.features.elevation.toFixed(1)} m` : 'DATA UNAVAILABLE'}</Typography>
          </View>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textMuted}>Rainfall (7d)</Typography>
            <Typography variant="body">{landslide?.features?.rainfall_7d_mm != null ? `${landslide.features.rainfall_7d_mm.toFixed(1)} mm` : 'Not available'}</Typography>
          </View>
        </View>

        {/* WHY THIS SCORE */}
        <View style={styles.card}>
          <Typography variant="h3" style={styles.cardTitle}>WHY THIS SCORE?</Typography>
          
          {flood?.assessment?.advisory && (
            <View style={{ marginBottom: 12 }}>
              <Typography variant="label" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>Flood Advisory:</Typography>
              <Typography variant="body">{flood.assessment.advisory}</Typography>
            </View>
          )}

          {landslide?.explanation && landslide.explanation.length > 0 && (
            <View>
              <Typography variant="label" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>Landslide Drivers:</Typography>
              {landslide.explanation.map((e, idx) => (
                <Typography key={idx} variant="body">• {e.feature} {e.direction || 'impacts'} ({e.impact})</Typography>
              ))}
            </View>
          )}
          
          {(!landslide?.explanation?.length && !flood?.assessment?.advisory) && (
            <Typography variant="body" color={theme.colors.textMuted}>No detailed explanation available.</Typography>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40 },
  headerBox: { marginBottom: theme.spacing.sm },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: { marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressBarBg: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
});
