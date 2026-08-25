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
import { AlertTriangle, Map as MapIcon, Home as HomeIcon, Droplets } from 'lucide-react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { FloodScreen } from './src/screens/FloodScreen';
import { SOSScreen } from './src/screens/SOSScreen';
import { theme } from './src/theme/theme';

type TabType = 'home' | 'map' | 'flood' | 'emergency';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Main Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen onNavigate={setActiveTab} />}
        {activeTab === 'map' && <MapScreen />}
        {activeTab === 'flood' && <FloodScreen />}
        {activeTab === 'emergency' && <SOSScreen />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
        >
          <HomeIcon size={24} color={activeTab === 'home' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'home' && { color: theme.colors.primary }]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('map')}
        >
          <MapIcon size={24} color={activeTab === 'map' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'map' && { color: theme.colors.primary }]}>
            Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('flood')}
        >
          <Droplets size={24} color={activeTab === 'flood' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'flood' && { color: theme.colors.primary }]}>
            Flood
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('emergency')}
        >
          <AlertTriangle size={24} color={activeTab === 'emergency' ? theme.colors.danger : theme.colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'emergency' && { color: theme.colors.danger }]}>
            Emergency
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  screenContainer: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
    paddingBottom: 24,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted
  }
});
