import { addDays, addMonths, differenceInCalendarDays, differenceInCalendarWeeks } from 'date-fns';
import type { Journey, JourneyPhase } from '../types/journey';

/** Standard full-term pregnancy length used for due-date math. */
export const PREGNANCY_LENGTH_DAYS = 280;

/** A Journey runs through 12 months postpartum, measured from actual (or estimated) delivery. */
export const JOURNEY_POSTPARTUM_LENGTH_MONTHS = 12;

export function estimatedConceptionDate(estimatedDueDate: Date): Date {
  return addDays(estimatedDueDate, -PREGNANCY_LENGTH_DAYS);
}

/** The date a Journey auto-archives: 12 months after (actual or estimated) delivery. */
export function journeyEndDate(journey: Journey): Date | null {
  const deliveryDate = journey.actualDeliveryDate ?? journey.estimatedDueDate;
  if (!deliveryDate) return null;
  return addMonths(new Date(deliveryDate), JOURNEY_POSTPARTUM_LENGTH_MONTHS);
}

export function isJourneyPastEnd(journey: Journey, asOf: Date = new Date()): boolean {
  const end = journeyEndDate(journey);
  if (!end) return false;
  return asOf.getTime() >= end.getTime();
}

/**
 * Resolves the current point in the pregnancy -> postpartum arc for a Journey.
 * Trimester boundaries follow the common ACOG-aligned convention:
 * weeks 1-13 = trimester 1, 14-27 = trimester 2, 28-40+ = trimester 3.
 */
export function resolveJourneyPhase(journey: Journey, asOf: Date = new Date()): JourneyPhase {
  if (journey.conceptionMode === 'trying_to_conceive' && !journey.estimatedDueDate) {
    return { kind: 'trying_to_conceive' };
  }

  const deliveryDate = journey.actualDeliveryDate ? new Date(journey.actualDeliveryDate) : null;
  const dueDate = journey.estimatedDueDate ? new Date(journey.estimatedDueDate) : null;

  const hasDelivered = deliveryDate !== null || (dueDate !== null && asOf.getTime() >= dueDate.getTime());

  if (!hasDelivered && dueDate) {
    const conceptionDate = estimatedConceptionDate(dueDate);
    const weekOfPregnancy = Math.min(
      42,
      Math.max(1, differenceInCalendarWeeks(asOf, conceptionDate) + 1)
    );
    const trimester = weekOfPregnancy <= 13 ? 1 : weekOfPregnancy <= 27 ? 2 : 3;
    return { kind: 'prenatal', trimester, weekOfPregnancy };
  }

  const anchor = deliveryDate ?? dueDate;
  if (!anchor) return { kind: 'trying_to_conceive' };

  const weekPostpartum = Math.max(0, differenceInCalendarWeeks(asOf, anchor));
  const monthPostpartum = Math.max(0, Math.floor(differenceInCalendarDays(asOf, anchor) / 30));

  if (monthPostpartum >= JOURNEY_POSTPARTUM_LENGTH_MONTHS) {
    return { kind: 'journey_complete' };
  }

  return { kind: 'postpartum', weekPostpartum, monthPostpartum };
}

export function phaseLabel(phase: JourneyPhase): string {
  switch (phase.kind) {
    case 'trying_to_conceive':
      return 'Trying to conceive';
    case 'prenatal':
      return `Trimester ${phase.trimester} · Week ${phase.weekOfPregnancy}`;
    case 'postpartum':
      return `Postpartum · Week ${phase.weekPostpartum}`;
    case 'journey_complete':
      return 'Journey complete';
  }
}
