import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { theme } from '../theme/theme';
import { Languages, Info, ShieldAlert } from 'lucide-react-native';
import { t } from '../i18n/strings';

interface SettingsScreenProps {
  lang: 'en' | 'hi';
  onLangChange: (lang: 'en' | 'hi') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ lang, onLangChange }) => {
  const isEn = lang === 'en';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Typography variant="h2">{t(lang, 'settings')}</Typography>
        <Typography variant="caption" color={theme.colors.textMuted}>
          User Preferences & Localization
        </Typography>
      </View>

      {/* Language Section */}
      <Card style={styles.card}>
        <View style={styles.row}>
          <Languages size={18} color={theme.colors.primary} />
          <Typography variant="h3" style={styles.ml} weight="bold">
            {t(lang, 'language')}
          </Typography>
        </View>
        <View style={styles.divider} />
        <View style={styles.langOptions}>
          <TouchableOpacity
            style={[styles.langBtn, isEn && styles.langBtnActive]}
            onPress={() => onLangChange('en')}
          >
            <Typography variant="body" color={isEn ? '#fff' : theme.colors.textSecondary} weight="bold">
              {t(lang, 'english')}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, !isEn && styles.langBtnActive]}
            onPress={() => onLangChange('hi')}
          >
            <Typography variant="body" color={!isEn ? '#fff' : theme.colors.textSecondary} weight="bold">
              {t(lang, 'hindi')}
            </Typography>
          </TouchableOpacity>
        </View>
      </Card>

      {/* About Section */}
      <Card style={styles.card}>
        <View style={styles.row}>
          <Info size={18} color={theme.colors.textMuted} />
          <Typography variant="h3" style={styles.ml} weight="bold">
            {t(lang, 'about')}
          </Typography>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Typography variant="caption" color={theme.colors.textMuted}>{t(lang, 'version')}</Typography>
          <Typography variant="body" weight="semibold">4.1.0-alpha</Typography>
        </View>
        <View style={styles.infoRow}>
          <Typography variant="caption" color={theme.colors.textMuted}>Engine Build</Typography>
          <Typography variant="body" weight="semibold">v4.2-multimodal</Typography>
        </View>
        <View style={styles.infoRow}>
          <Typography variant="caption" color={theme.colors.textMuted}>Geospatial Domain</Typography>
          <Typography variant="body" weight="semibold">NER (India)</Typography>
        </View>
      </Card>

      <Card style={[styles.card, styles.alertCard]}>
        <View style={styles.row}>
          <ShieldAlert size={18} color={theme.colors.warning} />
          <Typography variant="label" color={theme.colors.warning} style={styles.ml}>
            OPERATIONAL DISCLAIMER
          </Typography>
        </View>
        <Typography variant="caption" color={theme.colors.textSecondary}>
          Distress broadcasts (SOS) will trigger emergency SMS/call simulation dispatching to registered responders.
          All ML alerts are advisory based on available satellite and meteorological telemetry.
        </Typography>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  header: { marginBottom: theme.spacing.xs },
  card: { gap: theme.spacing.sm },
  alertCard: { borderColor: theme.colors.warning, borderWidth: 1, backgroundColor: 'rgba(234, 179, 8, 0.05)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  langOptions: { flexDirection: 'row', gap: theme.spacing.md },
  langBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
