import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/theme';

/** A small inline badge marking a list item / card as premium-only. */
export function PremiumBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>Premium</Text>
    </View>
  );
}

/** Full-content lock, used when a free user opens a premium detail screen directly. */
export function PremiumLockedNotice({ onUpgradePress }: { onUpgradePress: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a premium feature</Text>
      <Text style={styles.body}>
        Unlock personalized programs, the full advanced exercise library, and more with premium.
      </Text>
      <Pressable style={styles.button} onPress={onUpgradePress}>
        <Text style={styles.buttonText}>See premium options</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.premiumSurface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { ...typography.caption, color: colors.premium, fontWeight: '700' },
  container: {
    backgroundColor: colors.premiumSurface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.premium },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.premium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  buttonText: { ...typography.body, color: '#fff', fontWeight: '700' },
});
