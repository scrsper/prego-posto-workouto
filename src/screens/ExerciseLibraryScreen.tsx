import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { MainTabScreenProps } from '../navigation/types';
import { useJourneyContext } from '../state/hooks';
import { EXERCISES } from '../data/exercises';
import { isExerciseSafeForPhase } from '../utils/safety';
import { PremiumBadge } from '../components/PremiumGate';
import { Card, Chip, ScreenContainer } from '../components/Basics';
import { colors, spacing, typography } from '../theme/theme';
import type { Exercise } from '../types/journey';

type Filter = 'all' | Exercise['category'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pelvic-floor', label: 'Pelvic floor' },
  { value: 'core', label: 'Core' },
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'cardio', label: 'Cardio' },
];

export function ExerciseLibraryScreen({ navigation }: MainTabScreenProps<'Exercises'>) {
  const { phase, isPremium } = useJourneyContext();
  const [filter, setFilter] = useState<Filter>('all');

  const exercises = useMemo(() => {
    const filtered = filter === 'all' ? EXERCISES : EXERCISES.filter((e) => e.category === filter);
    if (!phase) return filtered;
    return [...filtered].sort((a, b) => {
      const aSafe = isExerciseSafeForPhase(a.eligiblePhases, phase) ? 0 : 1;
      const bSafe = isExerciseSafeForPhase(b.eligiblePhases, phase) ? 0 : 1;
      return aSafe - bSafe;
    });
  }, [phase, filter]);

  function renderItem({ item }: { item: Exercise }) {
    const safe = phase ? isExerciseSafeForPhase(item.eligiblePhases, phase) : true;
    const rx = item.prescription;
    return (
      <Pressable
        onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${item.isPremium ? ', premium' : ''}${safe ? '' : ', not tagged for your current phase'}`}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Card style={!safe ? styles.unsafe : undefined}>
          <View style={styles.header}>
            <Text style={[typography.heading, styles.flexOne]}>{item.name}</Text>
            {item.isPremium && !isPremium ? <PremiumBadge /> : null}
            <SymbolView name="chevron.right" size={14} tintColor={colors.textMuted} />
          </View>
          <Text style={styles.meta}>
            {item.category.replace('-', ' ')} ·{' '}
            {rx.kind === 'reps' ? `${rx.sets} × ${rx.reps} reps` : `${rx.sets} × ${rx.workSeconds}s`}
          </Text>
          {!safe ? <Text style={styles.cautionText}>Not tagged for your current phase — check with your provider first.</Text> : null}
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenContainer scroll={false} largeTitle="Exercises">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterBar}>
        {FILTERS.map((option) => (
          <Chip key={option.value} label={option.label} selected={filter === option.value} onPress={() => setFilter(option.value)} />
        ))}
      </ScrollView>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          !isPremium ? (
            <Text style={styles.footer}>Premium unlocks the advanced progression library.</Text>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  filterBar: { flexGrow: 0 },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  list: { gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  unsafe: { opacity: 0.6 },
  cautionText: { ...typography.caption, color: colors.danger },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
