import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { EXERCISES } from '../data/exercises';
import { Card, ListRow, Muted, RowDivider, ScreenContainer, SectionTitle, StatTile } from '../components/Basics';
import { formatClock, workoutStreakDays, workoutsInLastDays } from '../utils/workout';
import { colors, spacing, typography } from '../theme/theme';
import type { WorkoutFeeling } from '../types/journey';

const FEELING_LABEL: Record<WorkoutFeeling, string> = {
  easy: 'Felt easy',
  just_right: 'Felt just right',
  hard: 'Felt hard',
  unwell: 'Felt unwell',
};

const MOOD_LABEL = { great: 'Great', okay: 'Okay', rough: 'Rough', struggling: 'Struggling' } as const;

export function TrackScreen({ navigation }: MainTabScreenProps<'Track'>) {
  const { journey, phase } = useJourneyContext();
  const workoutSessions = useJourneyStore((state) => state.workoutSessions);
  const dailyCheckIns = useJourneyStore((state) => state.dailyCheckIns);

  const workouts = useMemo(
    () => workoutSessions.filter((w) => w.journeyId === journey?.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [workoutSessions, journey?.id]
  );
  const checkIns = useMemo(
    () => dailyCheckIns.filter((c) => c.journeyId === journey?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [dailyCheckIns, journey?.id]
  );

  if (!journey) {
    return (
      <ScreenContainer largeTitle="Track">
        <Card>
          <Muted>Start a Journey to track workouts, check-ins, kicks, and contractions.</Muted>
        </Card>
      </ScreenContainer>
    );
  }

  const now = new Date();
  const minutesThisWeek = Math.round(
    workouts
      .filter((w) => now.getTime() - new Date(w.completedAt).getTime() < 7 * 86_400_000)
      .reduce((sum, w) => sum + w.durationSeconds, 0) / 60
  );
  const prenatal = phase?.kind === 'prenatal';

  return (
    <ScreenContainer largeTitle="Track">
      <View style={styles.stats}>
        <StatTile value={String(workoutStreakDays(workouts, now))} label="day streak" />
        <StatTile value={String(workoutsInLastDays(workouts, now, 7))} label="workouts, 7 days" />
        <StatTile value={String(minutesThisWeek)} label="active min, 7 days" />
      </View>

      <Card>
        <SectionTitle>Tools</SectionTitle>
        <View>
          <ListRow title="Daily check-in" icon="square.and.pencil" onPress={() => navigation.navigate('DailyCheckIn')} />
          {prenatal ? (
            <>
              <RowDivider />
              <ListRow title="Kick counter" icon="hand.tap.fill" onPress={() => navigation.navigate('KickCounter')} />
              <RowDivider />
              <ListRow title="Contraction timer" icon="stopwatch.fill" onPress={() => navigation.navigate('ContractionTimer')} />
            </>
          ) : null}
          <RowDivider />
          <ListRow
            title="Warning signs"
            icon="exclamationmark.triangle.fill"
            iconColor={colors.danger}
            onPress={() => navigation.navigate('SafetyChecklist')}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Recent workouts</SectionTitle>
        {workouts.length === 0 ? (
          <Muted>No workouts yet. Your first one is on the Today tab.</Muted>
        ) : (
          workouts.slice(0, 10).map((w, index) => {
            const names = w.completedExerciseIds
              .map((id) => EXERCISES.find((e) => e.id === id)?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <View key={w.id}>
                {index > 0 ? <RowDivider /> : null}
                <View style={styles.entry}>
                  <Text style={styles.entryTitle}>
                    {new Date(w.completedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {formatClock(w.durationSeconds)}
                  </Text>
                  <Text style={styles.entryBody} numberOfLines={2}>
                    {names || 'No exercises completed'}
                  </Text>
                  {w.feeling || w.endedEarly ? (
                    <Text style={[styles.entryMeta, (w.feeling === 'unwell' || w.endedEarly) && { color: colors.warning }]}>
                      {[w.feeling ? FEELING_LABEL[w.feeling] : null, w.endedEarly ? 'Ended early' : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle>Recent check-ins</SectionTitle>
        {checkIns.length === 0 ? (
          <Muted>No check-ins yet.</Muted>
        ) : (
          checkIns.slice(0, 10).map((c, index) => (
            <View key={c.id}>
              {index > 0 ? <RowDivider /> : null}
              <View style={styles.entry}>
                <Text style={styles.entryTitle}>
                  {new Date(c.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {MOOD_LABEL[c.mood]} · energy {c.energyLevel}/5
                </Text>
                {c.symptoms.length > 0 ? <Text style={styles.entryBody}>{c.symptoms.join(', ')}</Text> : null}
                {c.redFlagsReported.length > 0 ? (
                  <Text style={[styles.entryMeta, { color: colors.danger }]}>
                    {c.redFlagsReported.length} warning sign{c.redFlagsReported.length === 1 ? '' : 's'} reported
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  entry: { paddingVertical: spacing.sm, gap: 2 },
  entryTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  entryBody: { ...typography.caption, color: colors.textMuted },
  entryMeta: { ...typography.caption, color: colors.textMuted },
});
