import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { RED_FLAG_SYMPTOMS } from '../data/redFlagSymptoms';
import { Card, PrimaryButton, ScreenContainer } from '../components/Basics';
import { colors, radii, spacing, typography } from '../theme/theme';
import type { DailyCheckIn } from '../types/journey';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyCheckIn'>;

const MOODS: DailyCheckIn['mood'][] = ['great', 'okay', 'rough', 'struggling'];
const COMMON_SYMPTOMS = [
  'Nausea',
  'Fatigue',
  'Back pain',
  'Swelling',
  'Trouble sleeping',
  'Braxton Hicks',
  'Incision soreness',
  'Mood changes',
];

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.surface,
      }}
    >
      <Text style={{ color: selected ? '#fff' : colors.text, ...typography.caption }}>{label}</Text>
    </Pressable>
  );
}

export function DailyCheckInScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const addDailyCheckIn = useJourneyStore((state) => state.addDailyCheckIn);

  const [mood, setMood] = useState<DailyCheckIn['mood']>('okay');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleSave() {
    if (!activeJourney) return;
    addDailyCheckIn({
      journeyId: activeJourney.id,
      date: new Date().toISOString().slice(0, 10),
      mood,
      energyLevel,
      symptoms,
      redFlagsReported: redFlags,
      notes,
    });
    if (redFlags.length > 0) {
      Alert.alert(
        'Please review your symptoms',
        'One or more symptoms you logged may need prompt medical attention. See the safety checklist for guidance and contact your provider if concerned.',
        [
          { text: 'View safety checklist', onPress: () => navigation.navigate('SafetyChecklist') },
          { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Daily check-in</Text>

      <Card>
        <Text style={typography.heading}>Mood</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MOODS.map((m) => (
            <ToggleChip key={m} label={m} selected={mood === m} onToggle={() => setMood(m)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={typography.heading}>Energy level</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((level) => (
            <ToggleChip
              key={level}
              label={String(level)}
              selected={energyLevel === level}
              onToggle={() => setEnergyLevel(level as 1 | 2 | 3 | 4 | 5)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={typography.heading}>Symptoms today</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {COMMON_SYMPTOMS.map((symptom) => (
            <ToggleChip
              key={symptom}
              label={symptom}
              selected={symptoms.includes(symptom)}
              onToggle={() => toggle(symptoms, setSymptoms, symptom)}
            />
          ))}
        </View>
      </Card>

      <Card style={{ borderColor: colors.danger }}>
        <Text style={[typography.heading, { color: colors.danger }]}>Any of these today?</Text>
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          Select any that apply — we’ll point you to guidance right away.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {RED_FLAG_SYMPTOMS.map((flag) => (
            <ToggleChip
              key={flag.id}
              label={flag.label}
              selected={redFlags.includes(flag.id)}
              onToggle={() => toggle(redFlags, setRedFlags, flag.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={typography.heading}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else worth remembering?"
          multiline
          style={{
            minHeight: 80,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            padding: spacing.sm,
            textAlignVertical: 'top',
          }}
        />
      </Card>

      <PrimaryButton label="Save check-in" onPress={handleSave} disabled={!activeJourney} />
    </ScreenContainer>
  );
}
