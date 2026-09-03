import {
  estimatedConceptionDate,
  isJourneyPastEnd,
  journeyEndDate,
  phaseLabel,
  resolveJourneyPhase,
} from '../pregnancyDates';
import type { Journey } from '../../types/journey';

function makeJourney(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'journey-1',
    status: 'active',
    conceptionMode: 'due_date',
    estimatedDueDate: null,
    actualDeliveryDate: null,
    deliveryType: 'unknown',
    personalizationTags: [],
    clearanceAcknowledgment: null,
    createdAt: '2027-01-01T00:00:00.000Z',
    archivedAt: null,
    displayName: 'Test Journey',
    ...overrides,
  };
}

describe('resolveJourneyPhase — trying to conceive', () => {
  it('reports trying_to_conceive when there is no due date yet', () => {
    const journey = makeJourney({ conceptionMode: 'trying_to_conceive', estimatedDueDate: null });
    expect(resolveJourneyPhase(journey, new Date('2027-06-01T00:00:00.000Z'))).toEqual({
      kind: 'trying_to_conceive',
    });
  });

  it('has no end date and never auto-archives while still trying to conceive', () => {
    const journey = makeJourney({ conceptionMode: 'trying_to_conceive', estimatedDueDate: null });
    expect(journeyEndDate(journey)).toBeNull();
    expect(isJourneyPastEnd(journey, new Date('2099-01-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('resolveJourneyPhase — prenatal (due-date path)', () => {
  const dueDate = '2027-10-01T00:00:00.000Z';

  it('starts at week 1 / trimester 1 right around conception', () => {
    const journey = makeJourney({ estimatedDueDate: dueDate });
    const conception = estimatedConceptionDate(new Date(dueDate));
    const phase = resolveJourneyPhase(journey, conception);
    expect(phase).toEqual({ kind: 'prenatal', trimester: 1, weekOfPregnancy: 1 });
  });

  it('places week 13 in trimester 1 and week 14 in trimester 2', () => {
    const journey = makeJourney({ estimatedDueDate: dueDate });
    const conception = estimatedConceptionDate(new Date(dueDate));

    const week13 = new Date(conception);
    week13.setUTCDate(week13.getUTCDate() + 12 * 7);
    expect(resolveJourneyPhase(journey, week13)).toEqual({
      kind: 'prenatal',
      trimester: 1,
      weekOfPregnancy: 13,
    });

    const week14 = new Date(conception);
    week14.setUTCDate(week14.getUTCDate() + 13 * 7);
    expect(resolveJourneyPhase(journey, week14)).toEqual({
      kind: 'prenatal',
      trimester: 2,
      weekOfPregnancy: 14,
    });
  });

  it('places week 27 in trimester 2 and week 28 in trimester 3', () => {
    const journey = makeJourney({ estimatedDueDate: dueDate });
    const conception = estimatedConceptionDate(new Date(dueDate));

    const week27 = new Date(conception);
    week27.setUTCDate(week27.getUTCDate() + 26 * 7);
    expect(resolveJourneyPhase(journey, week27)).toEqual({
      kind: 'prenatal',
      trimester: 2,
      weekOfPregnancy: 27,
    });

    const week28 = new Date(conception);
    week28.setUTCDate(week28.getUTCDate() + 27 * 7);
    expect(resolveJourneyPhase(journey, week28)).toEqual({
      kind: 'prenatal',
      trimester: 3,
      weekOfPregnancy: 28,
    });
  });

  it('flips to postpartum the moment the due date arrives, with no actual delivery date recorded', () => {
    const journey = makeJourney({ estimatedDueDate: dueDate });
    const phase = resolveJourneyPhase(journey, new Date(dueDate));
    expect(phase).toEqual({ kind: 'postpartum', weekPostpartum: 0, monthPostpartum: 0 });
  });
});

describe('resolveJourneyPhase — postpartum boundary', () => {
  const deliveryDate = '2027-10-01T00:00:00.000Z';

  it('stays postpartum through month 11', () => {
    const journey = makeJourney({ estimatedDueDate: deliveryDate, actualDeliveryDate: deliveryDate });
    // 11 months * 30 days = 330 days after delivery.
    const asOf = new Date(deliveryDate);
    asOf.setUTCDate(asOf.getUTCDate() + 330);
    const phase = resolveJourneyPhase(journey, asOf);
    expect(phase.kind).toBe('postpartum');
    if (phase.kind === 'postpartum') {
      expect(phase.monthPostpartum).toBe(11);
    }
  });

  it('flips to journey_complete once 12 postpartum months have elapsed', () => {
    const journey = makeJourney({ estimatedDueDate: deliveryDate, actualDeliveryDate: deliveryDate });
    // 12 months * 30 days = 360 days after delivery.
    const asOf = new Date(deliveryDate);
    asOf.setUTCDate(asOf.getUTCDate() + 360);
    expect(resolveJourneyPhase(journey, asOf)).toEqual({ kind: 'journey_complete' });
  });
});

describe('journeyEndDate / isJourneyPastEnd — exact-boundary and leap-year behavior', () => {
  it('is exactly 12 calendar months after delivery, and the boundary instant itself counts as past-end', () => {
    const journey = makeJourney({
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
      actualDeliveryDate: '2027-10-01T00:00:00.000Z',
    });
    const end = journeyEndDate(journey);
    expect(end?.toISOString()).toBe('2028-10-01T00:00:00.000Z');

    expect(isJourneyPastEnd(journey, end!)).toBe(true);
    expect(isJourneyPastEnd(journey, new Date(end!.getTime() - 1))).toBe(false);
    expect(isJourneyPastEnd(journey, new Date(end!.getTime() + 1))).toBe(true);
  });

  it('clamps a Feb 29 delivery date to Feb 28 twelve months later (non-leap target year)', () => {
    // 2028 is a leap year; 2029 is not.
    const journey = makeJourney({
      estimatedDueDate: '2028-02-29T00:00:00.000Z',
      actualDeliveryDate: '2028-02-29T00:00:00.000Z',
    });
    const end = journeyEndDate(journey);
    expect(end?.toISOString()).toBe('2029-02-28T00:00:00.000Z');
  });

  it('falls back to the estimated due date when no actual delivery date is recorded', () => {
    const journey = makeJourney({ estimatedDueDate: '2027-10-01T00:00:00.000Z', actualDeliveryDate: null });
    expect(journeyEndDate(journey)?.toISOString()).toBe('2028-10-01T00:00:00.000Z');
  });

  it('returns null when there is no due date or delivery date at all (still trying to conceive)', () => {
    const journey = makeJourney({ estimatedDueDate: null, actualDeliveryDate: null });
    expect(journeyEndDate(journey)).toBeNull();
  });
});

describe('resolveJourneyPhase — early delivery / pregnancy loss degrades gracefully', () => {
  it('switches straight to postpartum on an early/preterm delivery, ignoring the original due date', () => {
    const dueDate = '2027-12-01T00:00:00.000Z'; // full-term due date, still far off
    const earlyDeliveryDate = '2027-09-01T00:00:00.000Z'; // delivered ~13 weeks early

    const journey = makeJourney({
      estimatedDueDate: dueDate,
      actualDeliveryDate: earlyDeliveryDate,
    });

    // "Now" is the day of the early delivery itself.
    const phase = resolveJourneyPhase(journey, new Date(earlyDeliveryDate));
    expect(phase).toEqual({ kind: 'postpartum', weekPostpartum: 0, monthPostpartum: 0 });
  });

  it('never produces negative weeks/months or NaN, even if asOf somehow precedes the recorded delivery date', () => {
    const deliveryDate = '2027-09-01T00:00:00.000Z';
    const journey = makeJourney({ estimatedDueDate: deliveryDate, actualDeliveryDate: deliveryDate });

    // asOf a day *before* the recorded delivery/loss date — a clock-skew or
    // data-entry edge case, not something the UI should let happen, but the
    // math must not go negative or NaN if it ever does.
    const asOf = new Date(deliveryDate);
    asOf.setUTCDate(asOf.getUTCDate() - 1);
    const phase = resolveJourneyPhase(journey, asOf);

    expect(phase.kind).toBe('postpartum');
    if (phase.kind === 'postpartum') {
      expect(phase.weekPostpartum).toBe(0);
      expect(phase.monthPostpartum).toBe(0);
      expect(Number.isNaN(phase.weekPostpartum)).toBe(false);
      expect(Number.isNaN(phase.monthPostpartum)).toBe(false);
    }
  });

  it('records a pregnancy loss the same way as any other delivery date, without a dedicated loss code path', () => {
    // NOTE: the domain model has no distinct "loss" concept — recording a
    // loss means setting actualDeliveryDate to the date of the loss with
    // deliveryType 'unknown'. This test documents that this at least
    // degrades to a sane, non-crashing postpartum-recovery phase; it is
    // NOT a claim that the app's UX (wording, tone) is appropriate for a
    // loss. See README "Known gaps" for the follow-up this implies.
    const lossDate = '2027-06-15T00:00:00.000Z';
    const journey = makeJourney({
      estimatedDueDate: '2027-12-01T00:00:00.000Z',
      actualDeliveryDate: lossDate,
      deliveryType: 'unknown',
    });
    const phase = resolveJourneyPhase(journey, new Date(lossDate));
    expect(phase).toEqual({ kind: 'postpartum', weekPostpartum: 0, monthPostpartum: 0 });
  });
});

describe('resolveJourneyPhase — timezone edge cases', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('gives the same trimester/week for an instant safely in the middle of a week, regardless of local timezone', () => {
    const dueDate = '2027-10-01T00:00:00.000Z';
    const journey = makeJourney({ estimatedDueDate: dueDate });
    const conception = estimatedConceptionDate(new Date(dueDate));
    // Wednesday, comfortably away from any midnight boundary in any zone.
    const midWeek = new Date(conception);
    midWeek.setUTCDate(midWeek.getUTCDate() + 10 * 7 + 3);
    midWeek.setUTCHours(12, 0, 0, 0);

    process.env.TZ = 'Pacific/Kiritimati'; // UTC+14
    const phaseFarEast = resolveJourneyPhase(journey, midWeek);

    process.env.TZ = 'Etc/GMT+12'; // UTC-12 (Etc zone sign is inverted)
    const phaseFarWest = resolveJourneyPhase(journey, midWeek);

    expect(phaseFarEast).toEqual(phaseFarWest);
  });

  it('does not crash or produce NaN when the local timezone changes mid-session near a boundary instant', () => {
    const dueDate = '2027-10-01T00:00:00.000Z';
    const journey = makeJourney({ estimatedDueDate: dueDate });
    // Right at the due date/postpartum boundary — the instant most likely
    // to land on a different calendar day in an extreme-offset timezone.
    const asOf = new Date(dueDate);

    for (const tz of ['Pacific/Kiritimati', 'Etc/GMT+12', 'UTC', 'Pacific/Auckland']) {
      process.env.TZ = tz;
      const phase = resolveJourneyPhase(journey, asOf);
      expect(['prenatal', 'postpartum']).toContain(phase.kind);
      if (phase.kind === 'postpartum') {
        expect(Number.isNaN(phase.weekPostpartum)).toBe(false);
        expect(Number.isNaN(phase.monthPostpartum)).toBe(false);
        expect(phase.weekPostpartum).toBeGreaterThanOrEqual(0);
      }
      if (phase.kind === 'prenatal') {
        expect(Number.isNaN(phase.weekOfPregnancy)).toBe(false);
        expect(phase.weekOfPregnancy).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('phaseLabel', () => {
  it('formats every phase kind without throwing', () => {
    expect(phaseLabel({ kind: 'trying_to_conceive' })).toBe('Trying to conceive');
    expect(phaseLabel({ kind: 'prenatal', trimester: 2, weekOfPregnancy: 20 })).toBe(
      'Trimester 2 · Week 20'
    );
    expect(phaseLabel({ kind: 'postpartum', weekPostpartum: 6, monthPostpartum: 1 })).toBe(
      'Postpartum · Week 6'
    );
    expect(phaseLabel({ kind: 'journey_complete' })).toBe('Journey complete');
  });
});
