import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton, ToggleChip } from '../components/Basics';
import { colors, radii, spacing, typography } from '../theme/theme';
import type { DeliveryType } from '../types/journey';
import { DEMO_MODE_TAP_COUNT, DEMO_MODE_TAP_WINDOW_MS } from '../premium/demoMode';

const DELIVERY_TYPES: DeliveryType[] = ['vaginal', 'cesarean', 'unknown'];
const PERSONALIZATION_TAGS = [
  'diastasis-recti-mild',
  'diastasis-recti-moderate',
  'diastasis-recti-severe',
  'twins-or-multiples',
  'high-risk-pregnancy',
];

export function SettingsScreen({ navigation }: MainTabScreenProps<'Settings'>) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const updateJourneyDelivery = useJourneyStore((state) => state.updateJourneyDelivery);
  const setPersonalizationTags = useJourneyStore((state) => state.setPersonalizationTags);
  const archiveJourney = useJourneyStore((state) => state.archiveJourney);
  const entitlement = useJourneyStore((state) => state.entitlement);
  const tryEnableDemoMode = useJourneyStore((state) => state.tryEnableDemoMode);
  const disableDemoMode = useJourneyStore((state) => state.disableDemoMode);

  // Hidden App Store reviewer / QA unlock — tapping the app name/version
  // text below DEMO_MODE_TAP_COUNT times within DEMO_MODE_TAP_WINDOW_MS of
  // each other reveals a code entry field. See src/premium/demoMode.ts and
  // APP_REVIEW_NOTES.md. Deliberately not documented anywhere in the
  // visible UI — a real user tapping around normally should never trigger
  // or even notice this exists.
  const [aboutTapCount, setAboutTapCount] = useState(0);
  const [lastAboutTapAt, setLastAboutTapAt] = useState(0);
  const [showDemoCodeInput, setShowDemoCodeInput] = useState(false);
  const [demoCodeValue, setDemoCodeValue] = useState('');

  function handleAboutTap() {
    const now = Date.now();
    const withinWindow = now - lastAboutTapAt <= DEMO_MODE_TAP_WINDOW_MS;
    const nextCount = withinWindow ? aboutTapCount + 1 : 1;
    setAboutTapCount(nextCount);
    setLastAboutTapAt(now);
    if (nextCount >= DEMO_MODE_TAP_COUNT) {
      setShowDemoCodeInput(true);
      setAboutTapCount(0);
    }
  }

  function handleSubmitDemoCode() {
    const succeeded = tryEnableDemoMode(demoCodeValue.trim());
    setDemoCodeValue('');
    setShowDemoCodeInput(false);
    if (succeeded) {
      Alert.alert('Demo mode enabled', 'Premium features are unlocked on this device without a purchase.');
    } else {
      Alert.alert('Incorrect code', 'That code isn’t right.');
    }
  }

  function toggleTag(tag: string) {
    if (!activeJourney) return;
    const tags = activeJourney.personalizationTags.includes(tag)
      ? activeJourney.personalizationTags.filter((t) => t !== tag)
      : [...activeJourney.personalizationTags, tag];
    setPersonalizationTags(activeJourney.id, tags);
  }

  function handleArchive() {
    if (!activeJourney) return;
    Alert.alert('End this Journey?', 'It will be archived (not deleted) and you can start a new one any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Journey',
        style: 'destructive',
        onPress: () => {
          archiveJourney(activeJourney.id);
          navigation.navigate('Welcome');
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Settings</Text>

      {activeJourney ? (
        <>
          <Card>
            <Text style={typography.heading}>Delivery type</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              Drives premium C-section vs. vaginal recovery tracks.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DELIVERY_TYPES.map((type) => (
                <ToggleChip
                  key={type}
                  label={type}
                  selected={activeJourney.deliveryType === type}
                  onToggle={() => updateJourneyDelivery(activeJourney.id, activeJourney.actualDeliveryDate ?? new Date().toISOString(), type)}
                />
              ))}
            </View>
          </Card>

          <Card>
            <Text style={typography.heading}>Personalization</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              Drives premium personalized program branching.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {PERSONALIZATION_TAGS.map((tag) => (
                <ToggleChip
                  key={tag}
                  label={tag.replace(/-/g, ' ')}
                  selected={activeJourney.personalizationTags.includes(tag)}
                  onToggle={() => toggleTag(tag)}
                />
              ))}
            </View>
          </Card>
        </>
      ) : null}

      <Card>
        <Text style={typography.heading}>Account</Text>
        <SecondaryButton label="Journey history" onPress={() => navigation.navigate('JourneyArchive')} />
        <SecondaryButton label="Manage premium" onPress={() => navigation.navigate('Paywall')} />
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          {activeJourney && entitlement.journeyPassIds.includes(activeJourney.id)
            ? 'Plan: Journey Pass (this Journey)'
            : entitlement.subscriptionActive
              ? 'Plan: Monthly subscription (active)'
              : 'Plan: Free'}
        </Text>
      </Card>

      {activeJourney ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={[typography.heading, { color: colors.danger }]}>End current Journey</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Archives your current Journey now instead of waiting for the automatic 12-month-postpartum date.
          </Text>
          <SecondaryButton label="End this Journey" onPress={handleArchive} />
        </Card>
      ) : null}

      {entitlement.demoModeEnabled ? (
        <Card style={{ borderColor: colors.premium }}>
          <Text style={typography.heading}>Demo mode is ON</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Premium features are unlocked on this device without a purchase.
          </Text>
          <SecondaryButton label="Turn off demo mode" onPress={disableDemoMode} />
        </Card>
      ) : null}

      <Card>
        {/* Tapping this several times in a row reveals a hidden reviewer/QA
            unlock — see src/premium/demoMode.ts. Not documented anywhere
            visible on purpose. */}
        <Pressable onPress={handleAboutTap}>
          <Text style={typography.heading}>About</Text>
        </Pressable>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          This app is educational and does not replace medical advice. Content should be reviewed by a
          certified pre/postnatal fitness specialist or pelvic floor physical therapist before relying on it.
        </Text>
        {showDemoCodeInput ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              value={demoCodeValue}
              onChangeText={setDemoCodeValue}
              placeholder="Code"
              secureTextEntry
              autoFocus
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            />
            <PrimaryButton label="Submit" onPress={handleSubmitDemoCode} />
          </View>
        ) : null}
      </Card>
    </ScreenContainer>
  );
}
