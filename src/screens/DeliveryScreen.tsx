import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addWeeks, startOfDay } from 'date-fns';
import type { RootStackScreenProps } from '../navigation/types';
import type { DeliveryType } from '../types/journey';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { Card, Chip, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { haptics } from '../utils/haptics';
import { colors, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'Delivery'>;

const DELIVERY_TYPES: { value: DeliveryType; label: string }[] = [
  { value: 'vaginal', label: 'Vaginal birth' },
  { value: 'cesarean', label: 'Cesarean (C-section)' },
  { value: 'unknown', label: 'Prefer not to say' },
];

/** Records the actual birth date and delivery type, which anchor postpartum weeks and recovery content. */
export function DeliveryScreen({ navigation }: Props) {
  const { journey } = useJourneyContext();
  const recordDelivery = useJourneyStore((state) => state.recordDelivery);
  const today = startOfDay(new Date());

  const [date, setDate] = useState(() => {
    if (journey?.actualDeliveryDate) return new Date(journey.actualDeliveryDate);
    const due = journey?.estimatedDueDate ? new Date(journey.estimatedDueDate) : today;
    return due > today ? today : due;
  });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(journey?.deliveryType ?? 'unknown');

  if (!journey) {
    return (
      <ScreenContainer>
        <Muted>Start a Journey first.</Muted>
      </ScreenContainer>
    );
  }

  function handleSave() {
    if (!journey) return;
    recordDelivery(journey.id, startOfDay(date).toISOString(), deliveryType);
    haptics.success();
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={typography.title} accessibilityRole="header">
        {journey.actualDeliveryDate ? 'Birth details' : 'Welcome, little one'}
      </Text>
      <Muted>Your postpartum weeks count from this date, and recovery routines adapt to your delivery type.</Muted>

      <Card>
        <SectionTitle>Birth date</SectionTitle>
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          minimumDate={addWeeks(today, -52)}
          maximumDate={today}
          accentColor={colors.primary}
          themeVariant="light"
          onValueChange={(_, value) => setDate(startOfDay(value))}
        />
      </Card>

      <Card>
        <SectionTitle>Delivery type</SectionTitle>
        <View style={styles.chips}>
          {DELIVERY_TYPES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={deliveryType === option.value}
              onPress={() => setDeliveryType(option.value)}
            />
          ))}
        </View>
        {deliveryType === 'cesarean' ? (
          <Text style={styles.note}>
            C-section recovery content (like scar mobilization) only appears once you’re at least 6 weeks postpartum
            and should wait for your provider’s OK that your incision has healed.
          </Text>
        ) : null}
      </Card>

      <PrimaryButton label="Save birth details" onPress={handleSave} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { ...typography.caption, color: colors.warning, lineHeight: 18 },
});
