import { EXERCISES } from '../../data/exercises';
import type { Exercise, JourneyPhase } from '../../types/journey';
import { isExerciseSafeForPhase } from '../safety';
import {
  buildDailyRoutine,
  buildWorkoutSteps,
  currentRep,
  formatClock,
  hasWorkoutToday,
  workoutStreakDays,
  type RoutineInput,
} from '../workout';

const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;

function routine(phase: JourneyPhase, overrides: Partial<RoutineInput> = {}): Exercise[] {
  return buildDailyRoutine({
    exercises: EXERCISES,
    phase,
    advancedUnlocked: false,
    personalize: false,
    personalizationTags: [],
    deliveryType: 'unknown',
    date: new Date(2026, 8, 23),
    ...overrides,
  });
}

describe('buildWorkoutSteps', () => {
  it('lays out prepare, sets, and rests between (not after) sets', () => {
    const steps = buildWorkoutSteps([byId('pelvic-floor-activation')], 10);
    expect(steps.map((s) => s.kind)).toEqual(['prepare', 'work', 'rest', 'work']);
    const work = steps[1];
    expect(work.kind === 'work' && work.reps).toBe(8);
    expect(work.durationSeconds).toBe(8 * byId('pelvic-floor-activation').repTempoSeconds);
  });

  it('uses the countdown for timed exercises', () => {
    const steps = buildWorkoutSteps([byId('wall-squat')], 10);
    const work = steps.find((s) => s.kind === 'work')!;
    expect(work.kind === 'work' && work.reps).toBeNull();
    expect(work.durationSeconds).toBe(15);
  });

  it('every exercise has a valid prescription', () => {
    for (const exercise of EXERCISES) {
      const rx = exercise.prescription;
      expect(rx.sets).toBeGreaterThan(0);
      if (rx.kind === 'reps') expect(rx.reps).toBeGreaterThan(0);
      else expect(rx.workSeconds).toBeGreaterThan(0);
    }
  });
});

describe('currentRep', () => {
  const step = buildWorkoutSteps([byId('glute-bridge')])[1];
  it('counts reps from 1 and caps at the total', () => {
    expect(currentRep(step, 0)).toBe(1);
    expect(currentRep(step, 4.1)).toBe(2);
    expect(currentRep(step, 9999)).toBe(10);
  });
});

describe('buildDailyRoutine', () => {
  const secondTrimester: JourneyPhase = { kind: 'prenatal', trimester: 2, weekOfPregnancy: 20 };

  it('only includes exercises tagged safe for the phase, never cardio', () => {
    const phases: JourneyPhase[] = [
      { kind: 'trying_to_conceive' },
      { kind: 'prenatal', trimester: 1, weekOfPregnancy: 8 },
      secondTrimester,
      { kind: 'prenatal', trimester: 3, weekOfPregnancy: 34 },
      { kind: 'postpartum', weekPostpartum: 1, monthPostpartum: 0 },
      { kind: 'postpartum', weekPostpartum: 20, monthPostpartum: 4 },
    ];
    for (const phase of phases) {
      for (const exercise of routine(phase, { advancedUnlocked: true, deliveryType: 'cesarean' })) {
        expect(isExerciseSafeForPhase(exercise.eligiblePhases, phase)).toBe(true);
        expect(exercise.category).not.toBe('cardio');
      }
    }
  });

  it('starts with breathing and pelvic floor anchors', () => {
    const ids = routine(secondTrimester).map((e) => e.id);
    expect(ids.slice(0, 2)).toEqual(['diaphragmatic-breathing', 'pelvic-floor-activation']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never includes premium exercises unless advanced is unlocked', () => {
    const late: JourneyPhase = { kind: 'postpartum', weekPostpartum: 30, monthPostpartum: 7 };
    for (let day = 0; day < 14; day += 1) {
      const date = new Date(2026, 0, 1 + day);
      expect(routine(late, { date }).some((e) => e.isPremium)).toBe(false);
    }
  });

  it('filters out irrelevant or contraindicated exercises for everyone', () => {
    const late: JourneyPhase = { kind: 'postpartum', weekPostpartum: 30, monthPostpartum: 7 };
    for (let day = 0; day < 30; day += 1) {
      const ids = routine(late, {
        date: new Date(2026, 0, 1 + day),
        personalizationTags: ['diastasis-recti-severe'],
        deliveryType: 'vaginal',
        advancedUnlocked: true,
      }).map((e) => e.id);
      expect(ids).not.toContain('csection-scar-mobilization');
      expect(ids).not.toContain('twins-modified-carry');
      expect(ids).not.toContain('seated-side-bend');
    }
  });

  it('prioritizes personalized picks for premium users', () => {
    const late: JourneyPhase = { kind: 'postpartum', weekPostpartum: 30, monthPostpartum: 7 };
    const ids = routine(late, {
      personalize: true,
      advancedUnlocked: true,
      deliveryType: 'cesarean',
      personalizationTags: ['diastasis-recti-mild'],
    }).map((e) => e.id);
    expect(ids).toContain('csection-scar-mobilization');
    expect(ids.some((id) => id.startsWith('diastasis-'))).toBe(true);
  });

  it('rotates day to day', () => {
    const a = routine(secondTrimester, { date: new Date(2026, 0, 1) }).map((e) => e.id);
    const b = routine(secondTrimester, { date: new Date(2026, 0, 2) }).map((e) => e.id);
    expect(a).not.toEqual(b);
  });

  it('is empty once the Journey is complete', () => {
    expect(routine({ kind: 'journey_complete' })).toEqual([]);
  });
});

describe('stats', () => {
  const at = (d: number, h = 12) => ({ completedAt: new Date(2026, 8, d, h).toISOString() });

  it('counts a streak ending today or yesterday', () => {
    const now = new Date(2026, 8, 23, 9);
    expect(workoutStreakDays([at(21), at(22), at(23)], now)).toBe(3);
    expect(workoutStreakDays([at(21), at(22)], now)).toBe(2);
    expect(workoutStreakDays([at(20), at(21)], now)).toBe(0);
    expect(workoutStreakDays([], now)).toBe(0);
  });

  it('uses local days', () => {
    expect(hasWorkoutToday([at(23, 23)], new Date(2026, 8, 23, 0, 5))).toBe(true);
    expect(hasWorkoutToday([at(22, 23)], new Date(2026, 8, 23, 0, 5))).toBe(false);
  });

  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.4)).toBe('1:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});
