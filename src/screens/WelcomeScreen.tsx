import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const archivedJourneys = useJourneyStore((state) => state.archivedJourneys());

  const isReturning = archivedJourneys.length > 0;

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text style={typography.title}>{isReturning ? 'Welcome back' : 'Welcome'}</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          {isReturning
            ? 'Ready for another Journey? Your history and progress from before are safe and waiting for you whenever you want to look back.'
            : 'This app walks with you from pregnancy through 12 months postpartum — one continuous, safety-first Journey.'}
        </Text>
      </View>

      <Card>
        <Text style={typography.heading}>What’s a "Journey"?</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          A Journey starts when you enter a due date or say you’re trying to conceive, and runs through 12 months
          after delivery. Content adapts automatically to your trimester or postpartum week. When it ends, it’s
          archived — never deleted — and you can start a brand-new Journey any time.
        </Text>
      </Card>

      <PrimaryButton label="Start your Journey" onPress={() => navigation.navigate('NewJourney')} />

      {isReturning ? (
        <SecondaryButton
          label="View past Journeys"
          onPress={() => navigation.navigate('JourneyArchive')}
        />
      ) : null}

      <DisclaimerBanner />
    </ScreenContainer>
  );
}
