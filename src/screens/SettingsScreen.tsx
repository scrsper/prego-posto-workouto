import React, { useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { hasJourneyPass } from '../premium/entitlements';
import { openManageSubscriptions } from '../premium/billing';
import { cancelAllReminders, cancelReminder, scheduleDailyReminder } from '../notifications/reminders';
import { buildProviderSummary } from '../utils/tracking';
import { APP_CONFIG } from '../config';
import { Card, Chip, ListRow, Muted, RowDivider, ScreenContainer, SectionTitle } from '../components/Basics';
import { PremiumBadge } from '../components/PremiumGate';
import { colors, spacing, typography } from '../theme/theme';

const PERSONALIZATION_TAGS: { value: string; label: string }[] = [
  { value: 'diastasis-recti-mild', label: 'Diastasis recti — mild' },
  { value: 'diastasis-recti-moderate', label: 'Diastasis recti — moderate' },
  { value: 'diastasis-recti-severe', label: 'Diastasis recti — severe' },
  { value: 'twins-or-multiples', label: 'Twins or multiples' },
  { value: 'high-risk-pregnancy', label: 'High-risk pregnancy' },
];

function formatTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SettingsScreen({ navigation }: MainTabScreenProps<'Settings'>) {
  const { journey, phase, isPremium } = useJourneyContext();
  const setPersonalizationTags = useJourneyStore((state) => state.setPersonalizationTags);
  const archiveJourney = useJourneyStore((state) => state.archiveJourney);
  const entitlement = useJourneyStore((state) => state.entitlement);
  const reminders = useJourneyStore((state) => state.reminders);
  const setReminders = useJourneyStore((state) => state.setReminders);
  const resetAllData = useJourneyStore((state) => state.resetAllData);
  const [reminderBusy, setReminderBusy] = useState(false);

  function toggleTag(tag: string) {
    if (!journey) return;
    const tags = journey.personalizationTags.includes(tag)
      ? journey.personalizationTags.filter((t) => t !== tag)
      : [
          // Diastasis severities are mutually exclusive.
          ...journey.personalizationTags.filter((t) => !(tag.startsWith('diastasis-recti') && t.startsWith('diastasis-recti'))),
          tag,
        ];
    setPersonalizationTags(journey.id, tags);
  }

  async function updateReminder(enabled: boolean, hour = reminders.hour, minute = reminders.minute) {
    setReminderBusy(true);
    try {
      if (!enabled) {
        await cancelReminder(reminders.scheduledNotificationId);
        setReminders({ ...reminders, enabled: false, hour, minute, scheduledNotificationId: null });
        return;
      }
      const id = await scheduleDailyReminder(hour, minute, reminders.scheduledNotificationId);
      if (!id) {
        setReminders({ ...reminders, enabled: false, scheduledNotificationId: null });
        Alert.alert('Notifications are off', 'To get reminders, allow notifications for Prego Posto in iOS Settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      setReminders({ enabled: true, hour, minute, scheduledNotificationId: id });
    } catch {
      Alert.alert('Couldn’t schedule reminder', 'Please try again.');
    } finally {
      setReminderBusy(false);
    }
  }

  function handleArchive() {
    if (!journey) return;
    Alert.alert('End this Journey?', 'It will be archived — never deleted — and you can start a new one any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Journey',
        style: 'destructive',
        onPress: () => {
          archiveJourney(journey.id);
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  }

  function shareProviderSummary() {
    if (!journey || !phase) return;
    if (!isPremium) {
      navigation.navigate('Paywall');
      return;
    }
    const state = useJourneyStore.getState();
    const message = buildProviderSummary({
      journey,
      phase,
      checkIns: state.dailyCheckIns.filter((c) => c.journeyId === journey.id),
      workouts: state.workoutSessions.filter((w) => w.journeyId === journey.id),
      kickSessions: state.kickCountSessions.filter((k) => k.journeyId === journey.id),
      contractionSessions: state.contractionSessions.filter((c) => c.journeyId === journey.id),
      now: new Date(),
    });
    void Share.share({ message, title: 'Provider visit summary' });
  }

  function exportAllData() {
    const state = useJourneyStore.getState();
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Prego Posto',
      journeys: state.journeys,
      dailyCheckIns: state.dailyCheckIns,
      workoutSessions: state.workoutSessions,
      kickCountSessions: state.kickCountSessions,
      contractionSessions: state.contractionSessions,
    };
    void Share.share({ message: JSON.stringify(payload, null, 2), title: 'Prego Posto data export' });
  }

  function confirmDeleteAll() {
    Alert.alert(
      'Delete all data?',
      'This permanently erases every Journey, check-in, workout, and tracking session from this iPhone. It can’t be undone. Purchases stay with your Apple ID and can be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void cancelAllReminders().catch(() => {});
            resetAllData();
            navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          },
        },
      ]
    );
  }

  const plan =
    journey && hasJourneyPass(entitlement, journey.id)
      ? 'Journey Pass (this Journey)'
      : entitlement.subscriptionActive
        ? 'Monthly subscription'
        : 'Free';

  return (
    <ScreenContainer largeTitle="Settings">
      {journey ? (
        <Card>
          <SectionTitle>{journey.displayName}</SectionTitle>
          <View>
            {journey.conceptionMode === 'trying_to_conceive' && !journey.estimatedDueDate ? (
              <ListRow
                title="Add due date"
                icon="calendar.badge.plus"
                onPress={() => navigation.navigate('NewJourney', { updateJourneyId: journey.id })}
              />
            ) : (
              <ListRow
                title="Birth details"
                subtitle={
                  journey.actualDeliveryDate
                    ? `${new Date(journey.actualDeliveryDate).toLocaleDateString()} · ${
                        journey.deliveryType === 'cesarean' ? 'Cesarean' : journey.deliveryType === 'vaginal' ? 'Vaginal' : 'Type not set'
                      }`
                    : 'Add once your baby arrives'
                }
                icon="heart.fill"
                onPress={() => navigation.navigate('Delivery')}
              />
            )}
            <RowDivider />
            <ListRow
              title="Provider clearance"
              subtitle={
                journey.clearanceAcknowledgment
                  ? `Confirmed ${new Date(journey.clearanceAcknowledgment.acknowledgedAt).toLocaleDateString()}`
                  : 'Required for advanced exercises'
              }
              icon="checkmark.shield.fill"
              onPress={() => navigation.navigate('ClearanceAcknowledgment')}
            />
            <RowDivider />
            <ListRow
              title="Provider visit summary"
              subtitle="Share your last 14 days with your OB, midwife, or PT"
              icon="square.and.arrow.up"
              trailing={isPremium ? undefined : <PremiumBadge />}
              onPress={shareProviderSummary}
            />
          </View>
        </Card>
      ) : null}

      {journey ? (
        <Card>
          <SectionTitle>About you</SectionTitle>
          <Muted style={typography.caption}>
            Used on this device only to filter out exercises that don’t fit you, and (with Premium) to personalize your
            routine.
          </Muted>
          <View style={styles.chips}>
            {PERSONALIZATION_TAGS.map((tag) => (
              <Chip
                key={tag.value}
                label={tag.label}
                selected={journey.personalizationTags.includes(tag.value)}
                onPress={() => toggleTag(tag.value)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Daily reminder</SectionTitle>
        <ListRow
          title="Check-in reminder"
          subtitle={reminders.enabled ? `Every day at ${formatTime(reminders.hour, reminders.minute)}` : 'Off'}
          icon="bell.fill"
          trailing={
            <Switch
              value={reminders.enabled}
              disabled={reminderBusy}
              onValueChange={(value) => void updateReminder(value)}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Daily check-in reminder"
            />
          }
        />
        {reminders.enabled ? (
          <View style={styles.timeRow}>
            <Text style={typography.body}>Time</Text>
            <DateTimePicker
              value={(() => {
                const d = new Date();
                d.setHours(reminders.hour, reminders.minute, 0, 0);
                return d;
              })()}
              mode="time"
              display="compact"
              minuteInterval={5}
              accentColor={colors.primary}
              themeVariant="light"
              onValueChange={(_, date) => void updateReminder(true, date.getHours(), date.getMinutes())}
            />
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Premium</SectionTitle>
        <View>
          <ListRow title="Plan" subtitle={plan} icon="sparkles" iconColor={colors.premium} onPress={() => navigation.navigate('Paywall')} />
          {entitlement.subscriptionActive ? (
            <>
              <RowDivider />
              <ListRow
                title="Manage subscription"
                icon="creditcard.fill"
                iconColor={colors.premium}
                onPress={() => void openManageSubscriptions()}
              />
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionTitle>Your data</SectionTitle>
        <View>
          <ListRow title="Journey history" icon="archivebox.fill" onPress={() => navigation.navigate('JourneyArchive')} />
          <RowDivider />
          <ListRow title="Privacy" subtitle="Everything stays on this iPhone" icon="hand.raised.fill" onPress={() => navigation.navigate('Privacy')} />
          <RowDivider />
          <ListRow title="Export all data" icon="square.and.arrow.up.fill" onPress={exportAllData} />
          {journey ? (
            <>
              <RowDivider />
              <ListRow title="End current Journey" subtitle="Archive it now — nothing is deleted" icon="flag.checkered" onPress={handleArchive} />
            </>
          ) : null}
          <RowDivider />
          <ListRow title="Delete all data" icon="trash.fill" destructive onPress={confirmDeleteAll} />
        </View>
      </Card>

      <Card>
        <SectionTitle>About</SectionTitle>
        <Muted>
          Prego Posto is educational and does not replace medical advice. Always follow your own OB, midwife, or physical
          therapist.
        </Muted>
        {APP_CONFIG.supportEmail ? (
          <ListRow
            title="Contact support"
            icon="envelope.fill"
            onPress={() => void Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}
          />
        ) : null}
        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '—'}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 46 },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
