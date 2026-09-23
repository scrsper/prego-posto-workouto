import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { RED_FLAG_SYMPTOMS } from '../data/redFlagSymptoms';
import { RedFlagChecklist } from '../components/RedFlagChecklist';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Card, ListRow, Muted, PrimaryButton, RowDivider, ScreenContainer, SecondaryButton, SectionTitle } from '../components/Basics';
import { useJourneyContext } from '../state/hooks';
import { colors } from '../theme/theme';

type Props = RootStackScreenProps<'SafetyChecklist'>;

function call(number: string, label: string) {
  Linking.openURL(`tel:${number}`).catch(() => Alert.alert(label, `Dial ${number} from your phone.`));
}

/** Always free. Never gate anything on this screen behind premium. */
export function SafetyChecklistScreen({ navigation }: Props) {
  const { phase } = useJourneyContext();
  const period = phase?.kind === 'postpartum' ? 'postpartum' : phase?.kind === 'prenatal' ? 'prenatal' : null;
  // Most relevant first, but every sign stays visible.
  const symptoms = period
    ? [...RED_FLAG_SYMPTOMS].sort((a, b) => Number(a.appliesTo !== period && a.appliesTo !== 'both') - Number(b.appliesTo !== period && b.appliesTo !== 'both'))
    : RED_FLAG_SYMPTOMS;

  return (
    <ScreenContainer>
      <Card style={styles.emergency}>
        <SectionTitle style={{ color: colors.danger }}>In an emergency, call 911</SectionTitle>
        <PrimaryButton label="Call 911" icon="phone.fill" tone="danger" onPress={() => call('911', 'Call 911')} />
        <View>
          <ListRow
            title="988 Suicide & Crisis Lifeline"
            subtitle="Call or text 988, 24/7"
            icon="message.fill"
            iconColor={colors.danger}
            onPress={() => call('988', '988 Lifeline')}
          />
          <RowDivider />
          <ListRow
            title="National Maternal Mental Health Hotline"
            subtitle="1-833-852-6262 · call or text, 24/7"
            icon="phone.fill"
            iconColor={colors.primary}
            onPress={() => call('18338526262', 'Maternal Mental Health Hotline')}
          />
        </View>
        <Muted style={styles.small}>US numbers. Outside the US, call your local emergency number.</Muted>
      </Card>

      <RedFlagChecklist symptoms={symptoms} />

      <Card>
        <SectionTitle>Ready for more intense programs?</SectionTitle>
        <Muted>Before advanced/progression exercises unlock, we ask you to confirm your provider has cleared you for exercise.</Muted>
        <SecondaryButton label="Provider clearance" onPress={() => navigation.navigate('ClearanceAcknowledgment')} />
      </Card>
      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emergency: { borderColor: colors.danger, borderWidth: 1.5, backgroundColor: colors.dangerSurface },
  small: { fontSize: 12, lineHeight: 16 },
});
