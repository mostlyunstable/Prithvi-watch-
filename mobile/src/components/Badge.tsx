import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Typography } from './Typography';
import { theme } from '../theme/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', style, ...props }) => {
  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: 'rgba(34, 197, 94, 0.2)', text: theme.colors.success };
      case 'warning': return { bg: 'rgba(234, 179, 8, 0.2)', text: theme.colors.warning };
      case 'danger': return { bg: 'rgba(239, 68, 68, 0.2)', text: theme.colors.danger };
      case 'info': return { bg: 'rgba(59, 130, 246, 0.2)', text: theme.colors.primary };
      case 'default': return { bg: theme.colors.surfaceHighlight, text: theme.colors.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]} {...props}>
      <Typography variant="label" color={colors.text} weight="bold" style={styles.text}>
        {label.toUpperCase()}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: 0.5,
  }
});
