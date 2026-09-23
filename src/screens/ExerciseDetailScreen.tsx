import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { EXERCISES } from '../data/exercises';
import { AnatomicalFigure } from '../components/AnatomicalFigure';
import { SafetyTag, SafetyWarnings, isExerciseSafeForPhase } from '../components/SafetyTag';
import { PremiumLockedNotice } from '../components/PremiumGate';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Card, PrimaryButton, ScreenContainer } from '../components/Basics';
import { phaseLabel, resolveJourneyPhase } from '../utils/pregnancyDates';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { colors, spacing, typography } from '../theme/theme';
import { MUSCLE_GROUP_LABELS } from '../components/anatomy/muscleGeometry';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route, navigation }: Props) {
  const exercise = EXERCISES.find((item) => item.id === route.params.exerciseId);
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);

  if (!exercise) {
    return (
      <ScreenContainer>
        <Text style={typography.body}>Exercise not found.</Text>
      </ScreenContainer>
    );
  }

  const isPremiumActive = isPremiumActiveForJourney(entitlement, activeJourney);
  const phase = activeJourney ? resolveJourneyPhase(activeJourney) : null;
  const safe = phase ? isExerciseSafeForPhase(exercise.eligiblePhases, phase) : true;

  if (exercise.isPremium && !isPremiumActive) {
    return (
      <ScreenContainer>
        <Text style={typography.title}>{exercise.name}</Text>
        <PremiumLockedNotice onUpgradePress={() => navigation.navigate('Paywall')} />
      </ScreenContainer>
    );
  }

  const needsClearance = exercise.isPremium && !activeJourney?.clearanceAcknowledgment;
  if (needsClearance) {
    return (
      <ScreenContainer>
        <Text style={typography.title}>{exercise.name}</Text>
        <Card>
          <Text style={typography.heading}>Provider clearance required</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            More intense, advanced programs unlock once you confirm you’ve been cleared for exercise by your
            provider.
          </Text>
          <PrimaryButton
            label="Go to clearance acknowledgment"
            onPress={() => navigation.navigate('ClearanceAcknowledgment')}
          />
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>{exercise.name}</Text>

      <View style={{ alignItems: 'center' }}>
        <AnatomicalFigure
          variant={exercise.bodyVariant}
          highlightedMuscles={exercise.primaryMuscles}
          repTempoSeconds={exercise.repTempoSeconds}
          showCesareanScar={activeJourney?.deliveryType === 'cesarean'}
          exerciseName={exercise.name}
        />
      </View>

      <SafetyTag safe={safe} phaseLabel={phase ? phaseLabel(phase) : 'your journey'} />

      <Card>
        <Text style={typography.heading}>Muscles worked</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Primary: {exercise.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')}
          {exercise.secondaryMuscles.length > 0
            ? `\nSecondary: ${exercise.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')}`
            : ''}
        </Text>
      </Card>

      <Card>
        <Text style={typography.heading}>Steps</Text>
        {exercise.steps.map((step, index) => (
          <Text key={step} style={{ ...typography.body, color: colors.text }}>
            {index + 1}. {step}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={typography.heading}>Audio cue</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>{exercise.audioCueDescription}</Text>
      </Card>

      <SafetyWarnings avoidIf={exercise.avoidIf} modifyIf={exercise.modifyIf} />

      <DisclaimerBanner />
    </ScreenContainer>
  );
}
