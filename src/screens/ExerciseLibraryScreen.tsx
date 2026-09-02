import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { EXERCISES } from '../data/exercises';
import { resolveJourneyPhase } from '../utils/pregnancyDates';
import { isExerciseSafeForPhase } from '../components/SafetyTag';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { PremiumBadge } from '../components/PremiumGate';
import { Card, ScreenContainer } from '../components/Basics';
import { colors, spacing, typography } from '../theme/theme';
import type { Exercise } from '../types/journey';

export function ExerciseLibraryScreen({ navigation }: MainTabScreenProps<'Exercises'>) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);
  const isPremium = isPremiumActiveForJourney(entitlement, activeJourney);

  const phase = activeJourney ? resolveJourneyPhase(activeJourney) : null;

  const sortedExercises = useMemo(() => {
    if (!phase) return EXERCISES;
    return [...EXERCISES].sort((a, b) => {
      const aSafe = isExerciseSafeForPhase(a.eligiblePhases, phase) ? 0 : 1;
      const bSafe = isExerciseSafeForPhase(b.eligiblePhases, phase) ? 0 : 1;
      return aSafe - bSafe;
    });
  }, [phase]);

  function renderItem({ item }: { item: Exercise }) {
    const safe = phase ? isExerciseSafeForPhase(item.eligiblePhases, phase) : true;
    return (
      <Pressable onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}>
        <Card style={!safe ? { opacity: 0.55 } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={typography.heading}>{item.name}</Text>
            {item.isPremium ? <PremiumBadge /> : null}
          </View>
          <Text style={{ ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' }}>
            {item.category.replace('-', ' ')}
          </Text>
          {!safe ? (
            <Text style={{ ...typography.caption, color: colors.danger }}>
              Not tagged for your current phase — check with your provider first.
            </Text>
          ) : null}
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <Text style={[typography.title, { marginBottom: spacing.sm }]}>Exercise Library</Text>
      <FlatList
        data={sortedExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
      />
      {!isPremium ? (
        <Text style={{ ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm }}>
          Premium unlocks the full advanced/progression library.
        </Text>
      ) : null}
    </ScreenContainer>
  );
}
