/**
 * Entitlement / paywall logic.
 *
 * Production integration point: replace `mockPurchase` / `mockRestore` below
 * with RevenueCat (`react-native-purchases`). RevenueCat should own the
 * source of truth for subscription state; this module only encodes the
 * *rules* of how that state maps to in-app access, so the rules survive the
 * swap from mock to real billing.
 *
 * Core rule (see PRD "Recommended Monetization Model"): the $9.99/mo plan is
 * bound to a single Journey. When that Journey archives, the plan is placed
 * in `paused` state (billing should stop server-side via RevenueCat/App
 * Store subscription pause or a scheduled cancel-and-refund-prorated flow)
 * and access reverts to free-tier — but only for premium *features*. Free
 * data (history, red-flag guidance, journey timeline) is never gated.
 */
import type { Journey } from '../types/journey';

export type SubscriptionPlan = 'none' | 'monthly_pausable' | 'full_journey_pass';

export interface EntitlementState {
  plan: SubscriptionPlan;
  /** Journey the current plan is bound to. Null when plan is 'none' or paused with no target. */
  boundJourneyId: string | null;
  /** True once the subscription has been paused because its bound Journey archived. */
  isPaused: boolean;
  /** Lifetime flag: has this account ever purchased premium at least once. Used for win-back messaging only. */
  hasEverSubscribed: boolean;
}

export const initialEntitlementState: EntitlementState = {
  plan: 'none',
  boundJourneyId: null,
  isPaused: false,
  hasEverSubscribed: false,
};

/** Whether premium features should be unlocked *for this specific Journey*. */
export function isPremiumActiveForJourney(
  entitlement: EntitlementState,
  journey: Journey | null
): boolean {
  if (!journey) return false;
  if (entitlement.plan === 'none') return false;
  if (entitlement.isPaused) return false;
  return entitlement.boundJourneyId === journey.id;
}

/** Called when a Journey is archived. Pauses (never cancels) a pausable plan. */
export function pauseEntitlementOnJourneyArchive(
  entitlement: EntitlementState,
  archivedJourneyId: string
): EntitlementState {
  if (entitlement.plan !== 'monthly_pausable' || entitlement.boundJourneyId !== archivedJourneyId) {
    return entitlement;
  }
  return { ...entitlement, isPaused: true };
}

/** One-tap "resume premium" when starting a new Journey after a pause. No re-purchase required. */
export function resumeEntitlementForNewJourney(
  entitlement: EntitlementState,
  newJourneyId: string
): EntitlementState {
  if (entitlement.plan === 'none') return entitlement;
  return { ...entitlement, isPaused: false, boundJourneyId: newJourneyId };
}

export function mockPurchase(
  entitlement: EntitlementState,
  plan: Exclude<SubscriptionPlan, 'none'>,
  journeyId: string
): EntitlementState {
  return {
    plan,
    boundJourneyId: journeyId,
    isPaused: false,
    hasEverSubscribed: true,
  };
}

export function mockCancel(entitlement: EntitlementState): EntitlementState {
  return { ...entitlement, plan: 'none', boundJourneyId: null, isPaused: false };
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
