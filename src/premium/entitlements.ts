/**
 * Entitlement / paywall logic.
 *
 * Production integration point: replace `mockPurchaseJourneyPass` /
 * `mockActivateSubscription` / `mockDeactivateSubscription` below with
 * RevenueCat (`react-native-purchases`). RevenueCat should own the source of
 * truth for purchase/subscription state; this module only encodes the
 * *rules* of how that state maps to in-app access, so the rules survive the
 * swap from mock to real billing.
 *
 * IMPORTANT — why this model looks the way it does:
 * StoreKit gives no developer API to programmatically pause and later
 * auto-resume billing on an auto-renewable subscription. Only the
 * subscriber can cancel it (in iOS Settings), and Apple only lets a
 * developer offer discounts/promotional offers on top of an existing
 * subscription — not pause-and-resume the charge itself. An earlier version
 * of this file modeled a "pausable" subscription; that was not
 * implementable against real StoreKit and has been removed.
 *
 * The model here instead has two independent entitlement sources:
 *
 * 1. `journeyPassIds` — a non-renewing, one-time "Full Journey Pass"
 *    purchase, scoped to one specific Journey by id. This is the PRIMARY,
 *    default offering. It never expires, never renews, and needs no pause
 *    logic: since it's already scoped to a single Journey, there's nothing
 *    to pause — buying a new Journey Pass for the next Journey is simply a
 *    new (non-renewing) purchase, which is what real App Store non-renewing
 *    subscriptions/non-consumables are anyway.
 *
 * 2. `subscriptionActive` — a SECONDARY, opt-in $9.99/mo auto-renewing
 *    subscription for users who prefer that model. It is NOT scoped to a
 *    Journey (Apple has no concept of that), just a boolean mirroring
 *    RevenueCat's "is this entitlement currently active" flag. It unlocks
 *    premium for whichever Journey is currently active, for as long as the
 *    subscriber keeps paying — including across a Journey archive/new
 *    Journey boundary, since we cannot detect or act on that boundary from
 *    the billing side. In-app copy must tell subscribers this plainly and
 *    remind them to cancel it themselves (in iOS Settings) once they no
 *    longer need it — see PaywallScreen.
 */
import type { Journey } from '../types/journey';

export interface EntitlementState {
  /** Journey IDs that have a purchased, non-renewing Full Journey Pass. Permanent — never revoked. */
  journeyPassIds: string[];
  /** Mirrors RevenueCat's auto-renewing subscription "is active" flag. Not Journey-scoped. */
  subscriptionActive: boolean;
  /** Lifetime flag: has this account ever purchased premium via either path. Used for renewal/win-back messaging only. */
  hasEverPurchased: boolean;
  /**
   * App Store reviewer / QA demo unlock — see src/premium/demoMode.ts.
   * Defaults false and requires a hidden gesture + secret code to enable
   * (SettingsScreen), so it never ships "on" and can't be flipped by an
   * ordinary user browsing the app normally. When true, unlocks premium
   * for every Journey without a real purchase.
   */
  demoModeEnabled: boolean;
}

export const initialEntitlementState: EntitlementState = {
  journeyPassIds: [],
  subscriptionActive: false,
  hasEverPurchased: false,
  demoModeEnabled: false,
};

/**
 * Whether premium features should be unlocked *for this specific Journey*.
 * A Journey Pass purchased for this Journey always unlocks it, even after
 * archive. An active subscription unlocks premium for whichever Journey is
 * currently active (it can't distinguish Journeys), so it does not unlock
 * an already-archived Journey once a different one becomes active. Demo
 * mode (see EntitlementState.demoModeEnabled) unconditionally unlocks
 * everything, for App Store review / QA.
 */
export function isPremiumActiveForJourney(
  entitlement: EntitlementState,
  journey: Journey | null
): boolean {
  if (!journey) return false;
  if (entitlement.demoModeEnabled) return true;
  if (entitlement.journeyPassIds.includes(journey.id)) return true;
  if (entitlement.subscriptionActive && journey.status === 'active') return true;
  return false;
}

/**
 * Whether the user should be prompted to renew premium for a Journey they
 * just started — i.e. they've purchased premium before, but neither a pass
 * nor an active subscription covers this new Journey. This is the honest
 * replacement for the "auto-resume a paused subscription" behavior that
 * isn't implementable: instead of resuming automatically, we ask.
 */
export function needsRenewalPrompt(entitlement: EntitlementState, newJourney: Journey): boolean {
  return entitlement.hasEverPurchased && !isPremiumActiveForJourney(entitlement, newJourney);
}

/**
 * Records that `journeyId` now has a purchased Journey Pass. Pure local
 * state — the caller (journeyStore) is responsible for having already
 * confirmed the purchase actually happened, whether via a real RevenueCat
 * purchase or (in a build with no RevenueCat API key configured, e.g.
 * Expo Go) the local dev-only fallback.
 */
export function recordJourneyPassPurchase(entitlement: EntitlementState, journeyId: string): EntitlementState {
  if (entitlement.journeyPassIds.includes(journeyId)) return entitlement;
  return {
    ...entitlement,
    journeyPassIds: [...entitlement.journeyPassIds, journeyId],
    hasEverPurchased: true,
  };
}

/**
 * Sets the (global, not Journey-scoped) subscription flag. Pure local
 * state, meant to mirror whatever RevenueCat's `CustomerInfo` last reported
 * — see journeyStore's `initializePurchases`/`restorePurchases`. A REAL
 * subscription cannot be cancelled from in-app code — only the subscriber
 * can cancel it, via iOS Settings > [Apple ID] > Subscriptions (or a
 * RevenueCat-hosted manage-subscriptions link) — so passing `false` here
 * should only ever happen because RevenueCat reported the subscription as
 * no longer active, or (dev-only, with no RevenueCat configured) a local
 * simulate-cancel control. See PaywallScreen.
 */
export function setSubscriptionActive(entitlement: EntitlementState, active: boolean): EntitlementState {
  return {
    ...entitlement,
    subscriptionActive: active,
    hasEverPurchased: entitlement.hasEverPurchased || active,
  };
}

/** Pure local state setter for the demo-mode unlock — see EntitlementState.demoModeEnabled. */
export function setDemoModeEnabled(entitlement: EntitlementState, enabled: boolean): EntitlementState {
  return { ...entitlement, demoModeEnabled: enabled };
}

export interface PremiumFeatureFlags {
  personalizedProgramBranching: boolean;
  advancedExerciseLibrary: boolean;
  downloadableClearanceSummary: boolean;
  adFree: boolean;
  crossJourneyAnalytics: boolean;
  partnerViewerSeat: boolean;
}

export function premiumFeatureFlags(active: boolean): PremiumFeatureFlags {
  return {
    personalizedProgramBranching: active,
    advancedExerciseLibrary: active,
    downloadableClearanceSummary: active,
    adFree: active,
    crossJourneyAnalytics: active,
    partnerViewerSeat: active,
  };
}
