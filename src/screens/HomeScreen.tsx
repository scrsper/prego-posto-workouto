import React from 'react';
import { Text, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { phaseLabel, resolveJourneyPhase } from '../utils/pregnancyDates';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { colors, spacing, typography } from '../theme/theme';

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);

  if (!activeJourney) {
    return (
      <ScreenContainer>
        <Card>
          <Text style={typography.heading}>No active Journey</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Start a new Journey to get trimester- or postpartum-specific guidance.
          </Text>
          <PrimaryButton label="Start a Journey" onPress={() => navigation.navigate('NewJourney')} />
        </Card>
      </ScreenContainer>
    );
  }

  const phase = resolveJourneyPhase(activeJourney);
  const isPremium = isPremiumActiveForJourney(entitlement, activeJourney);

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.title}>{activeJourney.displayName}</Text>
        <Text style={{ ...typography.body, color: colors.primaryDark, fontWeight: '700' }}>
          {phaseLabel(phase)}
        </Text>
      </View>

      {phase.kind === 'trying_to_conceive' ? (
        <Card>
          <Text style={typography.heading}>Have a due date now?</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Add it any time to unlock trimester-specific content.
          </Text>
          <SecondaryButton label="Add due date" onPress={() => navigation.navigate('NewJourney')} />
        </Card>
      ) : null}

      <Card>
        <Text style={typography.heading}>Today</Text>
        <SecondaryButton label="Daily symptom check-in" onPress={() => navigation.navigate('DailyCheckIn')} />
        {phase.kind === 'prenatal' ? (
          <SecondaryButton label="Kick counter" onPress={() => navigation.navigate('KickCounter')} />
        ) : null}
        {phase.kind === 'prenatal' && phase.trimester === 3 ? (
          <SecondaryButton label="Contraction timer" onPress={() => navigation.navigate('ContractionTimer')} />
        ) : null}
      </Card>

      <Card style={{ borderColor: colors.danger }}>
        <Text style={[typography.heading, { color: colors.danger }]}>Safety first</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Free red-flag symptom guidance — always available.
        </Text>
        <SecondaryButton label="View safety checklist" onPress={() => navigation.navigate('SafetyChecklist')} />
      </Card>

      <Card style={isPremium ? { borderColor: colors.premium } : undefined}>
        <Text style={typography.heading}>{isPremium ? 'Premium is active' : 'Go premium'}</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          {isPremium
            ? 'You have access to personalized programs, the advanced exercise library, and more for this Journey.'
            : 'Unlock personalized programs, advanced progressions, and cross-Journey insights.'}
        </Text>
        <SecondaryButton
          label={isPremium ? 'Manage subscription' : 'See premium options'}
          onPress={() => navigation.navigate('Paywall')}
        />
      </Card>
    </ScreenContainer>
  );
}
