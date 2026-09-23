/**
 * App Store (and Google Play) reviewer / QA demo unlock.
 *
 * Apple's review guidelines require apps with paid unlocks to give
 * reviewers a way to see the paid content without actually paying (App
 * Review Guideline 3.1.1 and general review practice). Reviewers test the
 * real submitted binary (TestFlight/production), not a dev build, so a
 * `__DEV__`-only unlock doesn't work for this — this needs to exist in
 * release builds too, gated by obscurity instead: a hidden gesture plus a
 * short secret code, both documented privately to reviewers in
 * `APP_REVIEW_NOTES.md` (App Store Connect's "App Review > Notes" field),
 * never surfaced in any visible UI, help text, or marketing copy.
 *
 * HONEST LIMITATION: this is a client-side secret baked into (or read at
 * build time into) the app binary. Like any such secret, it can in
 * principle be extracted by a sufficiently motivated user via binary
 * inspection — this is the same accepted trade-off every "reviewer demo
 * code" scheme makes, not a bug specific to this implementation. It's not
 * meant to be cryptographically secure, only to keep the unlock out of
 * reach of an ordinary user tapping around the app. If this repository is
 * public or shared beyond the team who submits to the App Store, treat
 * the default value below as already-known and override it via the
 * EXPO_PUBLIC_DEMO_MODE_CODE env var (same pattern as the RevenueCat keys
 * in revenueCatConfig.ts) before a real submission, and rotate it between
 * submissions if you want extra caution.
 */

export const DEMO_MODE_UNLOCK_CODE = process.env.EXPO_PUBLIC_DEMO_MODE_CODE ?? '277747';

/** How many taps on the hidden trigger (SettingsScreen's app name/version text) reveal the code entry field. */
export const DEMO_MODE_TAP_COUNT = 7;

/** Taps must land within this window (ms) of each other, or the counter resets — so it can't be triggered by accident. */
export const DEMO_MODE_TAP_WINDOW_MS = 2500;
