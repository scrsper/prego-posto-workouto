import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ClearanceAcknowledgment'>;

export function ClearanceAcknowledgmentScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const recordClearanceAcknowledgment = useJourneyStore((state) => state.recordClearanceAcknowledgment);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState('');

  const alreadyAcknowledged = !!activeJourney?.clearanceAcknowledgment;

  function handleConfirm() {
    if (!activeJourney) return;
    recordClearanceAcknowledgment(activeJourney.id, {
      acknowledgedAt: new Date().toISOString(),
      note,
    });
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Provider clearance</Text>

      {alreadyAcknowledged ? (
        <Card>
          <Text style={typography.heading}>You’re all set</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            You confirmed clearance on{' '}
            {new Date(activeJourney!.clearanceAcknowledgment!.acknowledgedAt).toLocaleDateString()}. Advanced
            programs are unlocked for this Journey.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={{ ...typography.body, color: colors.textMuted }}>
              More intense, advanced programs assume a higher baseline of readiness. Please confirm the
              following before we unlock them.
            </Text>
          </Card>

          <Pressable
            onPress={() => setChecked((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel="I confirm I have been cleared for exercise by my OB, midwife, or physical therapist."
            style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: radii.sm,
                borderWidth: 2,
                borderColor: colors.primary,
                backgroundColor: checked ? colors.primary : 'transparent',
              }}
            />
            <Text style={[typography.body, { flex: 1 }]}>
              I confirm I have been cleared for exercise by my OB, midwife, or physical therapist.
            </Text>
          </Pressable>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note (e.g. any restrictions your provider mentioned)"
            multiline
            style={{
              minHeight: 70,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.sm,
              padding: spacing.sm,
              textAlignVertical: 'top',
            }}
          />

          <PrimaryButton label="Confirm clearance" onPress={handleConfirm} disabled={!checked} />
        </>
      )}

      <DisclaimerBanner />
    </ScreenContainer>
  );
}
