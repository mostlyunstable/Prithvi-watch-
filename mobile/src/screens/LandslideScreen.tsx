import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { RiskCard } from '../components/RiskCard';
import { ConfidenceCard } from '../components/ConfidenceCard';
import { theme } from '../theme/theme';
import {
  AlertTriangle,
  LocateFixed,
  RefreshCw,
  Compass,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import { api } from '../services/api';
import { LandslidePrediction } from '../types/landslide';
import { t } from '../i18n/strings';

interface LandslideScreenProps {
  lang: 'en' | 'hi';
  onNavigateToMap: () => void;
}

type LocationState = 'idle' | 'requesting' | 'acquired' | 'denied' | 'unavailable';
type PredictionState = 'idle' | 'loading' | 'done' | 'error';

function getImpactColor(impact: string): string {
  switch (impact.toUpperCase()) {
    case 'VERY HIGH': return theme.colors.danger;
    case 'HIGH': return '#f97316';
    case 'MODERATE': return theme.colors.warning;
    case 'LOW': return theme.colors.success;
    default: return theme.colors.textMuted;
  }
}

export const LandslideScreen: React.FC<LandslideScreenProps> = ({ lang, onNavigateToMap }) => {
  const isEn = lang === 'en';
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [prediction, setPrediction] = useState<LandslidePrediction | null>(null);
  const [predictionState, setPredictionState] = useState<PredictionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPrediction = useCallback(async (lat: number, lon: number) => {
    setPredictionState('loading');
    setErrorMsg(null);
    try {
      const data = await api.runPrediction(lat, lon);
      setPrediction(data);
      setPredictionState('done');
    } catch (e: any) {
      setErrorMsg(e.message || 'Landslide prediction failed.');
      setPredictionState('error');
    }
  }, []);

  const acquireLocation = async () => {
    setLocationState('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationState('denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = {
        lat: Math.round(loc.coords.latitude * 10000) / 10000,
        lon: Math.round(loc.coords.longitude * 10000) / 10000,
      };
      setCoords(c);
      setLocationState('acquired');
      fetchPrediction(c.lat, c.lon);
    } catch {
      setLocationState('unavailable');
    }
  };

  useEffect(() => {
    acquireLocation();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Typography variant="h2">{t(lang, 'landslideRisk')}</Typography>
        <Typography variant="caption" color={theme.colors.textMuted}>
          XGBoost Classifier · Morphology & Kinematics
        </Typography>
      </View>

      {/* ── Location Card ── */}
      <Card style={styles.rowCard}>
        <LocateFixed
          size={18}
          color={locationState === 'acquired' ? theme.colors.primary : theme.colors.textMuted}
        />
        <View style={[styles.ml, styles.flex1]}>
          <Typography variant="label">{t(lang, 'currentLocation')}</Typography>
          {locationState === 'requesting' && (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'flex-start' }} />
          )}
          {locationState === 'acquired' && coords && (
            <Typography variant="body">{coords.lat.toFixed(4)}°N, {coords.lon.toFixed(4)}°E</Typography>
          )}
          {locationState === 'denied' && (
            <Typography variant="caption" color={theme.colors.danger}>{t(lang, 'permissionDenied')}</Typography>
          )}
          {locationState === 'unavailable' && (
            <Typography variant="caption" color={theme.colors.warning}>{t(lang, 'gpsUnavailable')}</Typography>
          )}
        </View>
        <TouchableOpacity onPress={acquireLocation} style={styles.iconBtn}>
          <RefreshCw size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {predictionState === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
            {t(lang, 'loading')}
          </Typography>
        </View>
      )}

      {predictionState === 'error' && errorMsg && (
        <Card style={styles.errorCard}>
          <AlertTriangle size={18} color={theme.colors.danger} />
          <Typography variant="caption" color={theme.colors.danger} style={styles.ml}>
            {errorMsg}
          </Typography>
        </Card>
      )}

      {prediction && predictionState === 'done' && (
        <>
          {/* Risk Card */}
          <RiskCard
            title={t(lang, 'landslideRisk')}
            riskLevel={prediction.risk_level}
            probability={prediction.landslide_probability}
            advisory={prediction.explanation && prediction.explanation[0] ? `Primary Driver: Curvature/Slope factor impact` : null}
            timestamp={prediction.timestamp}
            lang={lang}
          />

          {/* Data Confidence Card */}
          <ConfidenceCard
            completenessPct={prediction.data_quality?.completeness?.completeness_pct}
            confidenceLevel={prediction.risk_velocity?.confidence === 'HIGH' ? 'HIGH_CONFIDENCE' : 'DEGRADED_CONFIDENCE'}
            sourcesAvailable={prediction.data_quality?.completeness?.sources_available}
            sourcesTotal={prediction.data_quality?.completeness?.sources_total}
            statusFlags={prediction.data_quality?.completeness?.breakdown}
            lang={lang}
          />

          {/* Top Risk Drivers */}
          {prediction.explanation && prediction.explanation.length > 0 && (
            <Card>
              <Typography variant="label" color={theme.colors.textMuted} style={styles.mb2}>
                {t(lang, 'topRiskDrivers')}
              </Typography>
              {prediction.explanation.slice(0, 4).map((entry, idx) => (
                <View key={idx} style={styles.driverItem}>
                  <View style={styles.driverLabelRow}>
                    <Typography variant="body" weight="semibold">
                      {entry.feature.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                    <Badge label={entry.impact} variant={entry.impact === 'VERY HIGH' || entry.impact === 'HIGH' ? 'danger' : 'warning'} />
                  </View>
                  <Typography variant="caption" color={theme.colors.textMuted}>
                    SHAP Value: {entry.value.toFixed(4)}
                  </Typography>
                </View>
              ))}
            </Card>
          )}

          {/* Physical Features */}
          <Card>
            <Typography variant="label" color={theme.colors.textMuted} style={styles.mb2}>
              GEOMORPHIC & PHYSICAL DATA
            </Typography>
            <View style={styles.grid}>
              <View style={styles.gridCell}>
                <Typography variant="label" color={theme.colors.textMuted}>{t(lang, 'elevation')}</Typography>
                <Typography variant="body" weight="bold">
                  {prediction.features?.elevation != null ? `${prediction.features.elevation} m` : 'UNOBSERVED'}
                </Typography>
              </View>
              <View style={styles.gridCell}>
                <Typography variant="label" color={theme.colors.textMuted}>{t(lang, 'slope')}</Typography>
                <Typography variant="body" weight="bold">
                  {prediction.features?.slope != null ? `${prediction.features.slope.toFixed(1)}°` : 'UNOBSERVED'}
                </Typography>
              </View>
              <View style={styles.gridCell}>
                <Typography variant="label" color={theme.colors.textMuted}>{t(lang, 'rainfall7d')}</Typography>
                <Typography variant="body" weight="bold">
                  {prediction.features?.rainfall_7d_mm != null ? `${prediction.features.rainfall_7d_mm} mm` : 'UNOBSERVED'}
                </Typography>
              </View>
              <View style={styles.gridCell}>
                <Typography variant="label" color={theme.colors.textMuted}>{t(lang, 'sarAcquisitionDate')}</Typography>
                <Typography variant="caption" weight="bold" numberOfLines={1}>
                  {prediction.telemetry?.sar_acquisition_date ? new Date(prediction.telemetry.sar_acquisition_date).toLocaleDateString() : 'UNOBSERVED'}
                </Typography>
              </View>
            </View>
          </Card>

          {/* Historical Context */}
          {prediction.historical_context && (
            <Card>
              <Typography variant="label" color={theme.colors.textMuted} style={styles.mb2}>
                {t(lang, 'historicalContext')}
              </Typography>
              <View style={styles.driverLabelRow}>
                <Typography variant="body">{t(lang, 'nearbyEvents')}</Typography>
                <Typography variant="body" weight="bold">
                  {prediction.historical_context.nearby_count}
                </Typography>
              </View>
              {prediction.historical_context.nearest_event && (
                <View style={styles.nestedBox}>
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    Nearest: {prediction.historical_context.nearest_event.distance_km} km away ({prediction.historical_context.nearest_event.event_date})
                  </Typography>
                  <Typography variant="caption" color={theme.colors.textMuted}>
                    Trigger: {prediction.historical_context.nearest_event.trigger}
                  </Typography>
                </View>
              )}
            </Card>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onNavigateToMap}>
              <Typography variant="body" color={theme.colors.primary} weight="bold">
                {t(lang, 'viewOnMap')}
              </Typography>
              <ArrowRight size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.xs },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  ml: { marginLeft: theme.spacing.sm },
  flex1: { flex: 1 },
  iconBtn: { padding: 4 },
  centered: { padding: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' },
  mt2: { marginTop: 8 },
  mb2: { marginBottom: 8 },
  errorCard: {
    borderColor: theme.colors.danger,
    borderWidth: 1,
    backgroundColor: '#1a0000',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  driverLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '47%', backgroundColor: theme.colors.surfaceHighlight, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  nestedBox: { marginTop: 6, padding: 8, backgroundColor: theme.colors.surfaceHighlight, borderRadius: theme.borderRadius.sm },
  actionRow: { flexDirection: 'row', gap: theme.spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
});
