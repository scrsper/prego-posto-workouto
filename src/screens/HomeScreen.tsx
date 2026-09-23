import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { differenceInCalendarDays } from 'date-fns';
import { SymbolView } from 'expo-symbols';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { localDateKey, useJourneyContext } from '../state/hooks';
import {
  Card,
  ListRow,
  Muted,
  PrimaryButton,
  RowDivider,
  ScreenContainer,
  SecondaryButton,
  SectionTitle,
  StatTile,
} from '../components/Basics';
import { phaseLabel } from '../utils/pregnancyDates';
import { buildDailyRoutine, estimatedMinutes, hasWorkoutToday, workoutStreakDays } from '../utils/workout';
import { EXERCISES } from '../data/exercises';
import { colors, radii, spacing, typography } from '../theme/theme';

function ProgressBar({ fraction, color = colors.primary }: { fraction: number; color?: string }) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function HomeScreen({ navigation }: MainTabScreenProps<'Today'>) {
  const { journey, phase, isPremium, advancedUnlocked } = useJourneyContext();
  const workoutSessions = useJourneyStore((state) => state.workoutSessions);
  const dailyCheckIns = useJourneyStore((state) => state.dailyCheckIns);

  const journeyWorkouts = useMemo(
    () => workoutSessions.filter((session) => session.journeyId === journey?.id),
    [workoutSessions, journey?.id]
  );

  const routine = useMemo(() => {
    if (!journey || !phase) return [];
    return buildDailyRoutine({
      exercises: EXERCISES,
      phase,
      advancedUnlocked,
      personalize: isPremium,
      personalizationTags: journey.personalizationTags,
      deliveryType: journey.deliveryType,
      date: new Date(),
    });
  }, [journey, phase, advancedUnlocked, isPremium]);

  if (!journey || !phase) {
    return (
      <ScreenContainer largeTitle="Today">
        <Card>
          <SectionTitle>No active Journey</SectionTitle>
          <Muted>Start a Journey to get trimester- or postpartum-specific routines and tracking.</Muted>
          <PrimaryButton label="Start a Journey" onPress={() => navigation.navigate('NewJourney')} />
        </Card>
      </ScreenContainer>
    );
  }

  const now = new Date();
  const doneToday = hasWorkoutToday(journeyWorkouts, now);
  const streak = workoutStreakDays(journeyWorkouts, now);
  const checkedInToday = dailyCheckIns.some((c) => c.journeyId === journey.id && c.date === localDateKey(now));
  const minutes = routine.length > 0 ? estimatedMinutes(routine) : 0;

  let progress: { fraction: number; caption: string } | null = null;
  if (phase.kind === 'prenatal' && journey.estimatedDueDate) {
    const daysToGo = differenceInCalendarDays(new Date(journey.estimatedDueDate), now);
    progress = {
      fraction: phase.weekOfPregnancy / 40,
      caption: daysToGo > 0 ? `${daysToGo} day${daysToGo === 1 ? '' : 's'} until your due date` : 'Due any day now',
    };
  } else if (phase.kind === 'postpartum') {
    progress = {
      fraction: phase.weekPostpartum / 52,
      caption: `Month ${phase.monthPostpartum + 1} of your 12-month postpartum Journey`,
    };
  }

  const earlyPostpartum = phase.kind === 'postpartum' && phase.weekPostpartum < 6 && !journey.clearanceAcknowledgment;
  const needsBirthDetails = phase.kind === 'postpartum' && !journey.actualDeliveryDate;
  const lateInPregnancy = phase.kind === 'prenatal' && phase.trimester === 3;

  return (
    <ScreenContainer largeTitle="Today" subtitle={phaseLabel(phase)}>
      {progress ? (
        <Card>
          <ProgressBar fraction={progress.fraction} />
          <Muted>{progress.caption}</Muted>
        </Card>
      ) : null}

      {phase.kind === 'trying_to_conceive' ? (
        <Card>
          <SectionTitle>Have a due date now?</SectionTitle>
          <Muted>Add it to switch to trimester-specific routines. Everything you’ve logged stays with this Journey.</Muted>
          <SecondaryButton
            label="Add due date"
            icon="calendar.badge.plus"
            onPress={() => navigation.navigate('NewJourney', { updateJourneyId: journey.id })}
          />
        </Card>
      ) : null}

      {needsBirthDetails ? (
        <Card style={{ borderColor: colors.primary }}>
          <SectionTitle>Congratulations! Add your birth details</SectionTitle>
          <Muted>Your due date has passed. Adding your actual birth date and delivery type keeps your recovery weeks accurate.</Muted>
          <SecondaryButton label="Add birth details" icon="heart.fill" onPress={() => navigation.navigate('Delivery')} />
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowBetween}>
          <SectionTitle>Today’s routine</SectionTitle>
          {doneToday ? (
            <View style={styles.doneBadge}>
              <SymbolView name="checkmark.circle.fill" size={16} tintColor={colors.success} />
              <Text style={styles.doneText}>Done</Text>
            </View>
          ) : null}
        </View>
        {routine.length === 0 ? (
          <>
            <Muted>Your Journey is complete — congratulations. It will be archived, never deleted.</Muted>
            <SecondaryButton label="Start a new Journey" onPress={() => navigation.navigate('NewJourney')} />
          </>
        ) : (
          <>
            <Muted>
              {routine.length} exercises · about {minutes} min · picked for {phaseLabel(phase).toLowerCase()}
            </Muted>
            <View>
              {routine.map((exercise, index) => (
                <React.Fragment key={exercise.id}>
                  {index > 0 ? <RowDivider /> : null}
                  <ListRow
                    title={exercise.name}
                    subtitle={
                      exercise.prescription.kind === 'reps'
                        ? `${exercise.prescription.sets} × ${exercise.prescription.reps} reps`
                        : `${exercise.prescription.sets} × ${exercise.prescription.workSeconds}s`
                    }
                    icon="figure.mind.and.body"
                    onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: exercise.id })}
                  />
                </React.Fragment>
              ))}
            </View>
            {earlyPostpartum ? (
              <Text style={styles.note}>
                Early postpartum: your routine only includes exercises tagged for your current recovery week. Follow
                your provider’s guidance, especially after a cesarean birth, and skip anything that hurts.
              </Text>
            ) : null}
            <PrimaryButton
              label={doneToday ? 'Do it again' : 'Start workout'}
              icon="play.fill"
              onPress={() =>
                navigation.navigate('WorkoutPlayer', {
                  exerciseIds: routine.map((exercise) => exercise.id),
                  title: 'Today’s routine',
                })
              }
            />
          </>
        )}
        <View style={styles.stats}>
          <StatTile value={String(streak)} label="day streak" />
          <StatTile value={String(journeyWorkouts.length)} label="workouts this Journey" />
        </View>
      </Card>

      <Card>
        <SectionTitle>Check in & track</SectionTitle>
        <View>
          <ListRow
            title="Daily check-in"
            subtitle={checkedInToday ? 'Done for today' : 'Mood, energy & symptoms — 1 minute'}
            icon={checkedInToday ? 'checkmark.circle.fill' : 'square.and.pencil'}
            iconColor={checkedInToday ? colors.success : colors.primary}
            onPress={() => navigation.navigate('DailyCheckIn')}
          />
          {phase.kind === 'prenatal' ? (
            <>
              <RowDivider />
              <ListRow
                title="Kick counter"
                subtitle="Count your baby’s movements"
                icon="hand.tap.fill"
                onPress={() => navigation.navigate('KickCounter')}
              />
            </>
          ) : null}
          {lateInPregnancy ? (
            <>
              <RowDivider />
              <ListRow
                title="Contraction timer"
                subtitle="Duration and frequency"
                icon="stopwatch.fill"
                onPress={() => navigation.navigate('ContractionTimer')}
              />
              <RowDivider />
              <ListRow
                title="Baby’s here?"
                subtitle="Add your birth details to start postpartum recovery"
                icon="heart.fill"
                onPress={() => navigation.navigate('Delivery')}
              />
            </>
          ) : null}
        </View>
      </Card>

      <Card style={styles.safetyCard}>
        <View style={styles.rowBetween}>
          <SectionTitle style={{ color: colors.danger }}>Warning signs</SectionTitle>
          <SymbolView name="exclamationmark.triangle.fill" size={20} tintColor={colors.danger} />
        </View>
        <Muted>Know when to stop and call your provider. Always free.</Muted>
        <SecondaryButton label="View warning signs" tone="danger" onPress={() => navigation.navigate('SafetyChecklist')} />
      </Card>

      <Card style={isPremium ? { borderColor: colors.premium } : undefined}>
        <SectionTitle>{isPremium ? 'Premium is active' : 'Go further with Premium'}</SectionTitle>
        <Muted>
          {isPremium
            ? advancedUnlocked
              ? 'Advanced progressions and personalized routines are unlocked for this Journey.'
              : 'Confirm provider clearance to add advanced progressions to your routine.'
            : 'Personalized routines, advanced progressions, provider visit summaries, and more.'}
        </Muted>
        {isPremium && !advancedUnlocked ? (
          <SecondaryButton
            label="Provider clearance"
            tone="premium"
            onPress={() => navigation.navigate('ClearanceAcknowledgment')}
          />
        ) : !isPremium ? (
          <SecondaryButton label="See Premium" tone="premium" icon="sparkles" onPress={() => navigation.navigate('Paywall')} />
        ) : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 10, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  note: { ...typography.caption, color: colors.warning, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  safetyCard: { borderColor: colors.danger, borderWidth: 1 },
});
