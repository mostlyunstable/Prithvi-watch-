import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: string;
  weight?: keyof typeof theme.typography.weights;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = theme.colors.text,
  weight,
  align = 'auto',
  style,
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return { fontSize: theme.typography.sizes.xxxl, fontWeight: theme.typography.weights.bold };
      case 'h2':
        return { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold };
      case 'h3':
        return { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.semibold };
      case 'body':
        return { fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.regular };
      case 'caption':
        return { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.regular, color: theme.colors.textSecondary };
      case 'label':
        return { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary };
    }
  };

  const defaultWeight = getVariantStyles().fontWeight;
  const appliedWeight = weight ? theme.typography.weights[weight] : defaultWeight;

  return (
    <Text
      style={[
        getVariantStyles(),
        { color, fontWeight: appliedWeight as any, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
