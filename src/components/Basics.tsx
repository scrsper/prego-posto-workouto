import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../theme/theme';

export function ScreenContainer({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Wrapper
        style={styles.flexOne}
        contentContainerStyle={scroll ? styles.scrollContent : styles.plainContent}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled, style]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.secondaryButton, disabled && styles.secondaryButtonDisabled, style]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

/**
 * A small pill-shaped toggle used for mood/symptom/tag selection. Visually
 * compact (its padding alone is well under the ~44pt minimum touch target),
 * so `hitSlop` extends the actual tappable area without changing how it
 * looks — this matters most on screens like the daily check-in, which are
 * dense with these. `accessibilityState.selected` is what lets VoiceOver/
 * TalkBack announce "selected" — without it, a screen-reader user has no
 * way to tell a chip's toggle state apart from its label text.
 */
export function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  plainContent: { flex: 1, padding: spacing.md },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', ...typography.body, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  secondaryButtonDisabled: { opacity: 0.5 },
  secondaryButtonText: { color: colors.primary, ...typography.body, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextSelected: { color: '#fff' },
});
