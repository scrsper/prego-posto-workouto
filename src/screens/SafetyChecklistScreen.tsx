import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { RED_FLAG_SYMPTOMS } from '../data/redFlagSymptoms';
import { RedFlagChecklist } from '../components/RedFlagChecklist';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Card, ScreenContainer, SecondaryButton } from '../components/Basics';
import { typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyChecklist'>;

export function SafetyChecklistScreen({ navigation }: Props) {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Safety checklist</Text>
      <RedFlagChecklist symptoms={RED_FLAG_SYMPTOMS} />
      <Card>
        <Text style={typography.heading}>Ready for more intense programs?</Text>
        <Text style={typography.body}>
          Before unlocking advanced/progression exercises, we ask you to confirm you’ve been cleared for exercise
          by your provider.
        </Text>
        <SecondaryButton
          label="Provider clearance acknowledgment"
          onPress={() => navigation.navigate('ClearanceAcknowledgment')}
        />
      </Card>
      <DisclaimerBanner />
    </ScreenContainer>
  );
}
