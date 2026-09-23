import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { Card, PrimaryButton, ScreenContainer } from '../components/Basics';
import { colors, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'JourneyArchive'>;

export function JourneyArchiveScreen({ navigation }: Props) {
  const archivedJourneys = useJourneyStore((state) => state.archivedJourneys());
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const dailyCheckIns = useJourneyStore((state) => state.dailyCheckIns);
  const entitlement = useJourneyStore((state) => state.entitlement);
  const isPremium = isPremiumActiveForJourney(entitlement, activeJourney);

  return (
    <ScreenContainer>
      <Text style={typography.title}>Journey history</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        Every Journey you complete stays here permanently, even on the free tier.
      </Text>

      {archivedJourneys.length === 0 ? (
        <Card>
          <Text style={typography.heading}>Nothing archived yet</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            {activeJourney
              ? 'Your current Journey will show up here once it archives — automatically 12 months after delivery, or whenever you choose to end it early from Settings. Nothing is ever deleted.'
              : 'Once you complete a Journey, it stays here permanently — even on the free tier — so you can look back on it or compare it to a future pregnancy.'}
          </Text>
        </Card>
      ) : (
        archivedJourneys.map((journey) => {
          const checkInCount = dailyCheckIns.filter((c) => c.journeyId === journey.id).length;
          return (
            <Card key={journey.id}>
              <Text style={typography.heading}>{journey.displayName}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>
                {journey.estimatedDueDate ? `Due date: ${new Date(journey.estimatedDueDate).toLocaleDateString()}` : 'No due date on file'}
                {'\n'}
                Archived: {journey.archivedAt ? new Date(journey.archivedAt).toLocaleDateString() : '—'}
                {'\n'}
                {checkInCount} daily check-ins logged
              </Text>
            </Card>
          );
        })
      )}

      {archivedJourneys.length > 1 ? (
        <Card style={isPremium ? { borderColor: colors.premium } : undefined}>
          <Text style={typography.heading}>Cross-Journey comparison</Text>
          {isPremium ? (
            <Text style={{ ...typography.body, color: colors.textMuted }}>
              Premium insight: compare recovery pace, check-in trends, and more across your Journeys. (Detailed
              charts are a great place to expand this screen next.)
            </Text>
          ) : (
            <>
              <Text style={{ ...typography.body, color: colors.textMuted }}>
                Premium unlocks comparing your recovery pace and trends across multiple pregnancies.
              </Text>
              <PrimaryButton label="See premium options" onPress={() => navigation.navigate('Paywall')} />
            </>
          )}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
