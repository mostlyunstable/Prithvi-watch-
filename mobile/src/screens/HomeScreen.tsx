import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { theme } from '../theme/theme';
import { AlertTriangle, Activity, MapPin, CheckCircle } from 'lucide-react-native';

interface HomeScreenProps {
  onNavigate: (tab: 'home' | 'map' | 'flood' | 'emergency') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      console.log('Failed to fetch health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Typography variant="h2">Prithvi Watch</Typography>
          <Typography variant="caption">Geospatial Intelligence System</Typography>
        </View>
        <Badge 
          label={health?.status === 'ok' ? 'SYSTEM ONLINE' : 'LOCAL MODE'} 
          variant={health?.status === 'ok' ? 'success' : 'warning'} 
        />
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Activity color={theme.colors.primary} size={24} />
          <View style={styles.ml}>
            <Typography variant="h3">Current Risk</Typography>
            <Typography variant="body" color={theme.colors.textSecondary}>Low Risk Detected</Typography>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Typography variant="label">CONFIDENCE</Typography>
            <Typography variant="h3">92%</Typography>
          </View>
          <View style={styles.flex1}>
            <Typography variant="label">LAST UPDATED</Typography>
            <Typography variant="h3">Just now</Typography>
          </View>
        </View>
      </Card>

      <Card style={styles.mapCard} padding="sm">
        <View style={styles.mapHeader}>
          <MapPin size={16} color={theme.colors.textSecondary} />
          <Typography variant="label" style={{ marginLeft: 8 }}>GUWAHATI, ASSAM</Typography>
        </View>
        <TouchableOpacity style={styles.mapPlaceholder} onPress={() => onNavigate('map')}>
          <Typography variant="body" color={theme.colors.textSecondary}>
            Tap to view full map
          </Typography>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity 
        style={styles.sosButton}
        onPress={() => onNavigate('emergency')}
      >
        <AlertTriangle size={32} color="#fff" />
        <View style={styles.ml}>
          <Typography variant="h3" color="#fff">Emergency SOS</Typography>
          <Typography variant="caption" color="#ffcccc">Hold to dispatch distress signal</Typography>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  card: {
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ml: {
    marginLeft: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  mapCard: {
    gap: theme.spacing.sm,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: theme.colors.mapPlaceholder,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
});
