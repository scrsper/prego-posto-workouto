/**
 * App Store billing, via RevenueCat (`react-native-purchases`).
 *
 * Three modes:
 * - `store`       — a RevenueCat iOS key is configured: real StoreKit
 *                   purchases (sandbox in TestFlight/dev builds).
 * - `dev_mock`    — no key, `__DEV__` build: purchases are simulated
 *                   locally so the premium UI can be exercised.
 * - `unavailable` — no key in a release build: the paywall says purchases
 *                   are unavailable instead of pretending to sell anything.
 *
 * Nothing here decides who gets premium — that's ./entitlements.ts, fed by
 * the `StoreSnapshot`s this module produces.
 */
import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from 'react-native-purchases';
import { APP_CONFIG } from '../config';
import type { StoreSnapshot } from './entitlements';

export type BillingMode = 'store' | 'dev_mock' | 'unavailable';

export const billingMode: BillingMode =
  APP_CONFIG.revenueCatIosApiKey && Platform.OS === 'ios' ? 'store' : __DEV__ ? 'dev_mock' : 'unavailable';

export interface StoreProducts {
  journeyPass: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
}

export type PurchaseOutcome = { status: 'purchased'; snapshot: StoreSnapshot } | { status: 'cancelled' };

export function snapshotFromCustomerInfo(info: CustomerInfo): StoreSnapshot {
  const { monthlySubscriptionProductId, journeyPassProductId } = APP_CONFIG;
  const subscriptionActive =
    info.activeSubscriptions.includes(monthlySubscriptionProductId) ||
    Object.values(info.entitlements.active).some(
      (entitlement) => entitlement.productIdentifier === monthlySubscriptionProductId
    );
  return {
    subscriptionActive,
    journeyPassTransactions: info.nonSubscriptionTransactions
      .filter((tx) => tx.productIdentifier === journeyPassProductId)
      .map((tx) => ({ transactionId: tx.transactionIdentifier, purchasedAt: tx.purchaseDate })),
  };
}

let isConfigured = false;

/**
 * Configures RevenueCat once and streams every CustomerInfo update (renewals,
 * expirations, refunds, purchases made on another device) to `onSnapshot`.
 * Returns an unsubscribe function.
 */
export function configureBilling(onSnapshot: (snapshot: StoreSnapshot) => void): () => void {
  if (billingMode !== 'store') return () => {};
  if (!isConfigured) {
    if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: APP_CONFIG.revenueCatIosApiKey });
    isConfigured = true;
  }
  const listener: CustomerInfoUpdateListener = (info) => onSnapshot(snapshotFromCustomerInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  Purchases.getCustomerInfo()
    .then(listener)
    .catch(() => {
      // Offline at launch: keep the last persisted entitlement until the next update.
    });
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function loadProducts(): Promise<StoreProducts> {
  if (billingMode !== 'store') return { journeyPass: null, monthly: null };
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[APP_CONFIG.offeringId] ?? offerings.current;
  const packages = offering?.availablePackages ?? [];
  const find = (productId: string) => packages.find((pkg) => pkg.product.identifier === productId) ?? null;
  return {
    journeyPass: find(APP_CONFIG.journeyPassProductId),
    monthly: find(APP_CONFIG.monthlySubscriptionProductId),
  };
}

function isCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, userCancelled } = error as { code?: unknown; userCancelled?: unknown };
  return userCancelled === true || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'purchased', snapshot: snapshotFromCustomerInfo(customerInfo) };
  } catch (error) {
    if (isCancellation(error)) return { status: 'cancelled' };
    throw error;
  }
}

export async function restorePurchases(): Promise<StoreSnapshot> {
  const info = await Purchases.restorePurchases();
  return snapshotFromCustomerInfo(info);
}

/**
 * Opens Apple's subscription management sheet — the only place a real
 * auto-renewing subscription can be cancelled. There is no in-app cancel API.
 */
export async function openManageSubscriptions(): Promise<void> {
  if (billingMode === 'store') {
    try {
      await Purchases.showManageSubscriptions();
      return;
    } catch {
      // fall through to the App Store deep link
    }
  }
  await Linking.openURL('https://apps.apple.com/account/subscriptions');
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Something went wrong talking to the App Store. Please try again.';
}
