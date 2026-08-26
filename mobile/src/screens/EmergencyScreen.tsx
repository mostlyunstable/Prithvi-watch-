import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Typography } from '../components/Typography';
import { SOSScreen } from './SOSScreen';
import { EmergencyContactsScreen } from './EmergencyContactsScreen';
import { DemoNotificationViewer } from './DemoNotificationViewer';
import { theme } from '../theme/theme';

export const EmergencyScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<'sos' | 'contacts' | 'alerts'>('sos');

  return (
    <SafeAreaView style={styles.container}>
      {/* Sub-navigation Segment Control */}
      <View style={styles.selectorContainer}>
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.chip, subTab === 'sos' && styles.chipActive]}
            onPress={() => setSubTab('sos')}
          >
            <Typography
              variant="label"
              color={subTab === 'sos' ? '#ffffff' : theme.colors.textSecondary}
              weight="bold"
            >
              SOS SIGNAL
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, subTab === 'contacts' && styles.chipActive]}
            onPress={() => setSubTab('contacts')}
          >
            <Typography
              variant="label"
              color={subTab === 'contacts' ? '#ffffff' : theme.colors.textSecondary}
              weight="bold"
            >
              CONTACTS
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, subTab === 'alerts' && styles.chipActive]}
            onPress={() => setSubTab('alerts')}
          >
            <Typography
              variant="label"
              color={subTab === 'alerts' ? '#ffffff' : theme.colors.textSecondary}
              weight="bold"
            >
              ALERTS
            </Typography>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {subTab === 'sos' && <SOSScreen />}
        {subTab === 'contacts' && <EmergencyContactsScreen />}
        {subTab === 'alerts' && <DemoNotificationViewer />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  selectorContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.danger,
  },
  contentContainer: { flex: 1 },
});
