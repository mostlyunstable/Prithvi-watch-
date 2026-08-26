import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './Typography';
import { theme } from '../theme/theme';

interface HazardSelectorProps {
  selected: 'landslide' | 'flood';
  onChange: (value: 'landslide' | 'flood') => void;
  lang: 'en' | 'hi';
}

export const HazardSelector: React.FC<HazardSelectorProps> = ({ selected, onChange, lang }) => {
  const isEn = lang === 'en';
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.chip, selected === 'landslide' && styles.chipActive]}
        onPress={() => onChange('landslide')}
      >
        <Typography
          variant="label"
          color={selected === 'landslide' ? '#ffffff' : theme.colors.textSecondary}
          weight="bold"
        >
          {isEn ? 'LANDSLIDE' : 'भूस्खलन'}
        </Typography>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chip, selected === 'flood' && styles.chipActive]}
        onPress={() => onChange('flood')}
      >
        <Typography
          variant="label"
          color={selected === 'flood' ? '#ffffff' : theme.colors.textSecondary}
          weight="bold"
        >
          {isEn ? 'FLOOD' : 'बाढ़'}
        </Typography>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
});
