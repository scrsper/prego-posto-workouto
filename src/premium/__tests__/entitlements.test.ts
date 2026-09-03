import {
  initialEntitlementState,
  isPremiumActiveForJourney,
  mockActivateSubscription,
  mockDeactivateSubscription,
  mockPurchaseJourneyPass,
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
    const entitlement = mockPurchaseJourneyPass(initialEntitlementState, 'journey-a');
    expect(isPremiumActiveForJourney(entitlement, journey)).toBe(true);
  });

  it('a pass for one Journey does not unlock a different Journey', () => {
    const otherJourney = makeJourney({ id: 'journey-b' });
    const entitlement = mockPurchaseJourneyPass(initialEntitlementState, 'journey-a');
    expect(isPremiumActiveForJourney(entitlement, otherJourney)).toBe(false);
  });

  it('an active subscription unlocks the currently active Journey', () => {
    const activeJourney = makeJourney({ id: 'journey-a', status: 'active' });
    const entitlement = mockActivateSubscription(initialEntitlementState);
    expect(isPremiumActiveForJourney(entitlement, activeJourney)).toBe(true);
  });

  it('an active subscription does NOT unlock an archived Journey', () => {
    const archivedJourney = makeJourney({ id: 'journey-old', status: 'archived' });
    const entitlement = mockActivateSubscription(initialEntitlementState);
    expect(isPremiumActiveForJourney(entitlement, archivedJourney)).toBe(false);
  });

  it('an archived Journey keeps its own pass forever', () => {
    const archivedJourney = makeJourney({ id: 'journey-old', status: 'archived' });
    const entitlement = mockPurchaseJourneyPass(initialEntitlementState, 'journey-old');
    expect(isPremiumActiveForJourney(entitlement, archivedJourney)).toBe(true);
  });

  it('is false for a null journey', () => {
    expect(isPremiumActiveForJourney(mockActivateSubscription(initialEntitlementState), null)).toBe(false);
  });
});

describe('needsRenewalPrompt', () => {
  it('is false for a brand-new user who has never purchased anything', () => {
    const newJourney = makeJourney({ id: 'journey-new' });
    expect(needsRenewalPrompt(initialEntitlementState, newJourney)).toBe(false);
  });

  it('is true for a returning purchaser whose new Journey has no coverage', () => {
    // They bought a pass for a previous (now-archived) Journey only.
    const entitlement = mockPurchaseJourneyPass(initialEntitlementState, 'journey-old');
    const newJourney = makeJourney({ id: 'journey-new', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(true);
  });

  it('is false when an active subscription already covers the new Journey', () => {
    const entitlement = mockActivateSubscription(initialEntitlementState);
    const newJourney = makeJourney({ id: 'journey-new', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(false);
  });

  it('is true again once a subscriber cancels and then starts another new Journey', () => {
    let entitlement = mockActivateSubscription(initialEntitlementState);
    entitlement = mockDeactivateSubscription(entitlement);
    const newJourney = makeJourney({ id: 'journey-newer', status: 'active' });
    expect(needsRenewalPrompt(entitlement, newJourney)).toBe(true);
  });

  it('is false for a brand-new Journey Pass purchase covering exactly this Journey', () => {
    const journey = makeJourney({ id: 'journey-new', status: 'active' });
    const entitlement = mockPurchaseJourneyPass(initialEntitlementState, 'journey-new');
    expect(needsRenewalPrompt(entitlement, journey)).toBe(false);
  });
});
