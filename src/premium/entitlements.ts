/**
 * Entitlement / paywall rules.
 *
 * The App Store (via RevenueCat, see ./billing.ts) is the source of truth
 * for *what was bought*. This module only encodes the *rules* for how that
 * maps onto in-app access, as plain functions so they can be unit tested.
 *
 * Why the model looks the way it does:
 * StoreKit gives no developer API to pause and later auto-resume billing on
 * an auto-renewable subscription — only the subscriber can cancel it, in
 * iOS Settings. So instead of a "pausable" subscription there are two
 * independent entitlement sources:
 *
 * 1. Journey Pass (PRIMARY) — a Non-Renewing Subscription product in App
 *    Store Connect, bought once per Journey. It is scoped locally to the
 *    Journey that was active when it was bought (`journeyPasses`), never
 *    renews, and stays valid for that Journey after it archives. Buying
 *    one for the next Journey is simply another purchase — which is why it
 *    must be a non-renewing subscription and not a non-consumable (a
 *    non-consumable can only ever be bought once per Apple ID).
 *
 * 2. Monthly subscription (SECONDARY) — an auto-renewable subscription.
 *    It's not Journey-scoped (Apple has no such concept): it unlocks
 *    whichever Journey is active for as long as the subscriber pays,
 *    including across a Journey boundary. The paywall tells subscribers
 *    plainly that they must cancel it themselves.
 */
import type { Journey } from '../types/journey';

export interface JourneyPassRecord {
  journeyId: string;
  /** App Store transaction id; null for passes granted by the dev-only mock. */
  transactionId: string | null;
  purchasedAt: string;
}

export interface EntitlementState {
  /** Permanent — a pass is never revoked, including after its Journey archives. */
  journeyPasses: JourneyPassRecord[];
  /** Mirrors the store's "monthly subscription is currently active" state. Not Journey-scoped. */
  subscriptionActive: boolean;
  /** Has this device ever seen a purchase via either path. Used for renewal messaging only. */
  hasEverPurchased: boolean;
}

export const initialEntitlementState: EntitlementState = {
  journeyPasses: [],
  subscriptionActive: false,
  hasEverPurchased: false,
};

/** What the store reports, reduced to what the rules below need. */
export interface StoreSnapshot {
  subscriptionActive: boolean;
  journeyPassTransactions: { transactionId: string; purchasedAt: string }[];
}

export function hasJourneyPass(entitlement: EntitlementState, journeyId: string | null | undefined): boolean {
  if (!journeyId) return false;
  return entitlement.journeyPasses.some((pass) => pass.journeyId === journeyId);
}

/**
 * Whether premium is unlocked *for this specific Journey*. A Journey Pass
 * always unlocks its own Journey, even after archive. An active
 * subscription unlocks only the currently active Journey.
 */
export function isPremiumActiveForJourney(entitlement: EntitlementState, journey: Journey | null): boolean {
  if (!journey) return false;
  if (hasJourneyPass(entitlement, journey.id)) return true;
  return entitlement.subscriptionActive && journey.status === 'active';
}

/**
 * A returning purchaser just started a Journey that nothing covers. This
 * replaces the "auto-resume" behavior StoreKit can't support: we ask.
 */
export function needsRenewalPrompt(entitlement: EntitlementState, newJourney: Journey): boolean {
  return entitlement.hasEverPurchased && !isPremiumActiveForJourney(entitlement, newJourney);
}

function monthsBefore(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * Folds the store's view of purchases into local entitlement state.
 *
 * - Subscription state is mirrored as-is.
 * - A Journey Pass transaction we haven't seen before (a fresh purchase,
 *   or a restore on a new install where local Journeys were lost) is
 *   attached to the active Journey — but only if that Journey doesn't
 *   already have a pass and the purchase is recent enough to plausibly
 *   belong to it (`restoreWindowMonths`). Older unknown passes belong to
 *   Journeys that no longer exist on this device and are ignored.
 */
export function reconcileEntitlement(
  entitlement: EntitlementState,
  snapshot: StoreSnapshot,
  activeJourney: Journey | null,
  now: Date,
  restoreWindowMonths: number
): EntitlementState {
  const known = new Set(entitlement.journeyPasses.map((pass) => pass.transactionId).filter(Boolean));
  const unknown = snapshot.journeyPassTransactions
    .filter((tx) => !known.has(tx.transactionId))
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

  let journeyPasses = entitlement.journeyPasses;
  const cutoff = monthsBefore(now, restoreWindowMonths).getTime();
  const newest = unknown[0];
  if (
    newest &&
    activeJourney &&
    activeJourney.status === 'active' &&
    !hasJourneyPass(entitlement, activeJourney.id) &&
    new Date(newest.purchasedAt).getTime() >= cutoff
  ) {
    journeyPasses = [
      ...journeyPasses,
      { journeyId: activeJourney.id, transactionId: newest.transactionId, purchasedAt: newest.purchasedAt },
    ];
  }

  const subscriptionActive = snapshot.subscriptionActive;
  const hasEverPurchased =
    entitlement.hasEverPurchased || subscriptionActive || snapshot.journeyPassTransactions.length > 0;

  if (
    journeyPasses === entitlement.journeyPasses &&
    subscriptionActive === entitlement.subscriptionActive &&
    hasEverPurchased === entitlement.hasEverPurchased
  ) {
    return entitlement;
  }
  return { journeyPasses, subscriptionActive, hasEverPurchased };
}

/** Dev-only: grant a pass without the App Store (used when no RevenueCat key is configured in __DEV__). */
export function mockPurchaseJourneyPass(entitlement: EntitlementState, journeyId: string, now: Date): EntitlementState {
  if (hasJourneyPass(entitlement, journeyId)) return entitlement;
  return {
    ...entitlement,
    journeyPasses: [...entitlement.journeyPasses, { journeyId, transactionId: null, purchasedAt: now.toISOString() }],
    hasEverPurchased: true,
  };
}

/** Dev-only: toggle the mock subscription. A real one can only be cancelled by the subscriber. */
export function mockSetSubscription(entitlement: EntitlementState, active: boolean): EntitlementState {
  return { ...entitlement, subscriptionActive: active, hasEverPurchased: entitlement.hasEverPurchased || active };
}

/** Migrates the v1 persisted shape (`journeyPassIds: string[]`). */
export function migrateEntitlement(raw: unknown): EntitlementState {
  if (!raw || typeof raw !== 'object') return initialEntitlementState;
  const value = raw as Partial<EntitlementState> & { journeyPassIds?: string[] };
  const journeyPasses =
    value.journeyPasses ??
    (value.journeyPassIds ?? []).map((journeyId) => ({
      journeyId,
      transactionId: null,
      purchasedAt: new Date(0).toISOString(),
    }));
  return {
    journeyPasses,
    subscriptionActive: !!value.subscriptionActive,
    hasEverPurchased: !!value.hasEverPurchased || journeyPasses.length > 0,
  };
}
