import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { colors, radii, spacing, typography } from '../theme/theme';
import { haptics } from '../utils/haptics';

/**
 * Screen wrapper. The native SafeAreaView only pads the edges a view
 * actually overlaps, so this is correct both under a native-stack header
 * (top inset 0) and on header-less tab screens (clears the Dynamic Island).
 */
export function ScreenContainer({
  children,
  scroll = true,
  largeTitle,
  subtitle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** iOS-style large title rendered at the top of header-less (tab) screens. */
  largeTitle?: string;
  subtitle?: string;
}) {
  const header = largeTitle ? (
    <View style={styles.largeTitleBlock}>
      <Text style={styles.largeTitle} accessibilityRole="header">
        {largeTitle}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flexOne, styles.plainContent]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: SFSymbol;
  tone?: 'primary' | 'danger' | 'premium';
  accessibilityHint?: string;
};

const toneColor = { primary: colors.primary, danger: colors.danger, premium: colors.premium };

export function PrimaryButton({ label, onPress, disabled, style, icon, tone = 'primary', accessibilityHint }: ButtonProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: toneColor[tone] },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} size={18} tintColor="#fff" style={styles.buttonIcon} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style, icon, tone = 'primary', accessibilityHint }: ButtonProps) {
  const color = toneColor[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        styles.secondaryButton,
        { borderColor: color },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} size={18} tintColor={color} style={styles.buttonIcon} /> : null}
      <Text style={[styles.secondaryButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Text-only button, e.g. "Restore purchases". */
export function LinkButton({ label, onPress, color = colors.primary }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
    >
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.sectionTitle, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'primary',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'primary' | 'danger';
}) {
  const color = tone === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? color : colors.border, backgroundColor: selected ? color : colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Settings-style tappable row with an SF Symbol and a chevron. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  onPress,
  trailing,
  destructive,
}: {
  title: string;
  subtitle?: string;
  icon?: SFSymbol;
  iconColor?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.danger : iconColor }]}>
          <SymbolView name={icon} size={16} tintColor="#fff" />
        </View>
      ) : null}
      <View style={styles.flexOne}>
        <Text style={[styles.rowTitle, destructive && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <SymbolView name="chevron.right" size={14} tintColor={colors.textMuted} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function RowDivider() {
  return <View style={styles.divider} />;
}

export function StatTile({ value, label, color = colors.primaryDark }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statTile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  plainContent: { padding: spacing.md, gap: spacing.sm },
  largeTitleBlock: { gap: 2, marginTop: spacing.sm },
  largeTitle: { ...typography.largeTitle, color: colors.text },
  subtitle: { ...typography.body, color: colors.primaryDark, fontWeight: '600' },
  button: {
    minHeight: 50,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonIcon: { width: 18, height: 18 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', ...typography.body, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
  secondaryButtonText: { ...typography.body, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  linkButton: { alignSelf: 'center', paddingVertical: spacing.xs },
  linkText: { ...typography.caption, fontWeight: '600', textDecorationLine: 'underline' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: '#5A3A4A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: { ...typography.caption, textTransform: 'capitalize' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  rowPressed: { opacity: 0.6 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...typography.body, fontSize: 16, color: colors.text, fontWeight: '500' },
  rowSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 46 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
