import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { APP_CONFIG } from '../config';
import { Card, LinkButton, Muted, ScreenContainer, SectionTitle } from '../components/Basics';
import { colors, typography } from '../theme/theme';

type Props = RootStackScreenProps<'Privacy'>;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Your health data stays on your iPhone',
    body:
      'Journeys, due and birth dates, check-ins, symptoms, notes, workouts, kick counts, and contraction timings are stored only on this device. There is no account, and we do not upload, sell, or share this information.',
  },
  {
    title: 'No ads, no tracking',
    body: 'Prego Posto contains no advertising, no analytics SDKs, and does not track you across apps or websites.',
  },
  {
    title: 'Purchases',
    body:
      'Purchases are processed by Apple. We use RevenueCat to verify them, which receives an anonymous app-generated ID and your App Store purchase receipts — never your health data.',
  },
  {
    title: 'Reminders',
    body: 'Daily reminders are scheduled locally on your iPhone. No push server is involved.',
  },
  {
    title: 'Sharing is always your choice',
    body:
      'The provider summary and data export are only created when you tap them, and go only where you send them from the iOS share sheet.',
  },
  {
    title: 'Deleting your data',
    body:
      'Settings → Delete all data permanently erases everything from this iPhone. Deleting the app does the same. iCloud/iTunes device backups may contain a copy until they are replaced.',
  },
];

export function PrivacyScreen(_props: Props) {
  return (
    <ScreenContainer>
      <Text style={typography.title} accessibilityRole="header">
        Privacy
      </Text>
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <SectionTitle>{section.title}</SectionTitle>
          <Muted>{section.body}</Muted>
        </Card>
      ))}
      {APP_CONFIG.privacyPolicyUrl ? (
        <LinkButton label="Full privacy policy" onPress={() => void Linking.openURL(APP_CONFIG.privacyPolicyUrl)} />
      ) : null}
      <Text style={styles.footer}>This app is not a medical device and does not provide medical advice.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
