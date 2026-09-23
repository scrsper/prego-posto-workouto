/**
 * Release configuration. Values that differ per environment come from
 * `EXPO_PUBLIC_*` variables (set them in eas.json's build profiles or an
 * .env file); everything else is a constant that must match what's set up
 * in App Store Connect and RevenueCat. See README → "Shipping to the App
 * Store" for the matching dashboard setup.
 */
export const APP_CONFIG = {
  /** RevenueCat public iOS SDK key (starts with `appl_`). Empty → billing unavailable. */
  revenueCatIosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',

  /** App Store Connect product: Non-Renewing Subscription, one per Journey. */
  journeyPassProductId: 'journey_pass',
  /** App Store Connect product: Auto-Renewable Subscription, 1 month. */
  monthlySubscriptionProductId: 'premium_monthly',
  /** RevenueCat offering that contains both packages (usually the "current" offering). */
  offeringId: 'default',

  /**
   * A Journey spans at most ~42 weeks of pregnancy + 12 months postpartum.
   * When restoring purchases on a fresh install, a Journey Pass bought
   * within this window is re-attached to the current Journey.
   */
  journeyPassRestoreWindowMonths: 22,

  /** Required on the paywall for auto-renewable subscriptions (App Review 3.1.2). */
  termsOfUseUrl:
    process.env.EXPO_PUBLIC_TERMS_URL || 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  /** Hosted copy of the privacy policy (App Store Connect requires a URL too). Empty → in-app policy only. */
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '',
} as const;
