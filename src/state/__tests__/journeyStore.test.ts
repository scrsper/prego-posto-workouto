import { useJourneyStore } from '../journeyStore';
import { DEMO_MODE_UNLOCK_CODE } from '../../premium/demoMode';

// Snapshot the store's initial shape (data + actions) once, so each test can
// reset back to it without losing the action functions themselves.
const initialState = useJourneyStore.getState();

beforeEach(() => {
  useJourneyStore.setState(initialState, true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('startNewJourney / archiveJourney lifecycle', () => {
  it('creates an active Journey and makes it the active one', () => {
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    const state = useJourneyStore.getState();
    expect(state.activeJourneyId).toBe(id);
    expect(state.activeJourney()?.status).toBe('active');
  });

  it('archives a Journey, clears activeJourneyId, and keeps it in history', () => {
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    useJourneyStore.getState().archiveJourney(id);

    const state = useJourneyStore.getState();
    expect(state.activeJourneyId).toBeNull();
    expect(state.journeys.find((j) => j.id === id)?.status).toBe('archived');
    expect(state.archivedJourneys().map((j) => j.id)).toContain(id);
  });

  it('never deletes an archived Journey or its check-ins', () => {
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    useJourneyStore.getState().addDailyCheckIn({
      journeyId: id,
      date: '2027-05-01',
      mood: 'okay',
      energyLevel: 3,
      symptoms: [],
      redFlagsReported: [],
      notes: '',
    });
    useJourneyStore.getState().archiveJourney(id);

    const state = useJourneyStore.getState();
    expect(state.journeys.some((j) => j.id === id)).toBe(true);
    expect(state.dailyCheckIns.some((c) => c.journeyId === id)).toBe(true);
  });
});

describe('runAutoArchiveSweep', () => {
  it('leaves a Journey well within its window untouched', () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });

    useJourneyStore.getState().runAutoArchiveSweep();

    expect(useJourneyStore.getState().activeJourneyId).toBe(id);
    expect(useJourneyStore.getState().journeys.find((j) => j.id === id)?.status).toBe('active');
  });

  it('archives a Journey exactly at its 12-months-postpartum boundary instant', () => {
    const dueDate = '2027-10-01T00:00:00.000Z';
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: dueDate,
    });

    // The Journey's end date is exactly 12 calendar months after its due
    // date (no actual delivery date recorded): 2028-10-01T00:00:00.000Z.
    jest.setSystemTime(new Date('2028-10-01T00:00:00.000Z'));
    useJourneyStore.getState().runAutoArchiveSweep();

    const state = useJourneyStore.getState();
    expect(state.journeys.find((j) => j.id === id)?.status).toBe('archived');
    expect(state.activeJourneyId).toBeNull();
  });

  it('does not archive one instant before the boundary', () => {
    const dueDate = '2027-10-01T00:00:00.000Z';
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: dueDate,
    });

    jest.setSystemTime(new Date('2028-09-30T23:59:59.999Z'));
    useJourneyStore.getState().runAutoArchiveSweep();

    expect(useJourneyStore.getState().journeys.find((j) => j.id === id)?.status).toBe('active');
  });

  it('never archives a trying-to-conceive Journey (no due date, nothing to measure against)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'trying_to_conceive',
      estimatedDueDate: null,
    });

    useJourneyStore.getState().runAutoArchiveSweep();

    expect(useJourneyStore.getState().journeys.find((j) => j.id === id)?.status).toBe('active');
  });

  it('does not touch a Journey that is already archived', () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    useJourneyStore.getState().archiveJourney(id);
    const archivedAtBefore = useJourneyStore.getState().journeys.find((j) => j.id === id)?.archivedAt;

    jest.setSystemTime(new Date('2099-01-01T00:00:00.000Z'));
    useJourneyStore.getState().runAutoArchiveSweep();

    expect(useJourneyStore.getState().journeys.find((j) => j.id === id)?.archivedAt).toBe(archivedAtBefore);
  });
});

describe('needsRenewalPrompt-driven flow, end to end through the store', () => {
  it('a returning purchaser starting a new Journey is not covered until they buy a new pass', async () => {
    const store = useJourneyStore.getState();
    const firstId = store.startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    // No RevenueCat API key in the test environment, so this exercises the
    // local dev fallback path — see purchaseJourneyPass in journeyStore.ts.
    await useJourneyStore.getState().purchaseJourneyPass(firstId);
    useJourneyStore.getState().archiveJourney(firstId);

    const secondId = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2029-10-01T00:00:00.000Z',
    });

    const state = useJourneyStore.getState();
    expect(state.entitlement.journeyPassIds).toEqual([firstId]);
    expect(state.entitlement.journeyPassIds).not.toContain(secondId);
  });
});

describe('purchase actions without RevenueCat configured (the test/Expo Go fallback path)', () => {
  it('purchaseJourneyPass records the pass locally and reports it was a local fallback', async () => {
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    const result = await useJourneyStore.getState().purchaseJourneyPass(id);
    expect(result.status).toBe('success');
    expect(useJourneyStore.getState().entitlement.journeyPassIds).toContain(id);
  });

  it('purchaseSubscription activates the subscription flag locally', async () => {
    const result = await useJourneyStore.getState().purchaseSubscription();
    expect(result.status).toBe('success');
    expect(useJourneyStore.getState().entitlement.subscriptionActive).toBe(true);
  });

  it('devSimulateCancelSubscription turns the local flag back off', async () => {
    await useJourneyStore.getState().purchaseSubscription();
    useJourneyStore.getState().devSimulateCancelSubscription();
    expect(useJourneyStore.getState().entitlement.subscriptionActive).toBe(false);
  });

  it('restorePurchases is a no-op without RevenueCat configured (does not throw)', async () => {
    await expect(useJourneyStore.getState().restorePurchases()).resolves.toBeUndefined();
  });

  it('initializePurchases reports purchasesInitialized: false without an API key', async () => {
    await useJourneyStore.getState().initializePurchases();
    expect(useJourneyStore.getState().purchasesInitialized).toBe(false);
  });
});

describe('demo mode unlock', () => {
  it('rejects an incorrect code and leaves demo mode off', () => {
    const succeeded = useJourneyStore.getState().tryEnableDemoMode('definitely-not-it');
    expect(succeeded).toBe(false);
    expect(useJourneyStore.getState().entitlement.demoModeEnabled).toBe(false);
  });

  it('accepts the correct code and unlocks premium for a Journey with no purchase', () => {
    const id = useJourneyStore.getState().startNewJourney({
      conceptionMode: 'due_date',
      estimatedDueDate: '2027-10-01T00:00:00.000Z',
    });
    const succeeded = useJourneyStore.getState().tryEnableDemoMode(DEMO_MODE_UNLOCK_CODE);
    expect(succeeded).toBe(true);
    expect(useJourneyStore.getState().entitlement.demoModeEnabled).toBe(true);
    expect(useJourneyStore.getState().entitlement.journeyPassIds).not.toContain(id);
  });

  it('disableDemoMode turns it back off', () => {
    useJourneyStore.getState().tryEnableDemoMode(DEMO_MODE_UNLOCK_CODE);
    useJourneyStore.getState().disableDemoMode();
    expect(useJourneyStore.getState().entitlement.demoModeEnabled).toBe(false);
  });
});
