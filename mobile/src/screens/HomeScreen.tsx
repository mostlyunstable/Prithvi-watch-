import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { theme } from '../theme/theme';
import {
  AlertTriangle,
  LocateFixed,
  RefreshCw,
  WifiOff,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { api } from '../services/api';
import { FloodAssessmentResponse } from '../types/flood';
import { LandslidePrediction } from '../types/landslide';
import { t } from '../i18n/strings';

interface HomeScreenProps {
  lang: 'en' | 'hi';
  onNavigate: (tab: 'home' | 'map' | 'hazards' | 'emergency' | 'settings') => void;
}

type BackendStatus = 'checking' | 'online' | 'offline';
type LocationState = 'idle' | 'requesting' | 'acquired' | 'denied' | 'unavailable';

function riskColor(level?: string): string {
  switch (level) {
    case 'CRITICAL': return theme.colors.danger;
    case 'HIGH': return '#f97316';
    case 'MODERATE': return theme.colors.warning;
    case 'LOW': return theme.colors.success;
    default: return theme.colors.textMuted;
  }
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ lang, onNavigate }) => {
  const isEn = lang === 'en';
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [landslide, setLandslide] = useState<LandslidePrediction | null>(null);
  const [flood, setFlood] = useState<FloodAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      await api.checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  const fetchHazards = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const [landslideData, floodData] = await Promise.all([
        api.runPrediction(lat, lon),
        api.assessFlood(lat, lon),
      ]);
      setLandslide(landslideData);
      setFlood(floodData);
    } catch (e: any) {
      setError(e.message || 'Multi-hazard assessment failed.');
    } finally {
      setLoading(false);
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
      fetchHazards(c.lat, c.lon);
    } catch {
      setLocationState('unavailable');
    }
  };

  useEffect(() => {
    checkBackend();
    acquireLocation();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkBackend();
    if (coords) {
      await fetchHazards(coords.lat, coords.lon);
    } else {
      await acquireLocation();
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Typography variant="h2">{t(lang, 'appName')}</Typography>
          <Typography variant="caption" color={theme.colors.textMuted}>
            {t(lang, 'appTagline')}
          </Typography>
        </View>
        <Badge
          label={
            backendStatus === 'checking' ? (isEn ? 'CHECKING' : 'जांच जारी') :
            backendStatus === 'online' ? t(lang, 'backendOnline') : t(lang, 'backendOffline')
          }
          variant={
            backendStatus === 'checking' ? 'neutral' :
            backendStatus === 'online' ? 'success' : 'error'
          }
        />
      </View>

      {/* Offline Warning */}
      {backendStatus === 'offline' && (
        <Card style={styles.offlineCard}>
          <WifiOff size={18} color={theme.colors.danger} />
          <View style={styles.ml}>
            <Typography variant="label" color={theme.colors.danger}>SERVER UNREACHABLE</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>
              Check local network connection.
            </Typography>
          </View>
        </Card>
      )}

      {/* GPS Location Row */}
      <Card style={styles.locationCard}>
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

      {/* Multi-Hazard Overview Cards */}
      <View style={styles.hazardGrid}>
        {/* Landslide Overview Card */}
        <TouchableOpacity style={styles.hazardCard} onPress={() => onNavigate('hazards')}>
          <Card style={styles.flexCard}>
            <Typography variant="label" color={theme.colors.textMuted}>
              {t(lang, 'hazardLandslide').toUpperCase()}
            </Typography>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
            ) : landslide ? (
              <View style={styles.mt2}>
                <Typography variant="h3" color={riskColor(landslide.risk_level)} weight="bold">
                  {landslide.risk_level}
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary} style={styles.mt1}>
                  {t(lang, 'riskProbability')}: {(landslide.landslide_probability * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt1}>
                  Confidence: {landslide.data_quality?.completeness?.completeness_pct.toFixed(0)}%
                </Typography>
              </View>
            ) : (
              <Typography variant="body" color={theme.colors.textMuted} style={styles.mt2}>
                {t(lang, 'unobserved')}
              </Typography>
            )}
            <View style={styles.cardActionRow}>
              <Typography variant="caption" color={theme.colors.primary} weight="bold">
                {t(lang, 'viewDetails')}
              </Typography>
              <ChevronRight size={14} color={theme.colors.primary} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Flood Overview Card */}
        <TouchableOpacity style={styles.hazardCard} onPress={() => onNavigate('hazards')}>
          <Card style={styles.flexCard}>
            <Typography variant="label" color={theme.colors.textMuted}>
              {t(lang, 'hazardFlood').toUpperCase()}
            </Typography>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
            ) : flood ? (
              <View style={styles.mt2}>
                <Typography variant="h3" color={riskColor(flood.assessment?.risk_level)} weight="bold">
                  {flood.assessment?.risk_level ?? t(lang, 'unknown')}
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary} style={styles.mt1}>
                  {t(lang, 'riskProbability')}: {flood.assessment?.flood_probability != null ? `${(flood.assessment.flood_probability * 100).toFixed(0)}%` : '—'}
                </Typography>
                <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt1}>
                  Confidence: {flood.data_confidence?.completeness_pct != null ? `${flood.data_confidence.completeness_pct.toFixed(0)}%` : '—'}
                </Typography>
              </View>
            ) : (
              <Typography variant="body" color={theme.colors.textMuted} style={styles.mt2}>
                {t(lang, 'unobserved')}
              </Typography>
            )}
            <View style={styles.cardActionRow}>
              <Typography variant="caption" color={theme.colors.primary} weight="bold">
                {t(lang, 'viewDetails')}
              </Typography>
              <ChevronRight size={14} color={theme.colors.primary} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Main Operations Navigation Panel */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onNavigate('map')}
      >
        <Typography variant="body" color="#fff" weight="bold">
          {t(lang, 'openRiskMap')}
        </Typography>
        <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.sosBtn]}
        onPress={() => onNavigate('emergency')}
      >
        <Typography variant="body" color="#fff" weight="bold">
          {t(lang, 'emergencySOS')}
        </Typography>
        <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  offlineCard: { borderColor: theme.colors.danger, borderWidth: 1, backgroundColor: 'rgba(239, 68, 68, 0.05)', flexDirection: 'row', alignItems: 'center' },
  locationCard: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: theme.spacing.sm },
  flex1: { flex: 1 },
  iconBtn: { padding: 4 },
  hazardGrid: { flexDirection: 'row', gap: theme.spacing.md },
  hazardCard: { flex: 1 },
  flexCard: { flex: 1, minHeight: 150, justifyContent: 'space-between' },
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  spinner: { marginVertical: 12 },
  cardActionRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 2, marginTop: theme.spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  sosBtn: { backgroundColor: theme.colors.danger },
});
