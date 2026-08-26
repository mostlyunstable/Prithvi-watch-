import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { HazardSelector } from '../components/HazardSelector';
import { LandslideScreen } from './LandslideScreen';
import { FloodScreen } from './FloodScreen';
import { theme } from '../theme/theme';

interface HazardsScreenProps {
  lang: 'en' | 'hi';
  onNavigateToMap: () => void;
}

export const HazardsScreen: React.FC<HazardsScreenProps> = ({ lang, onNavigateToMap }) => {
  const [activeHazard, setActiveHazard] = useState<'landslide' | 'flood'>('landslide');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.selectorContainer}>
        <HazardSelector selected={activeHazard} onChange={setActiveHazard} lang={lang} />
      </View>
      <View style={styles.contentContainer}>
        {activeHazard === 'landslide' ? (
          <LandslideScreen lang={lang} onNavigateToMap={onNavigateToMap} />
        ) : (
          <FloodScreen />
        )}
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
  contentContainer: { flex: 1 },
});
