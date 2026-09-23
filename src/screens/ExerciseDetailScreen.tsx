import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { EXERCISES } from '../data/exercises';
import { useJourneyContext } from '../state/hooks';
import { AnatomicalFigure } from '../components/AnatomicalFigure';
import { SafetyTag, SafetyWarnings } from '../components/SafetyTag';
import { PremiumLockedNotice } from '../components/PremiumGate';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Card, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { bodyVariantForPhase, phaseLabel } from '../utils/pregnancyDates';
import { isExerciseSafeForPhase } from '../utils/safety';
import { estimatedMinutes } from '../utils/workout';
import { MUSCLE_GROUP_LABELS } from '../components/anatomy/muscleGeometry';
import { colors, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'ExerciseDetail'>;

export function ExerciseDetailScreen({ route, navigation }: Props) {
  const exercise = EXERCISES.find((item) => item.id === route.params.exerciseId);
  const { journey, phase, isPremium } = useJourneyContext();

  if (!exercise) {
    return (
      <ScreenContainer>
        <Muted>Exercise not found.</Muted>
      </ScreenContainer>
    );
  }

  const safe = phase ? isExerciseSafeForPhase(exercise.eligiblePhases, phase) : true;

  if (exercise.isPremium && !isPremium) {
    return (
      <ScreenContainer>
        <Text style={typography.title}>{exercise.name}</Text>
        <PremiumLockedNotice onUpgradePress={() => navigation.navigate('Paywall')} />
      </ScreenContainer>
    );
  }

  if (exercise.isPremium && !journey?.clearanceAcknowledgment) {
    return (
      <ScreenContainer>
        <Text style={typography.title}>{exercise.name}</Text>
        <Card>
          <SectionTitle>Provider clearance required</SectionTitle>
          <Muted>
            Advanced progressions unlock once you confirm you’ve been cleared for exercise by your OB, midwife, or
            physical therapist.
          </Muted>
          <PrimaryButton label="Provider clearance" onPress={() => navigation.navigate('ClearanceAcknowledgment')} />
        </Card>
      </ScreenContainer>
    );
  }

  const rx = exercise.prescription;
  const rxLabel =
    rx.kind === 'reps'
      ? `${rx.sets} ${rx.sets === 1 ? 'set' : 'sets'} × ${rx.reps} reps`
      : `${rx.sets} ${rx.sets === 1 ? 'round' : 'rounds'} × ${rx.workSeconds}s`;

  return (
    <ScreenContainer>
      <Text style={typography.title} accessibilityRole="header">
        {exercise.name}
      </Text>
      <SafetyTag safe={safe} phaseLabel={phase ? phaseLabel(phase) : 'your Journey'} />

      <View
        style={styles.figure}
        accessible
        accessibilityLabel={`Illustration highlighting ${exercise.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')}`}
      >
        <AnatomicalFigure
          variant={bodyVariantForPhase(phase, exercise.bodyVariant)}
          highlightedMuscles={exercise.primaryMuscles}
          repTempoSeconds={exercise.repTempoSeconds}
          size={170}
          showCesareanScar={journey?.deliveryType === 'cesarean'}
        />
      </View>

      <Card>
        <View style={styles.rxRow}>
          <View style={styles.flexOne}>
            <SectionTitle>{rxLabel}</SectionTitle>
            <Muted>About {estimatedMinutes([exercise])} min, guided with voice and haptic cues</Muted>
          </View>
        </View>
        <PrimaryButton
          label={safe ? 'Start guided exercise' : 'Start anyway'}
          icon="play.fill"
          tone={safe ? 'primary' : 'danger'}
          onPress={() => navigation.navigate('WorkoutPlayer', { exerciseIds: [exercise.id], title: exercise.name })}
          accessibilityHint={safe ? undefined : 'This exercise is not tagged for your current phase'}
        />
        {!safe ? (
          <Text style={styles.cautionText}>
            This exercise isn’t tagged for your current phase. Check with your provider before trying it.
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>How to do it</SectionTitle>
        {exercise.steps.map((step, index) => (
          <Text key={step} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionTitle>Muscles worked</SectionTitle>
        <Muted>
          Primary: {exercise.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')}
          {exercise.secondaryMuscles.length > 0
            ? `\nSecondary: ${exercise.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')}`
            : ''}
        </Muted>
        <Muted style={styles.cue}>Pacing cue: {exercise.audioCueDescription}</Muted>
      </Card>

      <SafetyWarnings avoidIf={exercise.avoidIf} modifyIf={exercise.modifyIf} />

      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  figure: { alignItems: 'center' },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cautionText: { ...typography.caption, color: colors.danger, lineHeight: 18 },
  step: { ...typography.body, color: colors.text, lineHeight: 22 },
  cue: { ...typography.caption },
});
