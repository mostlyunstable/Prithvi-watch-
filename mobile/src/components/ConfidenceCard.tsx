import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Typography } from './Typography';
import { Badge } from './Badge';
import { theme } from '../theme/theme';
import { Shield } from 'lucide-react-native';

interface ConfidenceCardProps {
  completenessPct?: number | null;
  confidenceLevel?: string | null;
  sourcesAvailable?: number | null;
  sourcesTotal?: number | null;
  statusFlags?: Record<string, string>;
  lang: 'en' | 'hi';
}

function confidenceColor(level?: string | null): string {
  switch (level) {
    case 'HIGH_CONFIDENCE':
    case 'HIGH':
      return theme.colors.success;
    case 'DEGRADED_CONFIDENCE':
    case 'DEGRADED':
    case 'REDUCED':
      return theme.colors.warning;
    case 'INSUFFICIENT_DATA':
    case 'UNAVAILABLE':
      return theme.colors.danger;
    default:
      return theme.colors.textMuted;
  }
}

export const ConfidenceCard: React.FC<ConfidenceCardProps> = ({
  completenessPct,
  confidenceLevel,
  sourcesAvailable,
  sourcesTotal,
  statusFlags,
  lang,
}) => {
  const isEn = lang === 'en';
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Shield size={18} color={theme.colors.primary} />
        <Typography variant="h3" style={styles.ml} weight="bold">
          {isEn ? 'DATA CONFIDENCE' : 'डेटा विश्वसनीयता'}
        </Typography>
      </View>

      <View style={styles.body}>
        <Typography variant="h1" color={confidenceColor(confidenceLevel)}>
          {completenessPct != null ? `${completenessPct.toFixed(0)}%` : '—'}
        </Typography>
        <View style={styles.right}>
          <Badge
            label={confidenceLevel?.replace(/_/g, ' ') ?? (isEn ? 'UNKNOWN' : 'अज्ञात')}
            variant={
              confidenceLevel === 'HIGH_CONFIDENCE' || confidenceLevel === 'HIGH' ? 'success' :
              confidenceLevel === 'DEGRADED_CONFIDENCE' || confidenceLevel === 'DEGRADED' || confidenceLevel === 'REDUCED' ? 'warning' : 'error'
            }
          />
          {sourcesAvailable != null && sourcesTotal != null && (
            <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
              {sourcesAvailable} of {sourcesTotal} {isEn ? 'sources available' : 'स्रोत उपलब्ध'}
            </Typography>
          )}
        </View>
      </View>

      <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
        {isEn
          ? 'Confidence reflects availability and completeness of supporting observations — not probability of disaster.'
          : 'विश्वसनीयता डेटा स्रोतों की उपलब्धता दर्शाती है — आपदा की संभावना नहीं।'}
      </Typography>

      {statusFlags && (
        <View style={styles.flagsGrid}>
          {Object.entries(statusFlags).map(([key, val]) => (
            <View key={key} style={styles.flagItem}>
              <Typography variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                {key.replace(/_/g, ' ').toUpperCase()}
              </Typography>
              <Typography
                variant="caption"
                weight="bold"
                color={val === 'AVAILABLE' || val === 'OPTIMAL' ? theme.colors.success : theme.colors.warning}
              >
                {val}
              </Typography>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: theme.spacing.sm },
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  right: { flex: 1, gap: 4, alignItems: 'flex-end' },
  mt2: { marginTop: 4 },
  flagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  flagItem: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: 2,
  },
});
