import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, addMonths, addWeeks, format, startOfDay } from 'date-fns';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { needsRenewalPrompt } from '../premium/entitlements';
import { Card, Chip, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { PREGNANCY_LENGTH_DAYS } from '../utils/pregnancyDates';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'NewJourney'>;

type Mode = 'due_date' | 'last_period' | 'trying_to_conceive';

export function NewJourneyScreen({ navigation, route }: Props) {
  const updateJourneyId = route.params?.updateJourneyId;
  const startNewJourney = useJourneyStore((state) => state.startNewJourney);
  const setEstimatedDueDate = useJourneyStore((state) => state.setEstimatedDueDate);
  const hasActiveJourney = useJourneyStore((state) => !!state.activeJourneyId);

  const today = startOfDay(new Date());
  const [mode, setMode] = useState<Mode>('due_date');
  const [dueDate, setDueDate] = useState(() => addWeeks(today, 20));
  const [lastPeriod, setLastPeriod] = useState(() => addWeeks(today, -8));
  const [name, setName] = useState('');

  const computedDueDate = mode === 'last_period' ? addDays(lastPeriod, PREGNANCY_LENGTH_DAYS) : dueDate;

  /**
   * A Journey Pass never carries over and a lapsed subscription can't be
   * resumed automatically — so offer premium again right after a returning
   * purchaser starts a new Journey.
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
    const displayName = name.trim() || undefined;
    if (updateJourneyId) {
      setEstimatedDueDate(updateJourneyId, startOfDay(computedDueDate).toISOString());
      navigation.goBack();
      return;
    }
    if (mode === 'trying_to_conceive') {
      finishJourneyCreation(
        startNewJourney({ conceptionMode: 'trying_to_conceive', estimatedDueDate: null, displayName })
      );
      return;
    }
    finishJourneyCreation(
      startNewJourney({
        conceptionMode: 'due_date',
        estimatedDueDate: startOfDay(computedDueDate).toISOString(),
        displayName,
      })
    );
  }

  const modes: { value: Mode; label: string }[] = [
    { value: 'due_date', label: 'I know my due date' },
    { value: 'last_period', label: 'Use my last period' },
    ...(updateJourneyId ? [] : [{ value: 'trying_to_conceive' as const, label: 'Trying to conceive' }]),
  ];

  return (
    <ScreenContainer>
      <Text style={typography.title} accessibilityRole="header">
        {updateJourneyId ? 'Add your due date' : 'Start a new Journey'}
      </Text>

      <View style={styles.modes}>
        {modes.map((option) => (
          <Chip key={option.value} label={option.label} selected={mode === option.value} onPress={() => setMode(option.value)} />
        ))}
      </View>

      {mode === 'due_date' ? (
        <Card>
          <SectionTitle>Estimated due date</SectionTitle>
          <Muted>Already had your baby? Enter your due date anyway — postpartum content starts automatically.</Muted>
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="inline"
            minimumDate={addMonths(today, -12)}
            maximumDate={addWeeks(today, 42)}
            accentColor={colors.primary}
            themeVariant="light"
            onValueChange={(_, date) => setDueDate(startOfDay(date))}
          />
        </Card>
      ) : mode === 'last_period' ? (
        <Card>
          <SectionTitle>First day of your last period</SectionTitle>
          <DateTimePicker
            value={lastPeriod}
            mode="date"
            display="inline"
            minimumDate={addWeeks(today, -42)}
            maximumDate={today}
            accentColor={colors.primary}
            themeVariant="light"
            onValueChange={(_, date) => setLastPeriod(startOfDay(date))}
          />
          <View style={styles.computed}>
            <Text style={styles.computedLabel}>Estimated due date</Text>
            <Text style={styles.computedValue}>{format(computedDueDate, 'MMMM d, yyyy')}</Text>
          </View>
          <Muted style={typography.caption}>
            Based on a 28-day cycle. Your provider’s dating ultrasound is more accurate — you can update this later.
          </Muted>
        </Card>
      ) : (
        <Card>
          <Muted>
            We’ll show trying-to-conceive content. Add a due date from the Today tab whenever you’re ready — this
            same Journey carries on.
          </Muted>
        </Card>
      )}

      {!updateJourneyId ? (
        <Card>
          <SectionTitle>Name this Journey (optional)</SectionTitle>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Baby #2"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={40}
            returnKeyType="done"
            accessibilityLabel="Journey name"
          />
          {hasActiveJourney ? (
            <Text style={styles.note}>Your current Journey will be archived — never deleted — when this one starts.</Text>
          ) : (
            <Muted style={typography.caption}>
              Your Journey runs through 12 months after delivery, then archives automatically.
            </Muted>
          )}
        </Card>
      ) : null}

      <PrimaryButton label={updateJourneyId ? 'Save due date' : 'Begin my Journey'} onPress={handleContinue} />
      <DisclaimerBanner compact />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  computed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  computedLabel: { ...typography.body, color: colors.textMuted },
  computedValue: { ...typography.heading, color: colors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  note: { ...typography.caption, color: colors.warning, lineHeight: 18 },
});
