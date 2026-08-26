import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, SafeAreaView, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from './src/theme/theme';
import { Typography } from './src/components/Typography';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { HazardsScreen } from './src/screens/HazardsScreen';
import { EmergencyScreen } from './src/screens/EmergencyScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SOSScreen } from './src/screens/SOSScreen';
import { EmergencyContactsScreen } from './src/screens/EmergencyContactsScreen';
import { DemoNotificationViewer } from './src/screens/DemoNotificationViewer';
import { EmergencyAlertScreen } from './src/screens/EmergencyAlertScreen';
import { LocationRiskDetails } from './src/screens/LocationRiskDetails';
import { NavigationProvider, useNavigation, Tab } from './src/services/navigation';
import * as Notifications from 'expo-notifications';
import {
  Home,
  Map,
  ShieldAlert,
  AlertTriangle,
  Settings,
} from 'lucide-react-native';
import { t, Language } from './src/i18n/strings';

function AppContent() {
  const { activeTab, activeRoute, switchTab, pop, push } = useNavigation();
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    // When the recipient taps on a push notification alert
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.event_id) {
        push('alert_details', data);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const renderContent = () => {
    switch (activeRoute.name) {
      case 'home':
        return <HomeScreen lang={lang} onNavigate={switchTab} />;
      case 'map':
        return <MapScreen lang={lang} />;
      case 'hazards':
        return <HazardsScreen lang={lang} onNavigateToMap={() => switchTab('map')} />;
      case 'emergency':
        return <EmergencyScreen />;
      case 'settings':
        return <SettingsScreen lang={lang} onLangChange={setLang} />;
      
      // Secondary/Detail Pushed Screens
      case 'sos_pushed':
        return <SOSScreen onBack={pop} />;
      case 'contacts_pushed':
        return <EmergencyContactsScreen onBack={pop} />;
      case 'alerts_pushed':
        return <DemoNotificationViewer onBack={pop} />;
      case 'alert_details':
        return <EmergencyAlertScreen eventData={activeRoute.params} onBack={pop} />;
      case 'risk_details':
        return <LocationRiskDetails assessment={activeRoute.params} onBack={pop} />;
      default:
        return <HomeScreen lang={lang} onNavigate={switchTab} />;
    }
  };

  const isTabActive = (tab: Tab) => activeTab === tab;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>{renderContent()}</View>

      {/* Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, isTabActive('home') && styles.tabItemActive]}
          onPress={() => switchTab('home')}
        >
          <Home size={20} color={isTabActive('home') ? theme.colors.primary : theme.colors.textSecondary} />
          <Typography variant="label" color={isTabActive('home') ? theme.colors.primary : theme.colors.textSecondary}>
            {t(lang, 'navHome')}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isTabActive('map') && styles.tabItemActive]}
          onPress={() => switchTab('map')}
        >
          <Map size={20} color={isTabActive('map') ? theme.colors.primary : theme.colors.textSecondary} />
          <Typography variant="label" color={isTabActive('map') ? theme.colors.primary : theme.colors.textSecondary}>
            {t(lang, 'navMap')}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isTabActive('hazards') && styles.tabItemActive]}
          onPress={() => switchTab('hazards')}
        >
          <ShieldAlert size={20} color={isTabActive('hazards') ? theme.colors.primary : theme.colors.textSecondary} />
          <Typography variant="label" color={isTabActive('hazards') ? theme.colors.primary : theme.colors.textSecondary}>
            {t(lang, 'navHazards')}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isTabActive('emergency') && styles.tabItemActive]}
          onPress={() => switchTab('emergency')}
        >
          <AlertTriangle size={20} color={isTabActive('emergency') ? theme.colors.danger : theme.colors.textSecondary} />
          <Typography variant="label" color={isTabActive('emergency') ? theme.colors.danger : theme.colors.textSecondary}>
            {t(lang, 'navEmergency')}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isTabActive('settings') && styles.tabItemActive]}
          onPress={() => switchTab('settings')}
        >
          <Settings size={20} color={isTabActive('settings') ? theme.colors.primary : theme.colors.textSecondary} />
          <Typography variant="label" color={isTabActive('settings') ? theme.colors.primary : theme.colors.textSecondary}>
            {t(lang, 'navSettings')}
          </Typography>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 8,
    gap: 4,
  },
  tabItemActive: {},
});
