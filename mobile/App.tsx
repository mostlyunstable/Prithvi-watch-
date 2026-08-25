import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { AlertTriangle, Users, Bell, Radio } from 'lucide-react-native';
import { SOSScreen } from './src/screens/SOSScreen';
import { EmergencyContactsScreen } from './src/screens/EmergencyContactsScreen';
import { DemoNotificationViewer } from './src/screens/DemoNotificationViewer';

type TabType = 'sos' | 'contacts' | 'alerts';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('sos');
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/health', { method: 'GET' });
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Top Application Bar */}
      <View style={styles.appBar}>
        <View style={styles.branding}>
          <View style={styles.logoBadge}>
            <Radio size={14} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.appName}>PRITHVI WATCH</Text>
            <Text style={styles.appTagline}>EMERGENCY SOS MODULE • PHASE 1</Text>
          </View>
        </View>

        <View style={[styles.statusPill, backendOnline ? styles.statusOnline : styles.statusOffline]}>
          <View style={[styles.statusDot, backendOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>{backendOnline ? 'BACKEND READY' : 'LOCAL'}</Text>
        </View>
      </View>

      {/* Main Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'sos' && <SOSScreen onNavigateToAlerts={() => setActiveTab('alerts')} />}
        {activeTab === 'contacts' && <EmergencyContactsScreen />}
        {activeTab === 'alerts' && <DemoNotificationViewer />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'sos' && styles.tabItemActive]}
          onPress={() => setActiveTab('sos')}
        >
          <AlertTriangle size={20} color={activeTab === 'sos' ? '#ef4444' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'sos' && styles.tabLabelActiveSOS]}>
            SOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'contacts' && styles.tabItemActive]}
          onPress={() => setActiveTab('contacts')}
        >
          <Users size={20} color={activeTab === 'contacts' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'contacts' && styles.tabLabelActive]}>
            Contacts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Bell size={20} color={activeTab === 'alerts' ? '#eab308' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'alerts' && styles.tabLabelActive]}>
            Demo Alerts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoBadge: {
    backgroundColor: '#450a0a',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7f1d1d'
  },
  appName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  appTagline: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5
  },
  statusOnline: {
    backgroundColor: '#064e3b'
  },
  statusOffline: {
    backgroundColor: '#1e293b'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  dotOnline: {
    backgroundColor: '#22c55e'
  },
  dotOffline: {
    backgroundColor: '#eab308'
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700'
  },
  screenContainer: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
    paddingBottom: 16
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  tabItemActive: {
    opacity: 1
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b'
  },
  tabLabelActive: {
    color: '#f8fafc'
  },
  tabLabelActiveSOS: {
    color: '#ef4444',
    fontWeight: '700'
  }
});
