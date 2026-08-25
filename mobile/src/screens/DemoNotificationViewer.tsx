import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Bell, ShieldCheck, RefreshCw, Send, CheckCheck, AlertCircle } from 'lucide-react-native';
import { NotificationReceipt } from '../types/emergency';
import { emergencyApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/storage';

export const DemoNotificationViewer: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationReceipt[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const devId = await getOrCreateDeviceId();
    setDeviceId(devId);
    fetchNotifications();
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await emergencyApi.getDemoNotifications(30);
      setNotifications(data.notifications || []);
      setDisclaimer(data.disclaimer || 'DEMO SIMULATION ONLY');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (receiptId: string) => {
    try {
      await emergencyApi.acknowledgeNotification(receiptId, deviceId);
      Alert.alert('Acknowledged', 'Notification marked as received by responder.');
      await fetchNotifications();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not acknowledge notification.');
    }
  };

  const renderReceiptCard = ({ item }: { item: NotificationReceipt }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={item.channel === 'EXPO_REAL_PUSH' ? styles.pushBadge : styles.demoBadge}>
            <Text style={styles.badgeText}>
              {item.channel === 'EXPO_REAL_PUSH' ? 'REAL PUSH DISPATCH' : 'DEMO SIMULATION'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            item.status === 'ACKNOWLEDGED' && styles.statusAck,
            item.status === 'FAILED' && styles.statusFailed
          ]}>
            {item.status === 'ACKNOWLEDGED' ? (
              <CheckCheck size={11} color="#86efac" />
            ) : item.status === 'FAILED' ? (
              <AlertCircle size={11} color="#fca5a5" />
            ) : (
              <Send size={11} color="#93c5fd" />
            )}
            <Text style={[
              styles.statusBadgeText,
              item.status === 'ACKNOWLEDGED' && styles.statusAckText,
              item.status === 'FAILED' && styles.statusFailedText
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.timestampText}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.recipientRow}>
        <Text style={styles.recipientLabel}>Recipient:</Text>
        <Text style={styles.recipientName}>{item.recipient_name || 'Responder'}</Text>
        {item.recipient_phone_masked ? (
          <Text style={styles.recipientPhone}>({item.recipient_phone_masked})</Text>
        ) : item.recipient_token_masked ? (
          <Text style={styles.recipientPhone}>({item.recipient_token_masked})</Text>
        ) : null}
      </View>

      {item.formatted_message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{item.formatted_message}</Text>
        </View>
      ) : (
        <View style={styles.messageBox}>
          <Text style={styles.pushTitleText}>{item.push_title}</Text>
          <Text style={styles.messageText}>{item.push_body}</Text>
        </View>
      )}

      {item.error_reason && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error: {item.error_reason}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.eventIdText}>Ref: {item.event_id}</Text>
        {item.status !== 'ACKNOWLEDGED' && (
          <TouchableOpacity
            style={styles.ackBtn}
            onPress={() => handleAcknowledge(item.receipt_id)}
          >
            <Text style={styles.ackBtnText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alert & Push Stream</Text>
          <Text style={styles.headerSubtitle}>Two-device SOS notification tracking</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchNotifications}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Safety Notice */}
      <View style={styles.safetyBox}>
        <ShieldCheck size={16} color="#38bdf8" />
        <Text style={styles.safetyText}>
          {disclaimer || 'DEMO / PROTOTYPE: Real push notifications routed to registered test devices.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Fetching notification stream...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No Alerts Dispatched Yet</Text>
          <Text style={styles.emptyText}>
            Trigger an SOS from Phone A to observe real push alerts dispatched to Phone B responders.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.receipt_id}
          renderItem={renderReceiptCard}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchNotifications}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6
  },
  refreshBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 12
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#082f49',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#0284c7'
  },
  safetyText: {
    color: '#bae6fd',
    fontSize: 11,
    flex: 1,
    lineHeight: 15
  },
  listContent: {
    paddingBottom: 24
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6
  },
  demoBadge: {
    backgroundColor: '#3730a3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pushBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: {
    color: '#c7d2fe',
    fontSize: 9,
    fontWeight: '800'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4
  },
  statusAck: {
    backgroundColor: '#064e3b'
  },
  statusFailed: {
    backgroundColor: '#450a0a'
  },
  statusBadgeText: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '700'
  },
  statusAckText: {
    color: '#86efac'
  },
  statusFailedText: {
    color: '#fca5a5'
  },
  timestampText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  recipientLabel: {
    color: '#94a3b8',
    fontSize: 12
  },
  recipientName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700'
  },
  recipientPhone: {
    color: '#60a5fa',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  messageBox: {
    backgroundColor: '#090d16',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    marginBottom: 8
  },
  pushTitleText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4
  },
  messageText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace'
  },
  errorBox: {
    backgroundColor: '#450a0a',
    padding: 6,
    borderRadius: 4,
    marginBottom: 8
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 10
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eventIdText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  ackBtn: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  ackBtnText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  }
});
