import type { Journey } from '../../types/journey';
import { buildProviderSummary, contractionStats, kickSessionMinutes } from '../tracking';
import { bodyVariantForPhase, resolveJourneyPhase } from '../pregnancyDates';

const base = new Date('2026-09-23T10:00:00.000Z').getTime();
const t = (minutes: number) => new Date(base + minutes * 60_000).toISOString();

describe('contractionStats', () => {
  it('averages duration and start-to-start frequency', () => {
    const stats = contractionStats(
      [
        { startedAt: t(0), endedAt: t(1) },
        { startedAt: t(5), endedAt: t(6) },
        { startedAt: t(10), endedAt: null },
      ],
      new Date(base + 11 * 60_000)
    );
    expect(stats.count).toBe(2);
    expect(stats.averageDurationSeconds).toBe(60);
    expect(stats.averageFrequencySeconds).toBe(300);
  });

  it('handles an empty session', () => {
    expect(contractionStats([], new Date(base))).toEqual({ count: 0, averageDurationSeconds: null, averageFrequencySeconds: null });
  });
});

describe('kickSessionMinutes', () => {
  it('measures time to reach the target', () => {
    const kicks = Array.from({ length: 12 }, (_, i) => t(i * 2 + 2));
    expect(
      kickSessionMinutes({ id: 's', journeyId: 'j', startedAt: t(0), endedAt: t(40), kickTimestamps: kicks, targetKickCount: 10 })
    ).toBe(20);
  });
});

describe('phase helpers', () => {
  const journey: Journey = {
    id: 'j',
    status: 'active',
    conceptionMode: 'due_date',
    estimatedDueDate: '2026-12-01T00:00:00.000Z',
    actualDeliveryDate: null,
    deliveryType: 'unknown',
    personalizationTags: [],
    clearanceAcknowledgment: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    archivedAt: null,
    displayName: 'Test',
  };

  it('resolves prenatal and postpartum phases', () => {
    const prenatal = resolveJourneyPhase(journey, new Date('2026-09-23T00:00:00.000Z'));
    expect(prenatal.kind).toBe('prenatal');
    expect(prenatal.kind === 'prenatal' && prenatal.trimester).toBe(3);
    const postpartum = resolveJourneyPhase({ ...journey, actualDeliveryDate: '2026-11-20T00:00:00.000Z' }, new Date('2026-12-20T00:00:00.000Z'));
    expect(postpartum.kind === 'postpartum' && postpartum.weekPostpartum).toBe(4);
  });

  it('picks a body variant from the phase', () => {
    expect(bodyVariantForPhase({ kind: 'prenatal', trimester: 1, weekOfPregnancy: 5 }, 'pregnant')).toBe('neutral');
    expect(bodyVariantForPhase({ kind: 'prenatal', trimester: 3, weekOfPregnancy: 30 }, 'neutral')).toBe('pregnant');
    expect(bodyVariantForPhase({ kind: 'postpartum', weekPostpartum: 2, monthPostpartum: 0 }, 'pregnant')).toBe('postpartum');
    expect(bodyVariantForPhase(null, 'pregnant')).toBe('pregnant');
  });

  it('builds a provider summary that surfaces reported warning signs', () => {
    const summary = buildProviderSummary({
      journey,
      phase: { kind: 'prenatal', trimester: 3, weekOfPregnancy: 30 },
      checkIns: [
        {
          id: 'c',
          journeyId: 'j',
          date: '2026-09-22',
          mood: 'rough',
          energyLevel: 2,
          symptoms: ['Swelling'],
          redFlagsReported: ['severe-headache'],
          notes: 'Headache since morning',
          createdAt: t(-60 * 24),
        },
      ],
      workouts: [],
      kickSessions: [],
      contractionSessions: [],
      now: new Date(base),
    });
    expect(summary).toContain('Warning signs reported');
    expect(summary).toContain('Severe or persistent headache');
    expect(summary).toContain('Swelling (1d)');
    expect(summary).toContain('Headache since morning');
  });
});
