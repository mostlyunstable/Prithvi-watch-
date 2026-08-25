import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface CardProps extends ViewProps {
  padding?: keyof typeof theme.spacing;
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  style,
  children,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding: theme.spacing[padding] },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});
