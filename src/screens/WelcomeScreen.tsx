import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { RootStackScreenProps } from '../navigation/types';
import { useArchivedJourneys } from '../state/hooks';
import { Muted, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'Welcome'>;

const HIGHLIGHTS: { icon: SFSymbol; title: string; body: string }[] = [
  {
    icon: 'figure.mind.and.body',
    title: 'Guided daily routines',
    body: 'Short, voice- and haptic-guided sessions filtered to your trimester or postpartum week.',
  },
  {
    icon: 'heart.text.square.fill',
    title: 'Safety first, always free',
    body: 'Warning signs, “avoid if” and “modify if” notes on every exercise, and a stop button that means it.',
  },
  {
    icon: 'archivebox.fill',
    title: 'One Journey, kept forever',
    body: 'Pregnancy through 12 months postpartum. When it ends it’s archived — never deleted.',
  },
];

export function WelcomeScreen({ navigation }: Props) {
  const archivedJourneys = useArchivedJourneys();
  const isReturning = archivedJourneys.length > 0;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <SymbolView name="figure.and.child.holdinghands" size={44} tintColor="#fff" />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {isReturning ? 'Welcome back' : 'Prego Posto'}
        </Text>
        <Muted style={styles.center}>
          {isReturning
            ? 'Ready for another Journey? Everything from before is safe and waiting whenever you want to look back.'
            : 'Gentle, guided movement from pregnancy through your first year postpartum.'}
        </Muted>
      </View>

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((item) => (
          <View key={item.title} style={styles.highlight}>
            <SymbolView name={item.icon} size={28} tintColor={colors.primary} style={styles.highlightIcon} />
            <View style={styles.flexOne}>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Muted>{item.body}</Muted>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton label={isReturning ? 'Start a new Journey' : 'Start your Journey'} onPress={() => navigation.navigate('NewJourney')} />
      {isReturning ? (
        <SecondaryButton label="View past Journeys" onPress={() => navigation.navigate('JourneyArchive')} />
      ) : null}

      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.largeTitle, color: colors.text, textAlign: 'center' },
  highlights: { gap: spacing.md, marginVertical: spacing.md },
  highlight: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  highlightIcon: { width: 32, height: 32 },
  highlightTitle: { ...typography.heading, fontSize: 16, color: colors.text, marginBottom: 2 },
});
