import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { Typography } from '../components/Typography';
import { Badge } from '../components/Badge';
import { HazardSelector } from '../components/HazardSelector';
import { theme } from '../theme/theme';
import {
  Layers,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Shield,
  LocateFixed,
} from 'lucide-react-native';
import { useNavigation } from '../services/navigation';
import { api } from '../services/api';
import { FloodAssessmentResponse } from '../types/flood';
import { LandslidePrediction } from '../types/landslide';
import { NER_REGIONS, NER_DEFAULT_REGION, NERRegion } from '../constants/regions';
import { t } from '../i18n/strings';

interface MapScreenProps {
  lang: 'en' | 'hi';
}

type LocationState = 'idle' | 'requesting' | 'acquired' | 'denied' | 'unavailable';
type AssessState = 'idle' | 'loading' | 'done' | 'error';


export const MapScreen: React.FC<MapScreenProps> = ({ lang }) => {
  const isEn = lang === 'en';
  const mapRef = useRef<MapView>(null);
  const { push } = useNavigation();
  const [activeHazard, setActiveHazard] = useState<'landslide' | 'flood'>('landslide');
  const [region, setRegion] = useState<Region>({
    latitude: NER_DEFAULT_REGION.latitude,
    longitude: NER_DEFAULT_REGION.longitude,
    latitudeDelta: NER_DEFAULT_REGION.latitudeDelta,
    longitudeDelta: NER_DEFAULT_REGION.longitudeDelta,
  });
  const [pinnedCoord, setPinnedCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [assessState, setAssessState] = useState<AssessState>('idle');
  const [landslideData, setLandslideData] = useState<LandslidePrediction | null>(null);
  const [floodData, setFloodData] = useState<FloodAssessmentResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [selectedNERRegion, setSelectedNERRegion] = useState<NERRegion | null>(null);

  const handleUseMyLocation = async () => {
    setLocationState('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationState('denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = Math.round(loc.coords.latitude * 10000) / 10000;
      const lon = Math.round(loc.coords.longitude * 10000) / 10000;
      const newRegion: Region = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);
      setPinnedCoord({ lat, lon });
      setSelectedNERRegion(null);
      setLocationState('acquired');
      setSheetOpen(true);
    } catch {
      setLocationState('unavailable');
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;
    setPinnedCoord({ lat, lon });
    setSelectedNERRegion(null);
    setLandslideData(null);
    setFloodData(null);
    setErrorMsg(null);
    setAssessState('idle');
    setSheetOpen(true);
  };

  const handleSelectNERRegion = (r: NERRegion) => {
    setSelectedNERRegion(r);
    const newRegion: Region = {
      latitude: r.latitude,
      longitude: r.longitude,
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 700);
    setPinnedCoord({ lat: r.latitude, lon: r.longitude });
    setLandslideData(null);
    setFloodData(null);
    setErrorMsg(null);
    setAssessState('idle');
    setRegionPickerOpen(false);
    setSheetOpen(true);
  };

  const handleAssess = useCallback(async () => {
    if (!pinnedCoord) return;
    setAssessState('loading');
    setErrorMsg(null);
    try {
      const assessment = await api.assessCombinedRisk(pinnedCoord.lat, pinnedCoord.lon);
      setAssessState('idle'); // or done
      push('risk_details', assessment);
      setSheetOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message || 'Assessment failed.');
      setAssessState('error');
    }
  }, [pinnedCoord, push]);

  // Handle active hazard change — auto-trigger assessment if location is pinned
  useEffect(() => {
    if (pinnedCoord) {
      setLandslideData(null);
      setFloodData(null);
      setAssessState('idle');
      setErrorMsg(null);
    }
  }, [activeHazard]);



  const displayName = selectedNERRegion
    ? (lang === 'hi' ? t(lang, `region${selectedNERRegion.name}` as any) : selectedNERRegion.name)
    : pinnedCoord
    ? `${pinnedCoord.lat.toFixed(4)}°N, ${pinnedCoord.lon.toFixed(4)}°E`
    : t(lang, 'selectRegion');

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {pinnedCoord && (
          <Marker
            coordinate={{ latitude: pinnedCoord.lat, longitude: pinnedCoord.lon }}
            pinColor={theme.colors.danger}
          />
        )}
      </MapView>

      {/* Floating Controls */}
      <View style={styles.floatingControls}>
        <TouchableOpacity style={styles.fab} onPress={() => setRegionPickerOpen(!regionPickerOpen)}>
          <Layers size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={handleUseMyLocation}>
          {locationState === 'requesting' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <LocateFixed size={20} color={locationState === 'acquired' ? theme.colors.primary : theme.colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Hazard Toggle Switcher */}
      <View style={styles.selectorWrapper}>
        <HazardSelector selected={activeHazard} onChange={setActiveHazard} lang={lang} />
      </View>

      {/* NER Region Selector */}
      {regionPickerOpen && (
        <View style={styles.regionPicker}>
          <Typography variant="label" color={theme.colors.textMuted} style={styles.pickerTitle}>
            {t(lang, 'selectRegion').toUpperCase()}
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
            {NER_REGIONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.regionChip,
                  selectedNERRegion?.id === r.id && styles.regionChipSelected,
                ]}
                onPress={() => handleSelectNERRegion(r)}
              >
                <Typography
                  variant="caption"
                  color={selectedNERRegion?.id === r.id ? '#fff' : theme.colors.textSecondary}
                  weight={selectedNERRegion?.id === r.id ? 'bold' : 'regular'}
                >
                  {lang === 'hi' ? t(lang, `region${r.name}` as any) : r.name}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom Assessment Card Overlay */}
      <View style={[styles.bottomSheet, sheetOpen ? styles.sheetOpen : styles.sheetClosed]}>
        <TouchableOpacity style={styles.sheetHandle} onPress={() => setSheetOpen(!sheetOpen)}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleBlock}>
            <Typography variant="h3" numberOfLines={1}>{displayName}</Typography>
            {pinnedCoord && (
              <Typography variant="caption" color={theme.colors.textMuted}>
                {pinnedCoord.lat.toFixed(4)}°N, {pinnedCoord.lon.toFixed(4)}°E
              </Typography>
            )}
          </View>

        </View>

        {sheetOpen && (
          <ScrollView style={styles.sheetContent}>
            {pinnedCoord && assessState !== 'done' && (
              <TouchableOpacity
                style={[styles.assessBtn, assessState === 'loading' && styles.assessBtnDisabled]}
                onPress={handleAssess}
                disabled={assessState === 'loading'}
              >
                {assessState === 'loading' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Typography variant="body" color="#fff" weight="bold">
                    {t(lang, 'assessLocation')}
                  </Typography>
                )}
              </TouchableOpacity>
            )}

            {assessState === 'error' && errorMsg && (
              <View style={styles.errorBox}>
                <AlertTriangle size={14} color={theme.colors.danger} />
                <Typography variant="caption" color={theme.colors.danger} style={{ marginLeft: 6 }}>
                  {errorMsg}
                </Typography>
              </View>
            )}


          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  map: { flex: 1 },
  floatingControls: { position: 'absolute', right: theme.spacing.md, top: 80, gap: theme.spacing.sm },
  selectorWrapper: { position: 'absolute', top: theme.spacing.md, left: theme.spacing.md },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  regionPicker: {
    position: 'absolute',
    top: 80,
    left: theme.spacing.md,
    right: 64,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerTitle: { marginBottom: 6 },
  regionScroll: { gap: 6 },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  regionChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetOpen: { maxHeight: 300 },
  sheetClosed: { height: 90 },
  sheetHandle: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sheetTitleBlock: { flex: 1 },
  sheetContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  assessBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assessBtnDisabled: { opacity: 0.6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0000',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  assessResults: { gap: 8, marginTop: theme.spacing.sm },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});
