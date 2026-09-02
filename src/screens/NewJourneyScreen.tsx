import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { needsRenewalPrompt } from '../premium/entitlements';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { colors, radii, spacing, typography } from '../theme/theme';
import type { ConceptionMode } from '../types/journey';

type Props = NativeStackScreenProps<RootStackParamList, 'NewJourney'>;

export function NewJourneyScreen({ navigation }: Props) {
  const startNewJourney = useJourneyStore((state) => state.startNewJourney);
  const [mode, setMode] = useState<ConceptionMode>('due_date');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  /**
   * A Journey Pass never carries over (it's scoped to the Journey it was
   * bought for), and we can't detect or resurrect a subscription
   * automatically — so instead of a silent auto-resume, offer premium
   * again right after a returning purchaser starts a new Journey.
   */
  function finishJourneyCreation(newJourneyId: string) {
    const state = useJourneyStore.getState();
    const newJourney = state.journeys.find((j) => j.id === newJourneyId) ?? null;
    if (newJourney && needsRenewalPrompt(state.entitlement, newJourney)) {
      navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Paywall' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }

  function handleContinue() {
    if (mode === 'trying_to_conceive') {
      const newId = startNewJourney({ conceptionMode: 'trying_to_conceive', estimatedDueDate: null });
      finishJourneyCreation(newId);
      return;
    }

    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    if (!monthNum || !dayNum || !yearNum || year.length < 4) {
      Alert.alert('Enter a due date', 'Please enter a valid month, day, and 4-digit year.');
      return;
    }
    const dueDate = new Date(yearNum, monthNum - 1, dayNum);
    if (Number.isNaN(dueDate.getTime())) {
      Alert.alert('That date doesn’t look right', 'Please double-check the date and try again.');
      return;
    }
    const newId = startNewJourney({ conceptionMode: 'due_date', estimatedDueDate: dueDate.toISOString() });
    finishJourneyCreation(newId);
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Start a new Journey</Text>

      <Card>
        <Text style={typography.heading}>Where are you starting from?</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SecondaryButton
            label="I have a due date"
            onPress={() => setMode('due_date')}
            style={mode === 'due_date' ? { backgroundColor: colors.primary } : undefined}
          />
          <SecondaryButton
            label="Trying to conceive"
            onPress={() => setMode('trying_to_conceive')}
            style={mode === 'trying_to_conceive' ? { backgroundColor: colors.primary } : undefined}
          />
        </View>
      </Card>

      {mode === 'due_date' ? (
        <Card>
          <Text style={typography.heading}>Estimated due date</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              placeholder="MM"
              keyboardType="number-pad"
              maxLength={2}
              value={month}
              onChangeText={setMonth}
              style={inputStyle}
            />
            <TextInput
              placeholder="DD"
              keyboardType="number-pad"
              maxLength={2}
              value={day}
              onChangeText={setDay}
              style={inputStyle}
            />
            <TextInput
              placeholder="YYYY"
              keyboardType="number-pad"
              maxLength={4}
              value={year}
              onChangeText={setYear}
              style={[inputStyle, { flex: 1.4 }]}
            />
          </View>
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            Your Journey will run through 12 months after this date, then archive automatically.
          </Text>
        </Card>
      ) : (
        <Card>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            We’ll show trying-to-conceive content until you’re ready to add a due date from your Home screen.
          </Text>
        </Card>
      )}

      <PrimaryButton label="Begin my Journey" onPress={handleContinue} />
    </ScreenContainer>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  flex: 1,
  fontSize: 15,
  color: colors.text,
};
