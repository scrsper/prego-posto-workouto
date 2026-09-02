import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Standing medical disclaimer. Rendered on every safety-relevant screen
 * (exercise detail, safety checklist, check-in, kick counter, contraction
 * timer). Never gate this behind a paywall or dismiss-forever control.
 */
export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={styles.text}>
        This app is educational and does not replace medical advice. Always follow guidance from your
        own OB, midwife, or physical therapist, and stop any activity that causes pain or discomfort.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerCompact: {
    padding: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
