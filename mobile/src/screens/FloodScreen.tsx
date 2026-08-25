import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { theme } from '../theme/theme';
import { Droplets, Clock, AlertCircle } from 'lucide-react-native';

type FloodState = 'DETECTED' | 'UNCONFIRMED' | 'NO_OBSERVATION' | 'UNAVAILABLE';

export const FloodScreen: React.FC = () => {
  const [floodState, setFloodState] = useState<FloodState>('NO_OBSERVATION');

  const getStatusColor = () => {
    switch (floodState) {
      case 'DETECTED': return theme.colors.danger;
      case 'UNCONFIRMED': return theme.colors.warning;
      case 'NO_OBSERVATION': return theme.colors.textMuted;
      case 'UNAVAILABLE': return theme.colors.border;
    }
  };

  const getStatusText = () => {
    switch (floodState) {
      case 'DETECTED': return 'FLOOD DETECTED';
      case 'UNCONFIRMED': return 'FLOOD EVIDENCE UNCONFIRMED';
      case 'NO_OBSERVATION': return 'NO RECENT SATELLITE OBSERVATION';
      case 'UNAVAILABLE': return 'DATA UNAVAILABLE';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Typography variant="h2">Flood Assessment</Typography>
        <Typography variant="caption">Sentinel-1 SAR Data Analysis</Typography>
      </View>

      <Card style={[styles.statusCard, { borderColor: getStatusColor() }]}>
        <Droplets size={32} color={getStatusColor()} />
        <Typography variant="h3" color={getStatusColor()} style={styles.statusText}>
          {getStatusText()}
        </Typography>
        
        {floodState === 'DETECTED' && (
          <Typography variant="body" color={theme.colors.textSecondary} align="center">
            Significant water surface expansion detected in target area.
          </Typography>
        )}
      </Card>

      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Clock size={16} color={theme.colors.textMuted} />
          <View style={styles.detailContent}>
            <Typography variant="label">OBSERVATION TIMESTAMP</Typography>
            <Typography variant="body">2026-08-25T14:30:00Z</Typography>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <AlertCircle size={16} color={theme.colors.textMuted} />
          <View style={styles.detailContent}>
            <Typography variant="label">CONFIDENCE SCORE</Typography>
            <Typography variant="body">
              {floodState === 'NO_OBSERVATION' ? 'N/A' : '87%'}
            </Typography>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Droplets size={16} color={theme.colors.textMuted} />
          <View style={styles.detailContent}>
            <Typography variant="label">MAJOR EVIDENCE</Typography>
            <Typography variant="body">
              {floodState === 'DETECTED' ? 'Decreased backscatter (-3.2dB)' : 'No significant change'}
            </Typography>
          </View>
        </View>
      </Card>

      <View style={styles.testActions}>
        <Typography variant="label" style={{ marginBottom: 8 }}>DEMO CONTROLS</Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Button size="sm" variant="outline" label="Detected" onPress={() => setFloodState('DETECTED')} />
          <Button size="sm" variant="outline" label="Unconfirmed" onPress={() => setFloodState('UNCONFIRMED')} />
          <Button size="sm" variant="outline" label="No Obs" onPress={() => setFloodState('NO_OBSERVATION')} />
          <Button size="sm" variant="outline" label="Unavailable" onPress={() => setFloodState('UNAVAILABLE')} />
        </ScrollView>
      </View>
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
    marginBottom: theme.spacing.sm,
  },
  statusCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 2,
  },
  statusText: {
    textAlign: 'center',
  },
  detailsCard: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  testActions: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
  },
});
