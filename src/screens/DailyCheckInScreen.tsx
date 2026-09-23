import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { localDateKey, useJourneyContext } from '../state/hooks';
import { RED_FLAG_SYMPTOMS } from '../data/redFlagSymptoms';
import { Card, Chip, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { haptics } from '../utils/haptics';
import { colors, radii, spacing, typography } from '../theme/theme';
import type { DailyCheckIn } from '../types/journey';

type Props = RootStackScreenProps<'DailyCheckIn'>;

const MOODS: { value: DailyCheckIn['mood']; label: string }[] = [
  { value: 'great', label: '😊 Great' },
  { value: 'okay', label: '🙂 Okay' },
  { value: 'rough', label: '😕 Rough' },
  { value: 'struggling', label: '😣 Struggling' },
];

const PRENATAL_SYMPTOMS = ['Nausea', 'Fatigue', 'Back pain', 'Swelling', 'Heartburn', 'Trouble sleeping', 'Braxton Hicks', 'Pelvic discomfort'];
const POSTPARTUM_SYMPTOMS = ['Fatigue', 'Back pain', 'Trouble sleeping', 'Incision soreness', 'Perineal soreness', 'Breast soreness', 'Leaking urine', 'Mood changes'];

export function DailyCheckInScreen({ navigation }: Props) {
  const { journey, phase } = useJourneyContext();
  const addDailyCheckIn = useJourneyStore((state) => state.addDailyCheckIn);

  const [mood, setMood] = useState<DailyCheckIn['mood']>('okay');
  const [energyLevel, setEnergyLevel] = useState<DailyCheckIn['energyLevel']>(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const period = phase?.kind === 'postpartum' ? 'postpartum' : 'prenatal';
  const symptomOptions = period === 'postpartum' ? POSTPARTUM_SYMPTOMS : PRENATAL_SYMPTOMS;
  const flagOptions = RED_FLAG_SYMPTOMS.filter((flag) => flag.appliesTo === 'both' || flag.appliesTo === period);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleSave() {
    if (!journey) return;
    addDailyCheckIn({
      journeyId: journey.id,
      date: localDateKey(),
      mood,
      energyLevel,
      symptoms,
      redFlagsReported: redFlags,
      notes: notes.trim(),
    });
    if (redFlags.length > 0 || mood === 'struggling') {
      haptics.warning();
      Alert.alert(
        redFlags.length > 0 ? 'Please contact your provider' : 'You don’t have to go through this alone',
        redFlags.length > 0
          ? 'You logged a symptom that can need prompt medical attention. Please call your provider now, or 911 if it feels like an emergency.'
          : 'If you’re struggling, reach out to your provider. In the US you can call or text 988 any time, or the National Maternal Mental Health Hotline at 1-833-852-6262.',
        [
          { text: 'View warning signs', onPress: () => navigation.replace('SafetyChecklist') },
          { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }
    haptics.success();
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Card>
        <SectionTitle>How are you feeling?</SectionTitle>
        <View style={styles.chips}>
          {MOODS.map((m) => (
            <Chip key={m.value} label={m.label} selected={mood === m.value} onPress={() => setMood(m.value)} />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Energy</SectionTitle>
        <View style={styles.chips}>
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <Chip key={level} label={String(level)} selected={energyLevel === level} onPress={() => setEnergyLevel(level)} />
          ))}
        </View>
        <Muted style={typography.caption}>1 = running on empty · 5 = full of energy</Muted>
      </Card>

      <Card>
        <SectionTitle>Anything bothering you today?</SectionTitle>
        <View style={styles.chips}>
          {symptomOptions.map((symptom) => (
            <Chip key={symptom} label={symptom} selected={symptoms.includes(symptom)} onPress={() => toggle(symptoms, setSymptoms, symptom)} />
          ))}
        </View>
      </Card>

      <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
        <SectionTitle style={{ color: colors.danger }}>Any of these warning signs?</SectionTitle>
        <Muted style={typography.caption}>Select any that apply — we’ll point you to guidance right away.</Muted>
        <View style={styles.chips}>
          {flagOptions.map((flag) => (
            <Chip
              key={flag.id}
              label={flag.label}
              tone="danger"
              selected={redFlags.includes(flag.id)}
              onPress={() => toggle(redFlags, setRedFlags, flag.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Notes</SectionTitle>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else worth remembering or asking your provider?"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          style={styles.notes}
          accessibilityLabel="Notes"
        />
      </Card>

      <PrimaryButton label="Save check-in" onPress={handleSave} disabled={!journey} />
      {!journey ? <Text style={styles.hint}>Start a Journey to save check-ins.</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notes: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    textAlignVertical: 'top',
    fontSize: 16,
    color: colors.text,
  },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
