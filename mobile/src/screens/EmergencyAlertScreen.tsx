import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { MapPin, Clock, User, ShieldAlert, Check } from 'lucide-react-native';
import { emergencyApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/storage';

interface EmergencyAlertScreenProps {
  eventData: {
    event_id: string;
    sender_name: string;
    latitude: number | string;
    longitude: number | string;
    timestamp: string;
    receipt_id?: string;
    user_note?: string;
  };
  onBack: () => void;
}

export const EmergencyAlertScreen: React.FC<EmergencyAlertScreenProps> = ({ eventData, onBack }) => {
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const lat = typeof eventData.latitude === 'string' ? parseFloat(eventData.latitude) : eventData.latitude;
  const lon = typeof eventData.longitude === 'string' ? parseFloat(eventData.longitude) : eventData.longitude;

  const handleAcknowledge = async () => {
    if (!eventData.receipt_id) {
      Alert.alert('Info', 'Acknowledge only available for real registered alert receipts.');
      return;
    }
    setLoading(true);
    try {
      const devId = await getOrCreateDeviceId();
      await emergencyApi.acknowledgeNotification(eventData.receipt_id, devId);
      setAcknowledged(true);
      Alert.alert('Alert Acknowledged', 'Sender will be notified that you have seen the alert.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to acknowledge alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="🚨 SOS EMERGENCY ALERT" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.dangerCard}>
          <ShieldAlert size={28} color={theme.colors.danger} />
          <Typography variant="h3" color={theme.colors.danger} weight="bold" style={styles.alertTitle}>
            CRITICAL DISTRESS SIGNAL
          </Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.centerText}>
            {eventData.sender_name} has broadcasted an active emergency SOS alert. Immediate response is advised.
          </Typography>
        </Card>

        <Card style={styles.detailsCard}>
          <View style={styles.infoRow}>
            <User size={18} color={theme.colors.textSecondary} />
            <View>
              <Typography variant="caption" color={theme.colors.textMuted}>Originating Person</Typography>
              <Typography variant="body" weight="bold">{eventData.sender_name}</Typography>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={18} color={theme.colors.textSecondary} />
            <View>
              <Typography variant="caption" color={theme.colors.textMuted}>Time Triggered</Typography>
              <Typography variant="body">{new Date(eventData.timestamp).toLocaleString()}</Typography>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={18} color={theme.colors.textSecondary} />
            <View>
              <Typography variant="caption" color={theme.colors.textMuted}>GPS Coordinates</Typography>
              <Typography variant="body" style={styles.mono}>{lat.toFixed(6)}° N, {lon.toFixed(6)}° E</Typography>
            </View>
          </View>

          {eventData.user_note ? (
            <View style={styles.noteBox}>
              <Typography variant="caption" color={theme.colors.textMuted}>Distress Note</Typography>
              <Typography variant="body" style={[styles.whiteItalic, { fontStyle: 'italic' }]}>"{eventData.user_note}"</Typography>
            </View>
          ) : null}
        </Card>

        {eventData.receipt_id && (
          <TouchableOpacity
            style={[styles.ackBtn, acknowledged && styles.ackBtnSuccess]}
            onPress={handleAcknowledge}
            disabled={acknowledged || loading}
          >
            {acknowledged ? (
              <>
                <Check size={16} color="#fff" />
                <Typography variant="body" color="#fff" weight="bold">MARKED AS SEEN</Typography>
              </>
            ) : (
              <Typography variant="body" color="#fff" weight="bold">MARK AS SEEN</Typography>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  dangerCard: {
    alignItems: 'center',
    borderColor: theme.colors.danger,
    borderWidth: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  alertTitle: { marginTop: theme.spacing.xs },
  centerText: { textAlign: 'center', lineHeight: 20 },
  detailsCard: { padding: theme.spacing.lg, gap: theme.spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  mono: { fontFamily: 'monospace' },
  whiteItalic: { color: '#ffffff' },
  noteBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
  ackBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  ackBtnSuccess: {
    backgroundColor: theme.colors.success,
  },
});
