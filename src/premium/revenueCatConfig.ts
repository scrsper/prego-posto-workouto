/**
 * RevenueCat / App Store Connect identifiers.
 *
 * These are placeholders — nothing under this session's access could
 * create a real RevenueCat project or App Store Connect app record (no
 * credentials, no Apple Developer account, no dashboard access). Replace
 * every value below with the real identifiers once those exist, and see
 * the "RevenueCat setup" section of the README for the exact dashboard/App
 * Store Connect steps this assumes.
 *
 * API keys are read from Expo public env vars (`EXPO_PUBLIC_*`), which get
 * inlined at build time and are NOT secret — RevenueCat's public SDK keys
 * are meant to ship inside the client binary (unlike the RevenueCat REST
 * API secret key, which must never appear in app code). Set these in an
 * `.env` file (untracked — see `.gitignore`) or your EAS Build secrets.
 */

export const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
export const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;

/**
 * The RevenueCat entitlement identifier that the auto-renewing monthly
 * subscription product grants. Journey Pass purchases deliberately do NOT
 * grant a RevenueCat entitlement of their own — see the long comment in
 * revenueCat.ts for why (in short: RevenueCat entitlements are a poor fit
 * for "per-Journey" scoping, so Journey Pass ownership is tracked as a
 * plain non-subscription purchase and correlated to a Journey id locally).
 */
export const SUBSCRIPTION_ENTITLEMENT_ID = 'premium_subscription';

/** The default RevenueCat Offering identifier to fetch packages from. */
export const DEFAULT_OFFERING_ID = 'default';

/**
 * Package identifiers within that Offering, as configured in the
 * RevenueCat dashboard. The subscription package should be attached to
 * `SUBSCRIPTION_ENTITLEMENT_ID` above; the Journey Pass package should be a
 * plain non-subscription product (a "Non-Renewing Subscription" or
 * "Non-Consumable" in App Store Connect — see README) with NO entitlement
 * attached.
 */
export const JOURNEY_PASS_PACKAGE_ID = 'journey_pass';
export const MONTHLY_SUBSCRIPTION_PACKAGE_ID = '$rc_monthly';
