import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import type { Journey } from '../types/journey';
import { useJourneyStore } from '../state/journeyStore';
import { useArchivedJourneys, useJourneyContext } from '../state/hooks';
import { Card, Muted, PrimaryButton, ScreenContainer, SectionTitle } from '../components/Basics';
import { colors, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'JourneyArchive'>;

interface JourneyStats {
  checkIns: number;
  workouts: number;
  activeMinutes: number;
  positiveMoodShare: number | null;
  workoutsPerWeek: number | null;
}

function useJourneyStats(): (journey: Journey) => JourneyStats {
  const checkIns = useJourneyStore((state) => state.dailyCheckIns);
  const workouts = useJourneyStore((state) => state.workoutSessions);
  return (journey) => {
    const journeyCheckIns = checkIns.filter((c) => c.journeyId === journey.id);
    const journeyWorkouts = workouts.filter((w) => w.journeyId === journey.id);
    const positive = journeyCheckIns.filter((c) => c.mood === 'great' || c.mood === 'okay').length;
    const end = journey.archivedAt ? new Date(journey.archivedAt) : new Date();
    const weeks = Math.max(1, (end.getTime() - new Date(journey.createdAt).getTime()) / (7 * 86_400_000));
    return {
      checkIns: journeyCheckIns.length,
      workouts: journeyWorkouts.length,
      activeMinutes: Math.round(journeyWorkouts.reduce((sum, w) => sum + w.durationSeconds, 0) / 60),
      positiveMoodShare: journeyCheckIns.length ? positive / journeyCheckIns.length : null,
      workoutsPerWeek: journeyWorkouts.length ? journeyWorkouts.length / weeks : null,
    };
  };
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function JourneyArchiveScreen({ navigation }: Props) {
  const archivedJourneys = useArchivedJourneys();
  const { journey: activeJourney, isPremium } = useJourneyContext();
  const statsFor = useJourneyStats();

  const allJourneys = activeJourney ? [activeJourney, ...archivedJourneys] : archivedJourneys;

  return (
    <ScreenContainer>
      <Muted>Every Journey stays here permanently, on the free plan too.</Muted>

      {archivedJourneys.length === 0 ? (
        <Card>
          <Muted>No archived Journeys yet. When a Journey ends — automatically 12 months after birth, or when you end it — it moves here.</Muted>
        </Card>
      ) : (
        archivedJourneys.map((journey) => {
          const stats = statsFor(journey);
          return (
            <Card key={journey.id}>
              <SectionTitle>{journey.displayName}</SectionTitle>
              <Muted>
                {journey.actualDeliveryDate
                  ? `Born ${formatDate(journey.actualDeliveryDate)}`
                  : journey.estimatedDueDate
                    ? `Due ${formatDate(journey.estimatedDueDate)}`
                    : 'No due date on file'}
                {' · '}Archived {formatDate(journey.archivedAt)}
              </Muted>
              <Text style={styles.stats}>
                {stats.workouts} workouts · {stats.activeMinutes} active min · {stats.checkIns} check-ins
              </Text>
            </Card>
          );
        })
      )}

      {allJourneys.length > 1 ? (
        <Card style={isPremium ? { borderColor: colors.premium, borderWidth: 1 } : undefined}>
          <SectionTitle>Compare your Journeys</SectionTitle>
          {isPremium ? (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellName, styles.headerCell]}>Journey</Text>
                <Text style={[styles.cell, styles.headerCell]}>Workouts / wk</Text>
                <Text style={[styles.cell, styles.headerCell]}>Active min</Text>
                <Text style={[styles.cell, styles.headerCell]}>Good days</Text>
              </View>
              {allJourneys.map((journey) => {
                const stats = statsFor(journey);
                return (
                  <View key={journey.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellName]} numberOfLines={2}>
                      {journey.displayName}
                      {journey.status === 'active' ? ' (current)' : ''}
                    </Text>
                    <Text style={styles.cell}>{stats.workoutsPerWeek ? stats.workoutsPerWeek.toFixed(1) : '—'}</Text>
                    <Text style={styles.cell}>{stats.activeMinutes}</Text>
                    <Text style={styles.cell}>
                      {stats.positiveMoodShare !== null ? `${Math.round(stats.positiveMoodShare * 100)}%` : '—'}
                    </Text>
                  </View>
                );
              })}
              <Muted style={typography.caption}>“Good days” = check-ins where you felt great or okay.</Muted>
            </View>
          ) : (
            <>
              <Muted>Premium lets you compare activity and how you felt across pregnancies side by side.</Muted>
              <PrimaryButton label="See Premium" tone="premium" onPress={() => navigation.navigate('Paywall')} />
            </>
          )}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stats: { ...typography.caption, color: colors.primaryDark },
  table: { gap: spacing.xs },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cell: { flex: 1, ...typography.caption, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  cellName: { flex: 1.6, textAlign: 'left' },
  headerCell: { color: colors.textMuted, fontWeight: '700' },
});
