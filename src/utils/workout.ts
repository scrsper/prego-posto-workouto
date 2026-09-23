import type { DeliveryType, Exercise, JourneyPhase, WorkoutSession } from '../types/journey';
import { isExerciseSafeForPhase } from './safety';

/* ------------------------------------------------------------------ */
/* Guided workout steps                                                 */
/* ------------------------------------------------------------------ */

export type WorkoutStep =
  | { kind: 'prepare'; exerciseIndex: number; durationSeconds: number }
  | {
      kind: 'work';
      exerciseIndex: number;
      set: number;
      totalSets: number;
      durationSeconds: number;
      /** Rep-based sets: number of reps, paced by `repSeconds`. Null for timed holds. */
      reps: number | null;
      repSeconds: number | null;
    }
  | { kind: 'rest'; exerciseIndex: number; afterSet: number; durationSeconds: number };

/** Time to get into position before each exercise (tap to skip). */
export const PREPARE_SECONDS = 10;

export function buildWorkoutSteps(exercises: Exercise[], prepareSeconds = PREPARE_SECONDS): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  exercises.forEach((exercise, exerciseIndex) => {
    const rx = exercise.prescription;
    steps.push({ kind: 'prepare', exerciseIndex, durationSeconds: prepareSeconds });
    for (let set = 1; set <= rx.sets; set += 1) {
      if (rx.kind === 'reps') {
        steps.push({
          kind: 'work',
          exerciseIndex,
          set,
          totalSets: rx.sets,
          durationSeconds: rx.reps * exercise.repTempoSeconds,
          reps: rx.reps,
          repSeconds: exercise.repTempoSeconds,
        });
      } else {
        steps.push({
          kind: 'work',
          exerciseIndex,
          set,
          totalSets: rx.sets,
          durationSeconds: rx.workSeconds,
          reps: null,
          repSeconds: null,
        });
      }
      if (set < rx.sets && rx.restSeconds > 0) {
        steps.push({ kind: 'rest', exerciseIndex, afterSet: set, durationSeconds: rx.restSeconds });
      }
    }
  });
  return steps;
}

export function totalDurationSeconds(steps: WorkoutStep[]): number {
  return steps.reduce((sum, step) => sum + step.durationSeconds, 0);
}

export function estimatedMinutes(exercises: Exercise[]): number {
  return Math.max(1, Math.ceil(totalDurationSeconds(buildWorkoutSteps(exercises)) / 60));
}

/** 1-based rep currently in progress for a rep-paced work step. */
export function currentRep(step: WorkoutStep, elapsedSeconds: number): number | null {
  if (step.kind !== 'work' || step.reps === null || !step.repSeconds) return null;
  return Math.min(step.reps, Math.floor(Math.max(0, elapsedSeconds) / step.repSeconds) + 1);
}

/* ------------------------------------------------------------------ */
/* Daily routine                                                        */
/* ------------------------------------------------------------------ */

const ANCHOR_EXERCISE_IDS = ['diaphragmatic-breathing', 'pelvic-floor-activation'];
const ROTATING_PICKS = 3;

export interface RoutineInput {
  exercises: Exercise[];
  phase: JourneyPhase;
  /** Premium unlocked AND provider clearance acknowledged. */
  advancedUnlocked: boolean;
  /** Premium: reorder picks around the user's personalization tags. */
  personalize: boolean;
  personalizationTags: string[];
  deliveryType: DeliveryType;
  date: Date;
}

function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * Relevance/safety filters apply to everyone regardless of premium:
 * nobody should be offered scar work without a cesarean, multiples work
 * without multiples, or side bends with moderate/severe diastasis.
 */
function isRelevant(exercise: Exercise, tags: string[], deliveryType: DeliveryType): boolean {
  if (exercise.id === 'csection-scar-mobilization') return deliveryType === 'cesarean';
  if (exercise.id === 'twins-modified-carry') return tags.includes('twins-or-multiples');
  if (exercise.id === 'seated-side-bend') {
    return !tags.includes('diastasis-recti-moderate') && !tags.includes('diastasis-recti-severe');
  }
  return true;
}

function personalizationPriority(exercise: Exercise, tags: string[], deliveryType: DeliveryType): number {
  const hasDiastasis = tags.some((tag) => tag.startsWith('diastasis-recti'));
  if (hasDiastasis && exercise.id.startsWith('diastasis-')) return 0;
  if (deliveryType === 'cesarean' && exercise.id === 'csection-scar-mobilization') return 0;
  if (tags.includes('twins-or-multiples') && exercise.id === 'twins-modified-carry') return 0;
  if (exercise.isPremium) return 1;
  return 2;
}

/**
 * Today's guided routine: breathing + pelvic floor as anchors, then a
 * handful of phase-safe exercises that rotate daily. Long cardio sessions
 * (walking intervals) are left out of the routine and offered separately.
 */
export function buildDailyRoutine(input: RoutineInput): Exercise[] {
  const { phase, personalizationTags: tags, deliveryType } = input;
  if (phase.kind === 'journey_complete') return [];

  const eligible = input.exercises.filter(
    (exercise) =>
      exercise.category !== 'cardio' &&
      isExerciseSafeForPhase(exercise.eligiblePhases, phase) &&
      (!exercise.isPremium || input.advancedUnlocked) &&
      isRelevant(exercise, tags, deliveryType)
  );

  const anchors = ANCHOR_EXERCISE_IDS.map((id) => eligible.find((exercise) => exercise.id === id)).filter(
    (exercise): exercise is Exercise => !!exercise
  );
  const pool = eligible
    .filter((exercise) => !ANCHOR_EXERCISE_IDS.includes(exercise.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return anchors;

  const offset = dayNumber(input.date) % pool.length;
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  const ordered = input.personalize
    ? [...rotated].sort(
        (a, b) => personalizationPriority(a, tags, deliveryType) - personalizationPriority(b, tags, deliveryType)
      )
    : rotated;

  // Prefer a spread of categories; fill from the remainder if needed.
  const picks: Exercise[] = [];
  const usedCategories = new Set<string>();
  for (const exercise of ordered) {
    if (picks.length >= ROTATING_PICKS) break;
    if (!usedCategories.has(exercise.category)) {
      picks.push(exercise);
      usedCategories.add(exercise.category);
    }
  }
  for (const exercise of ordered) {
    if (picks.length >= ROTATING_PICKS) break;
    if (!picks.includes(exercise)) picks.push(exercise);
  }
  return [...anchors, ...picks];
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

function localDayKey(date: Date): number {
  return dayNumber(date);
}

/** Consecutive days with a completed workout, counting back from today (or yesterday). */
export function workoutStreakDays(sessions: Pick<WorkoutSession, 'completedAt'>[], now: Date): number {
  const days = new Set(sessions.map((session) => localDayKey(new Date(session.completedAt))));
  let cursor = localDayKey(now);
  if (!days.has(cursor)) cursor -= 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function workoutsInLastDays(sessions: Pick<WorkoutSession, 'completedAt'>[], now: Date, days: number): number {
  const today = localDayKey(now);
  return sessions.filter((session) => today - localDayKey(new Date(session.completedAt)) < days).length;
}

export function hasWorkoutToday(sessions: Pick<WorkoutSession, 'completedAt'>[], now: Date): boolean {
  const today = localDayKey(now);
  return sessions.some((session) => localDayKey(new Date(session.completedAt)) === today);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
