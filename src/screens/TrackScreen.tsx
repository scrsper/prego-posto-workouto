import React from 'react';
import { Text } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { resolveJourneyPhase } from '../utils/pregnancyDates';
import { Card, ScreenContainer, SecondaryButton } from '../components/Basics';
import { colors, typography } from '../theme/theme';

export function TrackScreen({ navigation }: MainTabScreenProps<'Track'>) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const phase = activeJourney ? resolveJourneyPhase(activeJourney) : null;

  return (
    <ScreenContainer>
      <Text style={typography.title}>Track</Text>

      <Card>
        <Text style={typography.heading}>Daily symptom check-in</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          A quick, always-free way to log how you’re feeling today.
        </Text>
        <SecondaryButton label="Check in" onPress={() => navigation.navigate('DailyCheckIn')} disabled={!activeJourney} />
      </Card>

      {(!phase || phase.kind === 'prenatal') ? (
        <Card>
          <Text style={typography.heading}>Kick counter</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Count fetal movement and see how long it takes to reach your target.
          </Text>
          <SecondaryButton label="Open kick counter" onPress={() => navigation.navigate('KickCounter')} disabled={!activeJourney} />
        </Card>
      ) : null}

      {(!phase || phase.kind === 'prenatal') ? (
        <Card>
          <Text style={typography.heading}>Contraction timer</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Time duration and frequency of contractions.
          </Text>
          <SecondaryButton label="Open contraction timer" onPress={() => navigation.navigate('ContractionTimer')} disabled={!activeJourney} />
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
