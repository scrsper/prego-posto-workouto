import type { Journey } from '../../types/journey';
import {
  initialEntitlementState,
  isPremiumActiveForJourney,
  migrateEntitlement,
  needsRenewalPrompt,
  reconcileEntitlement,
  type EntitlementState,
} from '../entitlements';

function journey(id: string, status: Journey['status'] = 'active'): Journey {
  return {
    id,
    status,
    conceptionMode: 'due_date',
    estimatedDueDate: '2026-12-01T00:00:00.000Z',
    actualDeliveryDate: null,
    deliveryType: 'unknown',
    personalizationTags: [],
    clearanceAcknowledgment: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    archivedAt: status === 'archived' ? '2026-06-01T00:00:00.000Z' : null,
    displayName: id,
  };
}

const NOW = new Date('2026-09-23T12:00:00.000Z');
const WINDOW = 22;

describe('isPremiumActiveForJourney', () => {
  it('a pass unlocks its own Journey forever, even archived', () => {
    const e: EntitlementState = {
      ...initialEntitlementState,
      journeyPasses: [{ journeyId: 'a', transactionId: 't1', purchasedAt: NOW.toISOString() }],
    };
    expect(isPremiumActiveForJourney(e, journey('a', 'archived'))).toBe(true);
    expect(isPremiumActiveForJourney(e, journey('b'))).toBe(false);
  });

  it('a subscription unlocks only the active Journey', () => {
    const e = { ...initialEntitlementState, subscriptionActive: true };
    expect(isPremiumActiveForJourney(e, journey('a'))).toBe(true);
    expect(isPremiumActiveForJourney(e, journey('a', 'archived'))).toBe(false);
    expect(isPremiumActiveForJourney(e, null)).toBe(false);
  });
});

describe('reconcileEntitlement', () => {
  it('attaches a new pass purchase to the active Journey', () => {
    const next = reconcileEntitlement(
      initialEntitlementState,
      { subscriptionActive: false, journeyPassTransactions: [{ transactionId: 't1', purchasedAt: NOW.toISOString() }] },
      journey('a'),
      NOW,
      WINDOW
    );
    expect(next.journeyPasses).toEqual([{ journeyId: 'a', transactionId: 't1', purchasedAt: NOW.toISOString() }]);
    expect(next.hasEverPurchased).toBe(true);
  });

  it('does not move a known pass to a new Journey', () => {
    const e: EntitlementState = {
      journeyPasses: [{ journeyId: 'old', transactionId: 't1', purchasedAt: '2026-01-01T00:00:00.000Z' }],
      subscriptionActive: false,
      hasEverPurchased: true,
    };
    const next = reconcileEntitlement(
      e,
      { subscriptionActive: false, journeyPassTransactions: [{ transactionId: 't1', purchasedAt: '2026-01-01T00:00:00.000Z' }] },
      journey('new'),
      NOW,
      WINDOW
    );
    expect(next).toBe(e);
    expect(needsRenewalPrompt(next, journey('new'))).toBe(true);
  });

  it('restores a recent pass on a fresh install but ignores very old ones', () => {
    const recent = reconcileEntitlement(
      initialEntitlementState,
      { subscriptionActive: false, journeyPassTransactions: [{ transactionId: 't1', purchasedAt: '2025-12-01T00:00:00.000Z' }] },
      journey('a'),
      NOW,
      WINDOW
    );
    expect(isPremiumActiveForJourney(recent, journey('a'))).toBe(true);

    const old = reconcileEntitlement(
      initialEntitlementState,
      { subscriptionActive: false, journeyPassTransactions: [{ transactionId: 't0', purchasedAt: '2023-01-01T00:00:00.000Z' }] },
      journey('a'),
      NOW,
      WINDOW
    );
    expect(isPremiumActiveForJourney(old, journey('a'))).toBe(false);
    expect(old.hasEverPurchased).toBe(true);
  });

  it('mirrors subscription expiry', () => {
    const active = { ...initialEntitlementState, subscriptionActive: true, hasEverPurchased: true };
    const next = reconcileEntitlement(active, { subscriptionActive: false, journeyPassTransactions: [] }, journey('a'), NOW, WINDOW);
    expect(next.subscriptionActive).toBe(false);
    expect(next.hasEverPurchased).toBe(true);
  });

  it('never attaches to an archived Journey or with no Journey', () => {
    const snapshot = { subscriptionActive: false, journeyPassTransactions: [{ transactionId: 't1', purchasedAt: NOW.toISOString() }] };
    expect(reconcileEntitlement(initialEntitlementState, snapshot, null, NOW, WINDOW).journeyPasses).toEqual([]);
    expect(reconcileEntitlement(initialEntitlementState, snapshot, journey('a', 'archived'), NOW, WINDOW).journeyPasses).toEqual([]);
  });
});

describe('migrateEntitlement', () => {
  it('upgrades the v1 journeyPassIds shape', () => {
    const migrated = migrateEntitlement({ journeyPassIds: ['a'], subscriptionActive: false, hasEverPurchased: true });
    expect(migrated.journeyPasses.map((p) => p.journeyId)).toEqual(['a']);
    expect(isPremiumActiveForJourney(migrated, journey('a'))).toBe(true);
  });

  it('handles missing data', () => {
    expect(migrateEntitlement(undefined)).toEqual(initialEntitlementState);
  });
});
