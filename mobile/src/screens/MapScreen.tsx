import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Typography } from '../components/Typography';
import { Badge } from '../components/Badge';
import { theme } from '../theme/theme';
import { Map, Layers, Navigation, ChevronUp, ChevronDown } from 'lucide-react-native';

export const MapScreen: React.FC = () => {
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapArea}>
        <Map size={48} color={theme.colors.textMuted} />
        <Typography variant="body" color={theme.colors.textMuted} style={styles.mt}>
          Map View (Placeholder)
        </Typography>
        
        {/* Floating Actions */}
        <View style={styles.floatingActions}>
          <TouchableOpacity style={styles.fab}>
            <Layers size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab}>
            <Navigation size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Assessment */}
      <View style={[styles.bottomSheet, sheetOpen ? styles.sheetOpen : styles.sheetClosed]}>
        <TouchableOpacity 
          style={styles.sheetHandle}
          onPress={() => setSheetOpen(!sheetOpen)}
        >
          <View style={styles.handleBar} />
        </TouchableOpacity>

        <View style={styles.sheetHeader}>
          <View>
            <Typography variant="h3">Guwahati Assessment</Typography>
            <Typography variant="caption">Lat: 26.18, Lon: 91.75</Typography>
          </View>
          <Badge label="SAFE" variant="success" />
        </View>

        {sheetOpen && (
          <ScrollView style={styles.sheetContent}>
            <View style={styles.dataRow}>
              <Typography variant="body" color={theme.colors.textSecondary}>Water Level</Typography>
              <Typography variant="body" weight="bold">Normal</Typography>
            </View>
            <View style={styles.dataRow}>
              <Typography variant="body" color={theme.colors.textSecondary}>SAR Prediction</Typography>
              <Typography variant="body" weight="bold">No flood detected</Typography>
            </View>
            <View style={styles.dataRow}>
              <Typography variant="body" color={theme.colors.textSecondary}>Confidence</Typography>
              <Typography variant="body" weight="bold">89%</Typography>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapArea: {
    flex: 1,
    backgroundColor: theme.colors.mapPlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mt: {
    marginTop: theme.spacing.md,
  },
  floatingActions: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetOpen: {
    height: 300,
  },
  sheetClosed: {
    height: 100,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  sheetContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
});
