import {
  initialEntitlementState,
  isPremiumActiveForJourney,
  recordJourneyPassPurchase,
  setDemoModeEnabled,
  setSubscriptionActive,
  needsRenewalPrompt,
} from '../entitlements';
import type { Journey } from '../../types/journey';

function makeJourney(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'journey-a',
    status: 'active',
    conceptionMode: 'due_date',
    estimatedDueDate: '2027-10-01T00:00:00.000Z',
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

describe('isPremiumActiveForJourney', () => {
  it('is false with no purchase at all', () => {
    expect(isPremiumActiveForJourney(initialEntitlementState, makeJourney())).toBe(false);
  });

  it('is true for a Journey with its own purchased pass', () => {
    const journey = makeJourney({ id: 'journey-a' });
    const entitlement = recordJourneyPassPurchase(initialEntitlementState, 'journey-a');
    expect(isPremiumActiveForJourney(entitlement, journey)).toBe(true);
  });

  it('a pass for one Journey does not unlock a different Journey', () => {
    const otherJourney = makeJourney({ id: 'journey-b' });
    const entitlement = recordJourneyPassPurchase(initialEntitlementState, 'journey-a');
    expect(isPremiumActiveForJourney(entitlement, otherJourney)).toBe(false);
  });

  it('an active subscription unlocks the currently active Journey', () => {
    const activeJourney = makeJourney({ id: 'journey-a', status: 'active' });
    const entitlement = setSubscriptionActive(initialEntitlementState, true);
    expect(isPremiumActiveForJourney(entitlement, activeJourney)).toBe(true);
  });

  it('an active subscription does NOT unlock an archived Journey', () => {
    const archivedJourney = makeJourney({ id: 'journey-old', status: 'archived' });
    const entitlement = setSubscriptionActive(initialEntitlementState, true);
    expect(isPremiumActiveForJourney(entitlement, archivedJourney)).toBe(false);
  });

  it('an archived Journey keeps its own pass forever', () => {
    const archivedJourney = makeJourney({ id: 'journey-old', status: 'archived' });
    const entitlement = recordJourneyPassPurchase(initialEntitlementState, 'journey-old');
    expect(isPremiumActiveForJourney(entitlement, archivedJourney)).toBe(true);
  });

  it('is false for a null journey', () => {
    expect(isPremiumActiveForJourney(setSubscriptionActive(initialEntitlementState, true), null)).toBe(false);
  });
});

describe('needsRenewalPrompt', () => {
  it('is false for a brand-new user who has never purchased anything', () => {
    const newJourney = makeJourney({ id: 'journey-new' });
    expect(needsRenewalPrompt(initialEntitlementState, newJourney)).toBe(false);
  });

  it('is true for a returning purchaser whose new Journey has no coverage', () => {
    // They bought a pass for a previous (now-archived) Journey only.
    const entitlement = recordJourneyPassPurchase(initialEntitlementState, 'journey-old');
    const newJourney = makeJourney({ id: 'journey-new', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(true);
  });

  it('is false when an active subscription already covers the new Journey', () => {
    const entitlement = setSubscriptionActive(initialEntitlementState, true);
    const newJourney = makeJourney({ id: 'journey-new', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(false);
  });

  it('is true again once a subscriber cancels and then starts another new Journey', () => {
    let entitlement = setSubscriptionActive(initialEntitlementState, true);
    entitlement = setSubscriptionActive(entitlement, false);
    const newJourney = makeJourney({ id: 'journey-newer', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(true);
  });

  it('is false for a brand-new Journey Pass purchase covering exactly this Journey', () => {
    const journey = makeJourney({ id: 'journey-new', status: 'active' });
    const entitlement = recordJourneyPassPurchase(initialEntitlementState, 'journey-new');
    expect(needsRenewalPrompt(entitlement, journey)).toBe(false);
  });
});

describe('demo mode (App Store reviewer / QA unlock)', () => {
  it('defaults to disabled', () => {
    expect(initialEntitlementState.demoModeEnabled).toBe(false);
  });

  it('unconditionally unlocks premium for any Journey once enabled, with no purchase at all', () => {
    const journey = makeJourney({ id: 'journey-any', status: 'active' });
    const entitlement = setDemoModeEnabled(initialEntitlementState, true);
    expect(isPremiumActiveForJourney(entitlement, journey)).toBe(true);
  });

  it('unlocks even an archived Journey (unlike a bare subscription)', () => {
    const archivedJourney = makeJourney({ id: 'journey-old', status: 'archived' });
    const entitlement = setDemoModeEnabled(initialEntitlementState, true);
    expect(isPremiumActiveForJourney(entitlement, archivedJourney)).toBe(true);
  });

  it('suppresses the renewal prompt entirely, so a reviewer never gets stuck on the Paywall', () => {
    const entitlement = setDemoModeEnabled(initialEntitlementState, true);
    const newJourney = makeJourney({ id: 'journey-new', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(false);
  });

  it('can be turned back off, reverting to normal entitlement rules', () => {
    let entitlement = setDemoModeEnabled(initialEntitlementState, true);
    entitlement = setDemoModeEnabled(entitlement, false);
    const journey = makeJourney({ id: 'journey-any', status: 'active' });
    expect(isPremiumActiveForJourney(entitlement, journey)).toBe(false);
  });
});
