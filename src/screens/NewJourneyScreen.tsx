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
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      Alert.alert('That date doesn’t look right', 'Month should be 1–12 and day should be 1–31.');
      return;
    }
    const dueDate = new Date(yearNum, monthNum - 1, dayNum);
    // JS Date silently rolls over an out-of-range day (e.g. Feb 30) into
    // the following month instead of producing an Invalid Date — a
    // round-trip check is the only reliable way to catch that, since
    // Number.isNaN(dueDate.getTime()) never fires for a rollover.
    const rolledOver =
      dueDate.getMonth() !== monthNum - 1 || dueDate.getDate() !== dayNum || dueDate.getFullYear() !== yearNum;
    if (Number.isNaN(dueDate.getTime()) || rolledOver) {
      Alert.alert('That date doesn’t look right', 'Please double-check the date and try again.');
      return;
    }
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (dueDate < oneYearAgo || dueDate > oneYearFromNow) {
      Alert.alert(
        'Double-check that year',
        'A due date is usually within about a year of today — please confirm the year you entered.'
      );
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
