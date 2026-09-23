import type { JourneyPhase, SafetyEligibility } from '../types/journey';

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
