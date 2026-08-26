import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Typography } from './Typography';
import { Badge } from './Badge';
import { theme } from '../theme/theme';
import { Activity } from 'lucide-react-native';

interface RiskCardProps {
  title: string;
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  probability?: number | null;
  advisory?: string | null;
  timestamp?: string;
  lang: 'en' | 'hi';
}

function riskColor(level?: string): string {
  switch (level) {
    case 'CRITICAL': return theme.colors.danger;
    case 'HIGH': return '#f97316';
    case 'MODERATE': return theme.colors.warning;
    case 'LOW': return theme.colors.success;
    default: return theme.colors.textMuted;
  }
}

export const RiskCard: React.FC<RiskCardProps> = ({
  title,
  riskLevel,
  probability,
  advisory,
  timestamp,
  lang,
}) => {
  const isEn = lang === 'en';
  return (
    <Card style={[styles.card, { borderColor: riskColor(riskLevel), borderWidth: 2 }]}>
      <View style={styles.header}>
        <Activity size={24} color={riskColor(riskLevel)} />
        <View style={styles.ml}>
          <Typography variant="h3" color={riskColor(riskLevel)} weight="bold">
            {riskLevel ?? (isEn ? 'UNKNOWN' : 'अज्ञात')}
          </Typography>
          <Typography variant="caption" color={theme.colors.textMuted}>
            {title}
          </Typography>
        </View>
        <View style={{ flex: 1 }} />
        {riskLevel && (
          <Badge
            label={riskLevel}
            variant={
              riskLevel === 'LOW' ? 'success' :
              riskLevel === 'MODERATE' ? 'warning' :
              'error'
            }
          />
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.cell}>
          <Typography variant="label" color={theme.colors.textMuted}>
            {isEn ? 'PROBABILITY' : 'संभावना'}
          </Typography>
          <Typography variant="h2" style={styles.mt2}>
            {probability != null ? `${(probability * 100).toFixed(1)}%` : (isEn ? 'UNOBSERVED' : 'अनवलोकित')}
          </Typography>
        </View>
      </View>

      {advisory && (
        <View style={[styles.advisoryBox, { borderLeftColor: riskColor(riskLevel) }]}>
          <Typography variant="caption" color={theme.colors.textSecondary}>
            {advisory}
          </Typography>
        </View>
      )}

      {timestamp && (
        <Typography variant="caption" color={theme.colors.textMuted} style={styles.mt2}>
          {isEn ? 'Assessed: ' : 'आकलन समय: '}
          {new Date(timestamp).toLocaleTimeString()}
        </Typography>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
  mt2: { marginTop: 4 },
  advisoryBox: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    paddingVertical: 4,
    marginTop: theme.spacing.xs,
  },
});
