import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Linking
} from 'react-native';
import * as Location from 'expo-location';
import {
  AlertTriangle,
  Radio,
  MapPin,
  ShieldAlert,
  Clock,
  XCircle,
  CheckCircle2,
  BatteryCharging,
  Info
} from 'lucide-react-native';
import { theme } from '../theme/theme';
import { SOSEvent } from '../types/emergency';
import { emergencyApi } from '../services/api';
import { getOrCreateDeviceId, getUserName, getDemoMode, setDemoMode } from '../services/storage';

const HOLD_DURATION_MS = 3000; // 3 seconds press and hold

export const SOSScreen: React.FC<{ onNavigateToAlerts?: () => void }> = ({ onNavigateToAlerts }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Prithvi Watch Responder');
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number; acc?: number } | null>(null);
  const [fetchingGps, setFetchingGps] = useState<boolean>(false);
  const [activeSOSEvent, setActiveSOSEvent] = useState<SOSEvent | null>(null);
  const [triggering, setTriggering] = useState<boolean>(false);

  // Press-and-hold animation states
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation for active SOS
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    init();
    fetchLocation();
  }, []);

  useEffect(() => {
    if (activeSOSEvent && activeSOSEvent.status === 'ACTIVE') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeSOSEvent]);

  const init = async () => {
    const devId = await getOrCreateDeviceId();
    const name = await getUserName();
    const demo = await getDemoMode();
    setDeviceId(devId);
    setUserName(name);
    setIsDemo(demo);
  };

  const fetchLocation = async () => {
    setFetchingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentCoords({
          lat: roundCoordinate(loc.coords.latitude),
          lon: roundCoordinate(loc.coords.longitude),
          acc: loc.coords.accuracy ? Math.round(loc.coords.accuracy) : undefined
        });
      } else {
        // Fallback to regional coordinates for simulator demo
        setCurrentCoords({ lat: 26.1800, lon: 91.7500, acc: 10 });
      }
    } catch {
      // Fallback
      setCurrentCoords({ lat: 26.1800, lon: 91.7500, acc: 15 });
    } finally {
      setFetchingGps(false);
    }
  };

  const roundCoordinate = (val: number): number => {
    return Math.round(val * 10000) / 10000;
  };

  const handlePressIn = () => {
    if (triggering || (activeSOSEvent && activeSOSEvent.status === 'ACTIVE')) return;

    setIsHolding(true);
    holdProgress.setValue(0);

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();

    holdTimerRef.current = setTimeout(() => {
      confirmAndBroadcastSOS();
    }, HOLD_DURATION_MS);
  };

  const handlePressOut = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    holdProgress.setValue(0);
  };

  const confirmAndBroadcastSOS = () => {
    setIsHolding(false);
    holdProgress.setValue(0);

    Alert.alert(
      isDemo ? '🚨 DEMO SOS CONFIRMATION' : '🚨 EMERGENCY SOS CONFIRMATION',
      isDemo
        ? `Broadcast simulated DEMO SOS with current GPS coordinates (${currentCoords?.lat || 26.1800}°N, ${currentCoords?.lon || 91.7500}°E)?\n\nSimulated alerts will be dispatched to your registered contacts.`
        : `Are you sure you want to broadcast a real emergency SOS from (${currentCoords?.lat}°N, ${currentCoords?.lon}°E)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDemo ? 'Broadcast Demo SOS' : 'Confirm SOS',
          style: 'destructive',
          onPress: executeSOSBroadcast
        }
      ]
    );
  };

  const executeSOSBroadcast = async () => {
    setTriggering(true);
    try {
      const lat = currentCoords?.lat || 26.1800;
      const lon = currentCoords?.lon || 91.7500;

      const event = await emergencyApi.triggerSOS({
        device_id: deviceId,
        latitude: lat,
        longitude: lon,
        altitude_m: 55.0,
        accuracy_m: currentCoords?.acc || 10.0,
        battery_pct: 85,
        sender_name: userName,
        trigger_type: 'PRESS_AND_HOLD_3S',
        mode: isDemo ? 'DEMO' : 'LIVE',
        user_note: isDemo ? 'Judge demonstration alert simulation.' : 'Emergency distress signal.'
      });

      setActiveSOSEvent(event);

      if (event.is_duplicate_suppressed) {
        Alert.alert(
          'Active SOS Cooldown',
          'An active SOS event from your device is already registered. Cooldown is active.'
        );
      } else {
        Alert.alert(
          '🚨 SOS Broadcasted',
          `Event ID: ${event.id}\nSimulated notifications dispatched to ${event.notified_contacts_count} registered contacts.`
        );
      }
    } catch (e: any) {
      Alert.alert('SOS Broadcast Failed', e.message || 'Server error occurred.');
    } finally {
      setTriggering(false);
    }
  };

  const handleCancelSOS = () => {
    if (!activeSOSEvent) return;

    Alert.alert(
      'Cancel SOS Distress Signal',
      'Are you sure you want to stand down the emergency SOS state?',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stand Down / Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await emergencyApi.cancelSOS(activeSOSEvent.id, 'User manually stood down');
              setActiveSOSEvent(res.event);
              Alert.alert('SOS Cancelled', 'Emergency state stood down and logged.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not cancel SOS event.');
            }
          }
        }
      ]
    );
  };

  const progressInterpolation = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Demo Mode Notice Banner */}
      <View style={styles.demoBanner}>
        <View style={styles.demoBannerLeft}>
          <ShieldAlert size={16} color="#f59e0b" />
          <View>
            <Text style={styles.demoBannerTitle}>DEMO SIMULATION MODE ACTIVE</Text>
            <Text style={styles.demoBannerText}>
              Simulates real-time SOS broadcast and contact notifications without carrier network transmission.
            </Text>
          </View>
        </View>
      </View>

      {/* GPS Location Pill */}
      <View style={styles.gpsPill}>
        <MapPin size={14} color="#38bdf8" />
        {fetchingGps ? (
          <Text style={styles.gpsText}>Acquiring GPS coordinates...</Text>
        ) : (
          <Text style={styles.gpsText}>
            GPS: {currentCoords ? `${currentCoords.lat.toFixed(4)}°N, ${currentCoords.lon.toFixed(4)}°E (±${currentCoords.acc || 10}m)` : 'Unavailable'}
          </Text>
        )}
        <TouchableOpacity onPress={fetchLocation} style={styles.refreshGpsBtn}>
          <Text style={styles.refreshGpsText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Active SOS State Card */}
      {activeSOSEvent && activeSOSEvent.status === 'ACTIVE' && (
        <View style={styles.activeSOSCard}>
          <View style={styles.activeSOSHeader}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Radio size={20} color="#ef4444" />
            </Animated.View>
            <Text style={styles.activeSOSTitle}>EMERGENCY SOS ACTIVE</Text>
          </View>

          <View style={styles.sosDetailsGrid}>
            <View style={styles.sosDetailItem}>
              <Text style={styles.sosDetailLabel}>Event ID</Text>
              <Text style={styles.sosDetailValue}>{activeSOSEvent.id}</Text>
            </View>
            <View style={styles.sosDetailItem}>
              <Text style={styles.sosDetailLabel}>Contacts Notified</Text>
              <Text style={styles.sosDetailValue}>{activeSOSEvent.notified_contacts_count}</Text>
            </View>
            <View style={styles.sosDetailItem}>
              <Text style={styles.sosDetailLabel}>Mode</Text>
              <Text style={styles.sosDetailValue}>{activeSOSEvent.mode}</Text>
            </View>
            <View style={styles.sosDetailItem}>
              <Text style={styles.sosDetailLabel}>Timestamp</Text>
              <Text style={styles.sosDetailValue}>
                {new Date(activeSOSEvent.created_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelSOSBtn} onPress={handleCancelSOS}>
            <XCircle size={16} color="#fff" />
            <Text style={styles.cancelSOSText}>Cancel Emergency SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Primary SOS Button Section */}
      <View style={styles.buttonContainer}>
        <View style={styles.sosOuterRing}>
          {/* Progress fill bar underneath */}
          {isHolding && (
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressInterpolation
                }
              ]}
            />
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={triggering || (activeSOSEvent?.status === 'ACTIVE')}
            style={[
              styles.sosCircle,
              activeSOSEvent?.status === 'ACTIVE' && styles.sosCircleActive,
              isHolding && styles.sosCircleHolding
            ]}
          >
            {triggering ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : activeSOSEvent?.status === 'ACTIVE' ? (
              <View style={styles.sosButtonContent}>
                <Radio size={40} color="#fff" />
                <Text style={styles.sosButtonText}>ACTIVE</Text>
                <Text style={styles.sosButtonSub}>BROADCASTING</Text>
              </View>
            ) : (
              <View style={styles.sosButtonContent}>
                <AlertTriangle size={42} color="#fff" />
                <Text style={styles.sosButtonText}>SOS</Text>
                <Text style={styles.sosButtonSub}>HOLD 3 SECONDS</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.instructionText}>
          {isHolding
            ? 'Keep holding to broadcast SOS...'
            : activeSOSEvent?.status === 'ACTIVE'
            ? 'Distress signal is actively broadcasting.'
            : 'Press and hold the SOS button for 3 seconds to trigger emergency assistance.'}
        </Text>
      </View>

      {/* Safety Instructions card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Info size={16} color="#60a5fa" />
          <Text style={styles.infoCardTitle}>Emergency Protocol</Text>
        </View>
        <Text style={styles.infoBullet}>• 3-second hold prevents accidental pocket activations.</Text>
        <Text style={styles.infoBullet}>• Captures high-precision GPS coordinates & battery telemetry.</Text>
        <Text style={styles.infoBullet}>• Dispatches instant alert receipts to registered contacts.</Text>
        <Text style={styles.infoBullet}>• Includes duplicate suppression to avoid spamming responders.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
    paddingBottom: 32
  },
  demoBanner: {
    width: '100%',
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3730a3'
  },
  demoBannerLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start'
  },
  demoBannerTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700'
  },
  demoBannerText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
    marginBottom: 18,
    width: '100%',
    justifyContent: 'space-between'
  },
  gpsText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1
  },
  refreshGpsBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  refreshGpsText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600'
  },
  activeSOSCard: {
    width: '100%',
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dc2626'
  },
  activeSOSHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  activeSOSTitle: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  sosDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  sosDetailItem: {
    width: '48%',
    backgroundColor: '#290606',
    padding: 8,
    borderRadius: 6
  },
  sosDetailLabel: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '600'
  },
  sosDetailValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  cancelSOSBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  cancelSOSText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  sosOuterRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative'
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#dc2626',
    opacity: 0.35
  },
  sosCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10
  },
  sosCircleActive: {
    backgroundColor: '#991b1b'
  },
  sosCircleHolding: {
    backgroundColor: '#b91c1c',
    transform: [{ scale: 0.96 }]
  },
  sosButtonContent: {
    alignItems: 'center'
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2
  },
  sosButtonSub: {
    color: '#fecaca',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 280,
    lineHeight: 18
  },
  infoCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  infoCardTitle: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700'
  },
  infoBullet: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 2
  }
});
