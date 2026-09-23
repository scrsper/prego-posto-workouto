import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { Card, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { haptics } from '../utils/haptics';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'ClearanceAcknowledgment'>;

export function ClearanceAcknowledgmentScreen({ navigation }: Props) {
  const { journey } = useJourneyContext();
  const recordClearanceAcknowledgment = useJourneyStore((state) => state.recordClearanceAcknowledgment);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState('');

  const acknowledgment = journey?.clearanceAcknowledgment ?? null;

  function handleConfirm() {
    if (!journey) return;
    recordClearanceAcknowledgment(journey.id, { acknowledgedAt: new Date().toISOString(), note: note.trim() });
    haptics.success();
    navigation.goBack();
  }

  if (!journey) {
    return (
      <ScreenContainer>
        <Muted>Start a Journey first.</Muted>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {acknowledgment ? (
        <Card>
          <SectionTitle>You’re all set</SectionTitle>
          <Muted>
            You confirmed clearance on {new Date(acknowledgment.acknowledgedAt).toLocaleDateString()}. Advanced programs are
            unlocked for this Journey{acknowledgment.note ? ` — your note: “${acknowledgment.note}”` : ''}.
          </Muted>
          <Muted>If your provider changes your restrictions, follow their guidance over anything in this app.</Muted>
        </Card>
      ) : (
        <>
          <Muted>
            Advanced progressions assume a higher baseline of readiness. Please confirm the following before we unlock them.
          </Muted>

          <Pressable
            onPress={() => {
              haptics.selection();
              setChecked((v) => !v);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked ? <SymbolView name="checkmark" size={16} tintColor="#fff" /> : null}
            </View>
            <Text style={styles.checkLabel}>
              I confirm I have been cleared for exercise by my OB, midwife, or physical therapist.
            </Text>
          </Pressable>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional: any restrictions your provider mentioned"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            style={styles.input}
            accessibilityLabel="Restrictions note"
          />

          <PrimaryButton label="Confirm clearance" onPress={handleConfirm} disabled={!checked} />
        </>
      )}

      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.sm },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkLabel: { ...typography.body, fontSize: 16, flex: 1, color: colors.text, lineHeight: 22 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    textAlignVertical: 'top',
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
