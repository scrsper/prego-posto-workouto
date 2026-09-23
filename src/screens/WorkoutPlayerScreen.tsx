import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import * as StoreReview from 'expo-store-review';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { RootStackScreenProps } from '../navigation/types';
import type { Exercise, WorkoutFeeling } from '../types/journey';
import { EXERCISES } from '../data/exercises';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { AnatomicalFigure } from '../components/AnatomicalFigure';
import { Chip, LinkButton, Muted, PrimaryButton, SecondaryButton } from '../components/Basics';
import { buildWorkoutSteps, currentRep, formatClock, type WorkoutStep } from '../utils/workout';
import { bodyVariantForPhase } from '../utils/pregnancyDates';
import { haptics } from '../utils/haptics';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'WorkoutPlayer'>;

const FEELINGS: { value: WorkoutFeeling; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'just_right', label: 'Just right' },
  { value: 'hard', label: 'Hard' },
  { value: 'unwell', label: 'I feel unwell' },
];

const REVIEW_AFTER_WORKOUTS = 3;

function restLabel(exercise: Exercise): string {
  return exercise.category === 'cardio' ? 'Easy pace' : 'Rest';
}

function stepAnnouncement(step: WorkoutStep, exercise: Exercise): string {
  if (step.kind === 'prepare') return `Next: ${exercise.name}. Get into position.`;
  if (step.kind === 'rest') return restLabel(exercise);
  return step.totalSets > 1 ? `Set ${step.set} of ${step.totalSets}. Begin.` : 'Begin.';
}

function IconButton({
  icon,
  label,
  onPress,
  size = 22,
  style,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  size?: number;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, style, pressed && { opacity: 0.6 }]}
    >
      <SymbolView name={icon} size={size} tintColor={colors.primaryDark} />
    </Pressable>
  );
}

export function WorkoutPlayerScreen({ route, navigation }: Props) {
  useKeepAwake();
  const { journey, phase } = useJourneyContext();
  const addWorkoutSession = useJourneyStore((state) => state.addWorkoutSession);

  const exercises = useMemo(
    () =>
      route.params.exerciseIds
        .map((id) => EXERCISES.find((exercise) => exercise.id === id))
        .filter((exercise): exercise is Exercise => !!exercise),
    [route.params.exerciseIds]
  );
  const steps = useMemo(() => buildWorkoutSteps(exercises), [exercises]);

  const [startedAt] = useState(() => new Date().toISOString());
  const [stepIndex, setStepIndex] = useState(0);
  const [segmentStart, setSegmentStart] = useState(() => Date.now());
  const [bankedSeconds, setBankedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [finished, setFinished] = useState<{ endedEarly: boolean } | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [feeling, setFeeling] = useState<WorkoutFeeling | null>(null);

  const step: WorkoutStep | undefined = steps[stepIndex];
  const exercise = step ? exercises[step.exerciseIndex] : undefined;
  const elapsed = bankedSeconds + (paused || finished ? 0 : Math.max(0, (now - segmentStart) / 1000));
  const remaining = step ? Math.max(0, step.durationSeconds - elapsed) : 0;
  const rep = step ? currentRep(step, elapsed) : null;

  const say = useCallback(
    (text: string) => {
      if (!voiceOn) return;
      Speech.stop().catch(() => {});
      Speech.speak(text, { rate: 0.95 });
    },
    [voiceOn]
  );

  useEffect(() => () => void Speech.stop().catch(() => {}), []);

  // Clock. Everything is derived from wall time, so a slow JS frame never drifts the timer.
  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [paused, finished]);

  const goToStep = useCallback(
    (nextIndex: number, secondsSpentInCurrent: number) => {
      const current = steps[stepIndex];
      setActiveSeconds((total) => total + secondsSpentInCurrent);
      if (current?.kind === 'work' && current.set === current.totalSets) {
        const id = exercises[current.exerciseIndex].id;
        setCompletedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      }
      if (nextIndex >= steps.length) {
        setFinished({ endedEarly: false });
        haptics.success();
        say('Workout complete. Nice work.');
        return;
      }
      const next = steps[nextIndex];
      const at = Date.now();
      setStepIndex(nextIndex);
      setBankedSeconds(0);
      setSegmentStart(at);
      setNow(at);
      if (next.kind === 'work') haptics.firm();
      else haptics.tap();
      say(stepAnnouncement(next, exercises[next.exerciseIndex]));
    },
    [steps, stepIndex, exercises, say]
  );

  // Announce the very first step.
  useEffect(() => {
    if (steps[0]) say(stepAnnouncement(steps[0], exercises[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance when the current step's time is up.
  useEffect(() => {
    if (!finished && !paused && step && remaining <= 0) goToStep(stepIndex + 1, step.durationSeconds);
  }, [remaining, finished, paused, step, stepIndex, goToStep]);

  // A light tap on every new rep doubles as a pacing cue.
  useEffect(() => {
    if (rep && rep > 1) haptics.tap();
  }, [rep]);

  // 3-2-1 ticks at the end of prepare/rest.
  const secondsLeft = Math.ceil(remaining);
  useEffect(() => {
    if (step && step.kind !== 'work' && secondsLeft > 0 && secondsLeft <= 3 && !paused) haptics.selection();
  }, [secondsLeft, step, paused]);

  const pause = useCallback(() => {
    if (paused || finished) return;
    setBankedSeconds(elapsed);
    setPaused(true);
    Speech.stop().catch(() => {});
  }, [paused, finished, elapsed]);

  const resume = useCallback(() => {
    const at = Date.now();
    setSegmentStart(at);
    setNow(at);
    setPaused(false);
  }, []);

  // Auto-pause when the app leaves the foreground (phone call, lock screen).
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pauseRef.current();
    });
    return () => subscription.remove();
  }, []);

  function endEarly(presetFeeling: WorkoutFeeling | null) {
    setActiveSeconds((total) => total + elapsed);
    setBankedSeconds(0);
    setFinished({ endedEarly: true });
    Speech.stop().catch(() => {});
    if (presetFeeling === 'unwell') {
      save('unwell', true, activeSeconds + elapsed);
    }
  }

  function confirmStop() {
    const wasPaused = paused;
    pause();
    Alert.alert('End workout?', 'It’s always OK to stop early. Listen to your body.', [
      { text: 'Keep going', style: 'cancel', onPress: () => (wasPaused ? undefined : resume()) },
      { text: 'End workout', onPress: () => endEarly(null) },
      { text: 'I feel unwell', style: 'destructive', onPress: () => endEarly('unwell') },
    ]);
  }

  function save(chosen: WorkoutFeeling | null, endedEarly: boolean, durationSeconds: number) {
    if (journey) {
      addWorkoutSession({
        journeyId: journey.id,
        startedAt,
        completedAt: new Date().toISOString(),
        exerciseIds: exercises.map((e) => e.id),
        completedExerciseIds: completedIds,
        durationSeconds: Math.round(durationSeconds),
        feeling: chosen,
        endedEarly,
      });
    }
    if (chosen === 'unwell') {
      haptics.warning();
      navigation.replace('SafetyChecklist');
      return;
    }
    maybeRequestReview(chosen, endedEarly);
    navigation.goBack();
  }

  function maybeRequestReview(chosen: WorkoutFeeling | null, endedEarly: boolean) {
    const state = useJourneyStore.getState();
    if (state.hasRequestedReview || endedEarly || chosen === 'hard') return;
    if (state.workoutSessions.length < REVIEW_AFTER_WORKOUTS) return;
    state.markReviewRequested();
    StoreReview.isAvailableAsync()
      .then((available) => (available ? StoreReview.requestReview() : undefined))
      .catch(() => {});
  }

  if (exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Muted>There’s nothing in this workout.</Muted>
          <SecondaryButton label="Close" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const minutes = Math.max(1, Math.round(activeSeconds / 60));
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summary}>
          <SymbolView
            name={finished.endedEarly ? 'hand.raised.fill' : 'checkmark.seal.fill'}
            size={64}
            tintColor={finished.endedEarly ? colors.warning : colors.success}
            style={{ width: 64, height: 64, alignSelf: 'center' }}
          />
          <Text style={styles.summaryTitle} accessibilityRole="header">
            {finished.endedEarly ? 'Workout ended' : 'Nice work!'}
          </Text>
          <Muted style={{ textAlign: 'center' }}>
            {minutes} active min · {completedIds.length} of {exercises.length} exercises
          </Muted>
          <Text style={styles.sectionLabel}>How did that feel?</Text>
          <View style={styles.chips}>
            {FEELINGS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={feeling === option.value}
                tone={option.value === 'unwell' ? 'danger' : 'primary'}
                onPress={() => setFeeling(option.value)}
              />
            ))}
          </View>
          {feeling === 'unwell' ? (
            <Text style={styles.unwellNote}>
              We’ll show you the warning signs next. If anything feels urgent, call your provider or 911.
            </Text>
          ) : feeling === 'hard' ? (
            <Muted>Thanks — consider fewer reps or a longer rest next time. Your body’s needs change week to week.</Muted>
          ) : null}
          <PrimaryButton
            label={journey ? 'Save workout' : 'Done'}
            onPress={() => save(feeling, finished.endedEarly, activeSeconds)}
          />
          <LinkButton label="Discard" color={colors.textMuted} onPress={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!step || !exercise) return null;

  const upNext = step.kind === 'rest' ? exercise : exercises[step.exerciseIndex + 1];
  const overallFraction = stepIndex / steps.length;
  const label =
    step.kind === 'prepare'
      ? 'Get into position'
      : step.kind === 'rest'
        ? restLabel(exercise)
        : step.totalSets > 1
          ? `Set ${step.set} of ${step.totalSets}`
          : 'Go';
  const repFraction =
    step.kind === 'work' && step.repSeconds ? (elapsed % step.repSeconds) / step.repSeconds : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="xmark" label="End workout" onPress={confirmStop} />
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>
            Exercise {step.exerciseIndex + 1} of {exercises.length}
          </Text>
          <Text style={styles.topClock}>{formatClock(activeSeconds + elapsed)}</Text>
        </View>
        <IconButton
          icon={voiceOn ? 'speaker.wave.2.fill' : 'speaker.slash.fill'}
          label={voiceOn ? 'Mute voice cues' : 'Turn on voice cues'}
          onPress={() => {
            if (voiceOn) Speech.stop().catch(() => {});
            setVoiceOn((v) => !v);
          }}
        />
      </View>
      <View style={styles.overallTrack}>
        <View style={[styles.overallFill, { width: `${overallFraction * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.exerciseName} accessibilityRole="header">
          {exercise.name}
        </Text>
        <Text style={[styles.stepLabel, step.kind === 'rest' && { color: colors.success }]}>{label}</Text>

        <View style={styles.display} accessibilityLiveRegion="polite">
          {step.kind === 'work' && rep !== null ? (
            <>
              <Text style={styles.bigNumber} accessibilityLabel={`Rep ${rep} of ${step.reps}`}>
                {rep}
              </Text>
              <Text style={styles.bigCaption}>of {step.reps} reps</Text>
              <View style={styles.repTrack}>
                <View style={[styles.repFill, { width: `${(repFraction ?? 0) * 100}%` }]} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.bigNumber}>{formatClock(remaining)}</Text>
              <Text style={styles.bigCaption}>
                {step.kind === 'work' ? 'hold · breathe normally' : step.kind === 'rest' ? `then set ${step.afterSet + 1}` : 'until start'}
              </Text>
            </>
          )}
        </View>

        {step.kind !== 'rest' ? (
          <View style={styles.figure} accessible accessibilityLabel={`Illustration highlighting the muscles used in ${exercise.name}`}>
            <AnatomicalFigure
              variant={bodyVariantForPhase(phase, exercise.bodyVariant)}
              highlightedMuscles={exercise.primaryMuscles}
              repTempoSeconds={paused ? 0 : exercise.repTempoSeconds}
              size={110}
              showCesareanScar={journey?.deliveryType === 'cesarean'}
            />
          </View>
        ) : upNext ? (
          <Muted style={{ textAlign: 'center' }}>Up next: {upNext.name}</Muted>
        ) : null}

        {step.kind === 'prepare' ? (
          <View style={styles.instructions}>
            {exercise.steps.map((line, index) => (
              <Text key={line} style={styles.instructionLine}>
                {index + 1}. {line}
              </Text>
            ))}
            {exercise.modifyIf[0] ? <Text style={styles.modifyNote}>Modify: {exercise.modifyIf[0]}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.stopNote}>
          Stop right away if you feel pain, dizziness, bleeding, leaking fluid, or pelvic pressure.
        </Text>
      </ScrollView>

      <View style={styles.controls}>
        <IconButton icon="exclamationmark.triangle" label="I don’t feel well — stop" onPress={confirmStop} style={styles.sideControl} />
        <Pressable
          onPress={() => {
            haptics.tap();
            if (paused) resume();
            else pause();
          }}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
          style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.8 }]}
        >
          <SymbolView name={paused ? 'play.fill' : 'pause.fill'} size={30} tintColor="#fff" />
        </Pressable>
        <IconButton
          icon="forward.end.fill"
          label={step.kind === 'prepare' ? 'Start now' : 'Skip'}
          onPress={() => goToStep(stepIndex + 1, elapsed)}
          style={styles.sideControl}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  topCenter: { alignItems: 'center' },
  topTitle: { ...typography.caption, color: colors.textMuted },
  topClock: { ...typography.body, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overallTrack: {
    height: 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  overallFill: { height: '100%', backgroundColor: colors.primary },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.lg },
  exerciseName: { ...typography.title, textAlign: 'center', color: colors.text },
  stepLabel: { ...typography.heading, textAlign: 'center', color: colors.primaryDark },
  display: { alignItems: 'center', gap: 2 },
  bigNumber: { fontSize: 72, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  bigCaption: { ...typography.body, color: colors.textMuted },
  repTrack: {
    width: '60%',
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  repFill: { height: '100%', backgroundColor: colors.accent },
  figure: { alignItems: 'center' },
  instructions: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  instructionLine: { ...typography.body, color: colors.text, lineHeight: 21 },
  modifyNote: { ...typography.caption, color: colors.warning, marginTop: spacing.xs, lineHeight: 18 },
  stopNote: { ...typography.caption, color: colors.danger, textAlign: 'center', lineHeight: 18 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  sideControl: { width: 56, height: 56 },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { padding: spacing.lg, gap: spacing.md, paddingTop: spacing.xl },
  summaryTitle: { ...typography.largeTitle, textAlign: 'center', color: colors.text },
  sectionLabel: { ...typography.heading, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unwellNote: { ...typography.body, color: colors.danger, lineHeight: 21 },
});
