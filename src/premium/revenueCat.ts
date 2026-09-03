/**
 * Thin wrapper around the RevenueCat SDK (`react-native-purchases`).
 *
 * PRIVACY: this file is the ONLY place in this app's code that sends any
 * data off the user's device. It sends an anonymous, RevenueCat-generated
 * app user ID plus purchase/transaction data to RevenueCat — never any
 * Journey/health data (mood, symptoms, delivery details, etc.), which
 * stays in local AsyncStorage (see journeyStore.ts). If you add analytics,
 * crash reporting, or a backend anywhere else in this app, update
 * PRIVACY_POLICY.md and APP_STORE_PRIVACY.md at the project root — both
 * were written assuming this is the only off-device data flow.
 *
 * IMPORTANT — this is a native module. It does NOT work in Expo Go; you
 * need a custom dev client (`npx expo run:ios` / `eas build --profile
 * development`) or a production build. `configureRevenueCat()` detects
 * this at runtime (the native call throws) and reports failure rather than
 * crashing, so the rest of the app can fall back to the local mock in
 * `entitlements.ts` — see `journeyStore.ts`'s `initializePurchases`.
 *
 * WHY JOURNEY PASS OWNERSHIP ISN'T A REVENUECAT ENTITLEMENT:
 * RevenueCat's "entitlement" concept is a single global on/off flag per
 * user (e.g. "premium_subscription": active or not) — it has no concept of
 * our app-specific "Journey" scoping. A Journey Pass is a plain
 * non-subscription purchase (App Store Connect: a Non-Renewing
 * Subscription or Non-Consumable) with NO RevenueCat entitlement attached.
 * We record which Journey a given purchase was for entirely on our side
 * (`journeyStore.purchaseJourneyPass(journeyId)`), the moment the RevenueCat
 * purchase call resolves successfully — RevenueCat is the source of truth
 * for "did a real payment happen", our own store is the source of truth
 * for "which Journey was it for".
 *
 * KNOWN LIMITATION this implies: `nonSubscriptionTransactions` from
 * `restorePurchases()` tells you a Journey Pass product was bought and
 * when — not which Journey it was for. On a fresh install/new device,
 * restoring purchases can correctly tell the user "you've bought a Journey
 * Pass before" (useful for support/refund questions) but cannot
 * automatically re-associate it with a specific Journey unless Journey data
 * itself is also synced off-device (see README "Known gaps": cloud sync).
 * `restorePurchasesAndReconcile()` below does the best it can: it re-checks
 * the *subscription* entitlement (which has no such problem, since it's
 * global) and leaves Journey Pass reconciliation as an explicit surfaced
 * case for the caller to handle (see PaywallScreen's restore handler).
 */
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  DEFAULT_OFFERING_ID,
  JOURNEY_PASS_PACKAGE_ID,
  MONTHLY_SUBSCRIPTION_PACKAGE_ID,
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
  SUBSCRIPTION_ENTITLEMENT_ID,
} from './revenueCatConfig';

let hasAttemptedConfigure = false;
let configuredSuccessfully = false;

export function isRevenueCatConfigured(): boolean {
  return configuredSuccessfully;
}

/**
 * Configures the RevenueCat SDK exactly once per app session. Safe to call
 * from multiple places (e.g. app start and a retry button) — subsequent
 * calls are no-ops. Returns whether configuration actually succeeded.
 */
export function configureRevenueCat(): boolean {
  if (hasAttemptedConfigure) return configuredSuccessfully;
  hasAttemptedConfigure = true;

  const apiKey = Platform.select({
    ios: REVENUECAT_API_KEY_IOS,
    android: REVENUECAT_API_KEY_ANDROID,
    default: null as string | null,
  });

  if (!apiKey) {
    console.warn(
      '[revenueCat] No API key set (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / ' +
        '_ANDROID_API_KEY) — falling back to the local mock. See README "RevenueCat setup".'
    );
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    // PRIVACY: from this point on, the RevenueCat SDK can talk to
    // RevenueCat's servers on its own (purchases, restores, entitlement
    // syncs) — see the file-level PRIVACY note above for exactly what
    // that does and doesn't include.
    Purchases.configure({ apiKey });
    configuredSuccessfully = true;
  } catch (error) {
    // Expected in Expo Go, or any environment without the native module
    // linked (e.g. a bare Metro/web bundle without a prebuild).
    console.warn(
      '[revenueCat] Purchases.configure() threw — the native module is likely unavailable ' +
        '(Expo Go?). Falling back to the local mock. Use a custom dev client to test real purchases.',
      error
    );
    configuredSuccessfully = false;
  }
  return configuredSuccessfully;
}

async function fetchPackage(packageId: string): Promise<PurchasesPackage | null> {
  if (!configuredSuccessfully) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[DEFAULT_OFFERING_ID] ?? offerings.current;
    if (!offering) return null;
    return offering.availablePackages.find((pkg) => pkg.identifier === packageId) ?? null;
  } catch (error) {
    console.warn('[revenueCat] Failed to fetch offerings', error);
    return null;
  }
}

export function fetchJourneyPassPackage(): Promise<PurchasesPackage | null> {
  return fetchPackage(JOURNEY_PASS_PACKAGE_ID);
}

export function fetchSubscriptionPackage(): Promise<PurchasesPackage | null> {
  return fetchPackage(MONTHLY_SUBSCRIPTION_PACKAGE_ID);
}

export type PurchaseOutcome =
  | { status: 'success'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function isUserCancelledError(error: unknown): boolean {
  const purchasesError = error as Partial<PurchasesError> | undefined;
  return (
    purchasesError?.userCancelled === true ||
    purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'success', customerInfo };
  } catch (error) {
    if (isUserCancelledError(error)) {
      return { status: 'cancelled' };
    }
    const message = error instanceof Error ? error.message : 'Unknown purchase error';
    console.warn('[revenueCat] Purchase failed', error);
    return { status: 'error', message };
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configuredSuccessfully) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    console.warn('[revenueCat] Restore failed', error);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configuredSuccessfully) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.warn('[revenueCat] getCustomerInfo failed', error);
    return null;
  }
}

/** Subscribes to live entitlement changes (renewals, expirations, refunds happening outside the app). Returns an unsubscribe function. */
export function subscribeToCustomerInfoUpdates(listener: (info: CustomerInfo) => void): () => void {
  if (!configuredSuccessfully) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export function isSubscriptionEntitlementActive(info: CustomerInfo): boolean {
  return !!info.entitlements.active[SUBSCRIPTION_ENTITLEMENT_ID];
}

/** True if this customer has EVER bought a Journey Pass product (any Journey) — see the module-level note on why this can't tell us which Journey. */
export function hasEverPurchasedJourneyPass(info: CustomerInfo, journeyPassProductId: string): boolean {
  return info.nonSubscriptionTransactions.some((t) => t.productIdentifier === journeyPassProductId);
}

/** Deep-links to the platform's native subscription-management screen. Falls back to null if RevenueCat has no URL for this customer (e.g. no active store subscription). */
export function subscriptionManagementUrl(info: CustomerInfo): string | null {
  return info.managementURL;
}
