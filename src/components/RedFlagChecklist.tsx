import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RedFlagSymptom } from '../types/journey';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * The always-free "stop and contact your provider if..." checklist. This
 * must never be placed behind a paywall — see PRD "Safety Framework".
 */
export function RedFlagChecklist({ symptoms }: { symptoms: RedFlagSymptom[] }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Stop and contact your provider if you experience:</Text>
      {symptoms.map((symptom) => (
        <View key={symptom.id} style={styles.item}>
          <Text style={styles.itemLabel}>{symptom.label}</Text>
          <Text style={styles.itemGuidance}>{symptom.guidance}</Text>
        </View>
      ))}
      <Text style={styles.footnote}>
        When in doubt, always contact your provider or emergency services. This list is not exhaustive.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: spacing.sm,
  },
  heading: { ...typography.heading, color: colors.danger, marginBottom: spacing.xs },
  item: { marginBottom: spacing.sm },
  itemLabel: { ...typography.body, fontWeight: '700', color: colors.text },
  itemGuidance: { ...typography.body, fontSize: 13, color: colors.textMuted },
  footnote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
