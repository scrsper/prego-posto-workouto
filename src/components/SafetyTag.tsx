import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { JourneyPhase, SafetyEligibility } from '../types/journey';
import { colors, radii, spacing, typography } from '../theme/theme';

function eligibilityMatchesPhase(eligibility: SafetyEligibility, phase: JourneyPhase): boolean {
  if (eligibility.kind === 'trying_to_conceive') return phase.kind === 'trying_to_conceive';
  if (eligibility.kind === 'trimester') return phase.kind === 'prenatal' && phase.trimester === eligibility.trimester;
  if (eligibility.kind === 'postpartum_week_range') {
    if (phase.kind !== 'postpartum') return false;
    const withinMin = phase.weekPostpartum >= eligibility.minWeek;
    const withinMax = eligibility.maxWeek === null || phase.weekPostpartum <= eligibility.maxWeek;
    return withinMin && withinMax;
  }
  return false;
}

export function isExerciseSafeForPhase(eligiblePhases: SafetyEligibility[], phase: JourneyPhase): boolean {
  return eligiblePhases.some((eligibility) => eligibilityMatchesPhase(eligibility, phase));
}

/** A pill showing whether an exercise is tagged safe for the user's current journey phase. */
export function SafetyTag({ safe, phaseLabel }: { safe: boolean; phaseLabel: string }) {
  return (
    <View style={[styles.pill, safe ? styles.pillSafe : styles.pillCaution]}>
      <Text style={[styles.pillText, safe ? styles.pillTextSafe : styles.pillTextCaution]}>
        {safe ? `✓ Safe for ${phaseLabel}` : `Check with your provider for ${phaseLabel}`}
      </Text>
    </View>
  );
}

export function SafetyWarnings({ avoidIf, modifyIf }: { avoidIf: string[]; modifyIf: string[] }) {
  if (avoidIf.length === 0 && modifyIf.length === 0) return null;
  return (
    <View style={styles.warningsContainer}>
      {avoidIf.length > 0 ? (
        <View style={[styles.warningBlock, styles.avoidBlock]}>
          <Text style={styles.warningTitle}>Avoid if</Text>
          {avoidIf.map((line) => (
            <Text key={line} style={styles.warningText}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}
      {modifyIf.length > 0 ? (
        <View style={[styles.warningBlock, styles.modifyBlock]}>
          <Text style={styles.warningTitle}>Modify if</Text>
          {modifyIf.map((line) => (
            <Text key={line} style={styles.warningText}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillSafe: { backgroundColor: '#EAF6EE', borderColor: colors.success },
  pillCaution: { backgroundColor: colors.dangerSurface, borderColor: colors.danger },
  pillText: { ...typography.caption },
  pillTextSafe: { color: colors.success },
  pillTextCaution: { color: colors.danger },
  warningsContainer: { gap: spacing.sm, marginTop: spacing.sm },
  warningBlock: { borderRadius: radii.md, padding: spacing.md, borderWidth: 1 },
  avoidBlock: { backgroundColor: colors.dangerSurface, borderColor: colors.danger },
  modifyBlock: { backgroundColor: '#FFF6E8', borderColor: colors.warning },
  warningTitle: { ...typography.caption, fontWeight: '700', marginBottom: spacing.xs, color: colors.text },
  warningText: { ...typography.body, fontSize: 13, color: colors.text, lineHeight: 18 },
});
