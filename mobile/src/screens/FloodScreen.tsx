import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { theme } from '../theme/theme';
import {
  Droplets,
  Clock,
  AlertCircle,
  Shield,
  Radio,
  Wind,
  Waves,
  LocateFixed,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { api } from '../services/api';
import {
  FloodAssessmentResponse,
  RiskLevel,
  ConfidenceLevel,
  EvidenceLevel,
} from '../types/flood';
import { NER_REGIONS } from '../constants/regions';

type AssessState = 'idle' | 'loading' | 'done' | 'error';

function riskColor(level: RiskLevel | undefined): string {
  switch (level) {
    case 'CRITICAL': return theme.colors.danger;
    case 'HIGH': return '#f97316';
    case 'MODERATE': return theme.colors.warning;
    case 'LOW': return theme.colors.success;
    default: return theme.colors.textMuted;
  }
}

function confidenceColor(level: ConfidenceLevel | undefined): string {
  switch (level) {
    case 'HIGH_CONFIDENCE': return theme.colors.success;
    case 'DEGRADED_CONFIDENCE': return theme.colors.warning;
    case 'INSUFFICIENT_DATA': return theme.colors.danger;
    default: return theme.colors.textMuted;
  }
}

function evidenceBadgeVariant(level: EvidenceLevel | undefined): 'success' | 'warning' | 'error' | 'neutral' {
  switch (level) {
    case 'CONFIRMED_FLOOD':
    case 'LIKELY_FLOOD': return 'error';
    case 'POSSIBLE_FLOOD':
    case 'UNCONFIRMED': return 'warning';
    case 'NO_FLOOD_DETECTED': return 'success';
    default: return 'neutral';
  }
}

/** Display a numeric value or a fallback string — never convert null to 0 */
function fmtNum(val: number | null | undefined, unit: string = '', decimals: number = 1): string {
  if (val === null || val === undefined) return 'UNOBSERVED';
  return `${val.toFixed(decimals)}${unit}`;
}

function fmtStr(val: string | null | undefined): string {
  if (!val) return 'UNOBSERVED';
  return val;
}

export const FloodScreen: React.FC = () => {
  const [assessState, setAssessState] = useState<AssessState>('idle');
  const [flood, setFlood] = useState<FloodAssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual coordinate input
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const assessCoordinate = useCallback(async (lat: number, lon: number) => {
    setAssessState('loading');
    setError(null);
    setFlood(null);
    try {
      const data = await api.assessFlood(lat, lon);
      setFlood(data);
      setAssessState('done');
    } catch (e: any) {
      setError(e.message || 'Flood assessment failed. Check network and backend status.');
      setAssessState('error');
    }
  }, []);

  const handleManualAssess = () => {
    setInputError(null);
    const lat = parseFloat(latInput.trim());
    const lon = parseFloat(lonInput.trim());
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setInputError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setInputError('Longitude must be a number between -180 and 180.');
      return;
    }
    assessCoordinate(lat, lon);
  };

  const handleNERRegion = (lat: number, lon: number) => {
    setLatInput(lat.toFixed(4));
    setLonInput(lon.toFixed(4));
    assessCoordinate(lat, lon);
  };

  const riskLevel = flood?.assessment?.risk_level;
  const confidenceLevel = flood?.data_confidence?.confidence_level;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.header}>
          <Typography variant="h2">Flood Assessment</Typography>
          <Typography variant="caption" color={theme.colors.textMuted}>
            Sentinel-1 SAR · HydroSHEDS · Open-Meteo ERA5
          </Typography>
        </View>

        {/* ── NER Quick Select ── */}
        <Card style={styles.card}>
          <Typography variant="label" color={theme.colors.textMuted}>QUICK: SELECT NER STATE</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {NER_REGIONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.regionChip,
                  flood?.latitude === r.latitude && styles.regionChipActive,
                ]}
                onPress={() => handleNERRegion(r.latitude, r.longitude)}
              >
                <Typography
                  variant="caption"
                  color={flood?.latitude === r.latitude ? '#fff' : theme.colors.textSecondary}
                  weight={flood?.latitude === r.latitude ? 'bold' : 'regular'}
                >
                  {r.name}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* ── Manual Coordinate Input ── */}
        <Card style={styles.card}>
          <Typography variant="label" color={theme.colors.textMuted}>CUSTOM COORDINATES</Typography>
          <View style={styles.coordRow}>
            <View style={styles.coordInput}>
              <Typography variant="caption" color={theme.colors.textMuted}>Latitude</Typography>
              <TextInput
                style={styles.input}
                placeholder="e.g. 26.18"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
                value={latInput}
                onChangeText={setLatInput}
              />
            </View>
            <View style={styles.coordInput}>
              <Typography variant="caption" color={theme.colors.textMuted}>Longitude</Typography>
              <TextInput
                style={styles.input}
                placeholder="e.g. 91.75"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
                value={lonInput}
                onChangeText={setLonInput}
              />
            </View>
          </View>
          {inputError && (
            <Typography variant="caption" color={theme.colors.danger}>{inputError}</Typography>
          )}
          <TouchableOpacity
            style={[styles.assessBtn, assessState === 'loading' && styles.assessBtnDisabled]}
            onPress={handleManualAssess}
            disabled={assessState === 'loading'}
          >
            {assessState === 'loading' ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Typography variant="body" color="#fff" style={{ marginLeft: 8 }}>Assessing...</Typography>
              </>
            ) : (
              <>
                <Radio size={16} color="#fff" />
                <Typography variant="body" color="#fff" weight="bold" style={{ marginLeft: 8 }}>
                  Assess Flood Risk
                </Typography>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* ── Error State ── */}
        {assessState === 'error' && error && (
          <Card style={[styles.card, styles.errorCard]}>
            <View style={styles.row}>
              <AlertCircle size={18} color={theme.colors.danger} />
              <Typography variant="body" color={theme.colors.danger} style={styles.ml}>
                Assessment Failed
              </Typography>
            </View>
            <Typography variant="caption" color={theme.colors.textSecondary}>{error}</Typography>
          </Card>
        )}

        {/* ── Results ── */}
        {flood && assessState === 'done' && (
          <>
            {/* Primary Risk Card */}
            <Card style={[styles.statusCard, { borderColor: riskColor(riskLevel), borderWidth: 2 }]}>
              <View style={styles.statusHeader}>
                <Droplets size={28} color={riskColor(riskLevel)} />
                <View style={styles.ml}>
                  <Typography variant="h3" color={riskColor(riskLevel)}>
                    {riskLevel ?? 'UNOBSERVED'} FLOOD RISK
                  </Typography>
                  <Typography variant="caption" color={theme.colors.textMuted}>
                    Probability: {flood.assessment?.flood_probability != null
                      ? `${(flood.assessment.flood_probability * 100).toFixed(1)}%`
                      : 'UNOBSERVED'}
                  </Typography>
                </View>
              </View>
              {flood.assessment?.advisory && (
                <View style={[styles.advisoryBox, { borderLeftColor: riskColor(riskLevel) }]}>
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    {flood.assessment.advisory}
                  </Typography>
                </View>
              )}
              <Typography variant="caption" color={theme.colors.textMuted}>
                Assessed: {new Date(flood.timestamp).toLocaleString()}
              </Typography>
            </Card>

            {/* DATA CONFIDENCE CARD */}
            <Card style={[styles.card, styles.confidenceCard]}>
              <View style={styles.confidenceHeader}>
                <Shield size={18} color={theme.colors.primary} />
                <Typography variant="h3" style={styles.ml}>DATA CONFIDENCE</Typography>
              </View>
              <View style={styles.confidenceBody}>
                <Typography
                  variant="h1"
                  color={confidenceColor(confidenceLevel)}
                >
                  {flood.data_confidence?.completeness_pct != null
                    ? `${flood.data_confidence.completeness_pct.toFixed(0)}%`
                    : '—'}
                </Typography>
                <View style={styles.confidenceRight}>
                  <Badge
                    label={confidenceLevel?.replace(/_/g, ' ') ?? 'UNKNOWN'}
                    variant={
                      confidenceLevel === 'HIGH_CONFIDENCE' ? 'success' :
                      confidenceLevel === 'DEGRADED_CONFIDENCE' ? 'warning' : 'error'
                    }
                  />
                  <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
                    {flood.data_confidence?.sources_available ?? '—'} of {flood.data_confidence?.sources_total ?? '—'} sources available
                  </Typography>
                </View>
              </View>
              <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
                Confidence reflects availability and completeness of supporting observations — not flood probability.
              </Typography>

              {/* Source Flags */}
              {flood.data_confidence?.status_flags && (
                <View style={styles.flagsGrid}>
                  {Object.entries(flood.data_confidence.status_flags).map(([key, val]) => (
                    <View key={key} style={styles.flagItem}>
                      <Typography variant="caption" color={theme.colors.textMuted}>
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={val === 'AVAILABLE' ? theme.colors.success : theme.colors.warning}
                      >
                        {val}
                      </Typography>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* SAR Evidence */}
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <Radio size={16} color={theme.colors.textMuted} />
                <Typography variant="label" style={styles.ml}>SATELLITE OBSERVATION (SAR)</Typography>
              </View>
              <View style={styles.divider} />
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>FLOOD DETECTED</Typography>
                <Badge
                  label={flood.current_flood_evidence?.detected ? 'YES' : 'NO'}
                  variant={flood.current_flood_evidence?.detected ? 'error' : 'success'}
                />
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>EVIDENCE LEVEL</Typography>
                <Badge
                  label={fmtStr(flood.current_flood_evidence?.evidence_level).replace(/_/g, ' ')}
                  variant={evidenceBadgeVariant(flood.current_flood_evidence?.evidence_level)}
                />
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>DETECTION LABEL</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary} style={styles.valueRight}>
                  {fmtStr(flood.current_flood_evidence?.detection_label)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>SAR OBSERVED</Typography>
                <Typography variant="body">
                  {flood.current_flood_evidence?.sar_observed ? 'YES' : 'NO'}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>SAR VV (dB)</Typography>
                <Typography variant="body">
                  {fmtNum(flood.current_flood_evidence?.sar_vv, ' dB', 2)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>ACQUISITION DATE</Typography>
                <Typography variant="body">
                  {fmtStr(flood.current_flood_evidence?.acquisition_date)}
                </Typography>
              </View>
            </Card>

            {/* Flood Susceptibility */}
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <Waves size={16} color={theme.colors.textMuted} />
                <Typography variant="label" style={styles.ml}>FLOOD SUSCEPTIBILITY</Typography>
              </View>
              <View style={styles.divider} />
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>SCORE</Typography>
                <Typography variant="body">{fmtNum(flood.flood_susceptibility?.score, '', 3)}</Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>NEAREST RIVER</Typography>
                <Typography variant="caption" style={styles.valueRight}>
                  {fmtStr(flood.flood_susceptibility?.nearest_river)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>DISTANCE TO RIVER</Typography>
                <Typography variant="body">
                  {fmtNum(flood.flood_susceptibility?.distance_to_river_km, ' km', 2)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>BASIN</Typography>
                <Typography variant="caption" style={styles.valueRight}>
                  {fmtStr(flood.flood_susceptibility?.basin)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>ELEVATION</Typography>
                <Typography variant="body">
                  {fmtNum(flood.geographic_context?.elevation_m, ' m', 0)}
                </Typography>
              </View>
              <View style={styles.dataRow}>
                <Typography variant="label" color={theme.colors.textMuted}>SLOPE</Typography>
                <Typography variant="body">
                  {fmtNum(flood.geographic_context?.slope_deg, '°', 1)}
                </Typography>
              </View>
            </Card>

            {/* Meteorological Forcing */}
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <Wind size={16} color={theme.colors.textMuted} />
                <Typography variant="label" style={styles.ml}>METEOROLOGICAL FORCING</Typography>
              </View>
              <Badge
                label={flood.meteorological_forcing?.status ?? 'UNKNOWN'}
                variant={flood.meteorological_forcing?.status === 'AVAILABLE' ? 'success' : 'warning'}
              />
              <View style={styles.divider} />
              {[
                { label: 'RAINFALL 1H', val: fmtNum(flood.meteorological_forcing?.rainfall_1h_mm, ' mm') },
                { label: 'RAINFALL 6H', val: fmtNum(flood.meteorological_forcing?.rainfall_6h_mm, ' mm') },
                { label: 'RAINFALL 24H', val: fmtNum(flood.meteorological_forcing?.rainfall_24h_mm, ' mm') },
                { label: 'RAINFALL 72H', val: fmtNum(flood.meteorological_forcing?.rainfall_72h_mm, ' mm') },
                { label: 'RAINFALL 7D', val: fmtNum(flood.meteorological_forcing?.rainfall_7d_mm, ' mm') },
                { label: 'RAINFALL 30D', val: fmtNum(flood.meteorological_forcing?.rainfall_30d_mm, ' mm') },
                { label: 'ANOMALY', val: fmtNum(flood.meteorological_forcing?.rainfall_anomaly_pct, '%') },
              ].map(({ label, val }) => (
                <View key={label} style={styles.dataRow}>
                  <Typography variant="label" color={theme.colors.textMuted}>{label}</Typography>
                  <Typography variant="body">{val}</Typography>
                </View>
              ))}
            </Card>

            {/* Historical Recurrence */}
            {flood.historical_recurrence && (
              <Card style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Clock size={16} color={theme.colors.textMuted} />
                  <Typography variant="label" style={styles.ml}>HISTORICAL RECURRENCE</Typography>
                </View>
                <View style={styles.divider} />
                <View style={styles.dataRow}>
                  <Typography variant="label" color={theme.colors.textMuted}>NEAREST RECORD</Typography>
                  <Typography variant="body">{fmtStr(flood.historical_recurrence?.location)}</Typography>
                </View>
                <View style={styles.dataRow}>
                  <Typography variant="label" color={theme.colors.textMuted}>YEAR</Typography>
                  <Typography variant="body">
                    {flood.historical_recurrence?.year ?? 'UNOBSERVED'}
                  </Typography>
                </View>
                <View style={styles.dataRow}>
                  <Typography variant="label" color={theme.colors.textMuted}>DISTANCE</Typography>
                  <Typography variant="body">
                    {fmtNum(flood.historical_recurrence?.distance_km, ' km', 1)}
                  </Typography>
                </View>
              </Card>
            )}

            {/* Engine Info */}
            <View style={styles.engineInfo}>
              <Info size={12} color={theme.colors.textMuted} />
              <Typography variant="caption" color={theme.colors.textMuted} style={styles.ml}>
                Engine: {flood.engine_version}
              </Typography>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.xs },
  card: { gap: theme.spacing.sm },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  regionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  coordRow: { flexDirection: 'row', gap: theme.spacing.md },
  coordInput: { flex: 1, gap: 4 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
  },
  assessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  assessBtnDisabled: { opacity: 0.6 },
  errorCard: {
    borderColor: theme.colors.danger,
    borderWidth: 1,
    backgroundColor: '#1a0000',
    gap: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: theme.spacing.sm },
  mt2: { marginTop: 4 },
  statusCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center' },
  advisoryBox: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    paddingVertical: 4,
  },
  confidenceCard: { gap: theme.spacing.md },
  confidenceHeader: { flexDirection: 'row', alignItems: 'center' },
  confidenceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  confidenceRight: { flex: 1, gap: 4, alignItems: 'flex-end' },
  flagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  flagItem: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  valueRight: { flex: 1, textAlign: 'right' },
  engineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
});
