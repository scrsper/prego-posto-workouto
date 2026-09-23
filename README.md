# Prego Posto

A safety-first **iPhone** fitness and recovery app for pregnancy through 12
months postpartum. It's built around a bounded **Journey** — due date (or
"trying to conceive") through 12 months after birth — that archives instead
of expiring, so it can be picked back up for a future pregnancy without
losing anything.

iOS only (iPhone, portrait). Built with Expo SDK 57 / React Native 0.86.

## What's in the app

| Tab | What it does |
|---|---|
| **Today** | Journey progress, **today's guided routine** (phase-safe, rotates daily), streak, quick links to check-in / kick counter / contraction timer / "baby's here", warning signs |
| **Exercises** | Library filtered by category, sorted by what's tagged for your current phase; each exercise can be started on its own |
| **Track** | Workout, check-in, and weekly stats history |
| **Learn** | Articles (some premium) |
| **Settings** | Birth details, provider clearance, provider-visit summary (premium), personalization, daily reminder, plan, data export, delete all data, privacy |

**Guided workout player** (`WorkoutPlayerScreen`) — full-screen, keeps the
screen awake, and paces each set: a "get into position" countdown with the
exercise's steps, rep-by-rep pacing from the exercise's tempo (with a haptic
tap per rep and the animated muscle figure), timed holds, rest timers,
spoken cues (`expo-speech`, mutable), and auto-pause if the app goes to the
background. A stop button is always visible; "I feel unwell" ends the
session and goes straight to the warning-signs screen. Sessions are saved
with how they felt.

Other iOS-native touches: SF Symbols throughout (`expo-symbols`), native
inline date pickers, page-sheet modals with a Close button, haptics on
every tracker, local daily reminders, the iOS share sheet for exports, and
`SKStoreReviewController` (only after a few good workouts).

## Running it

You need a Mac with Xcode for a local build, or use EAS Build from anywhere.
Several native modules (RevenueCat, SF Symbols, date picker, speech) mean
this runs in a **development build**, not Expo Go.

```bash
npm install
npx expo run:ios            # local simulator build (Mac + Xcode)
# or, from any machine:
npx eas build --profile development --platform ios   # simulator dev client
npm start                   # then open the dev client
```

Checks that run anywhere:

```bash
npm run typecheck           # tsc --noEmit
npm test                    # jest (jest-expo/ios): routine, workout steps, entitlements, tracking, date math
npx expo export --platform ios   # bundles the full app to Hermes bytecode
```

### Configuration

Copy `.env.example` → `.env.local` (git-ignored), or set these on the EAS
build profile:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public iOS key. **Empty in a dev build → purchases are simulated locally**; empty in a release build → the paywall says purchases are unavailable. |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Hosted privacy policy, linked from the paywall and Privacy screen. |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Optional "Contact support" row. |
| `EXPO_PUBLIC_TERMS_URL` | Optional; defaults to Apple's standard EULA. |

Product IDs and other constants live in `src/config.ts`. The bundle
identifier is `com.scrsper.pregoposto` in `app.json` — change it to one you
own before your first build.

## Shipping to the App Store

1. **App Store Connect → In-App Purchases**, create two products (IDs must
   match `src/config.ts`):
   - `journey_pass` — **Non-Renewing Subscription**. Not a non-consumable:
     a non-consumable can only be bought once per Apple ID, and a returning
     user needs a new pass for each Journey.
   - `premium_monthly` — **Auto-Renewable Subscription**, 1 month.
2. **RevenueCat**: add the iOS app, import both products, and put them in an
   offering with identifier `default` (or make it the current offering).
   Entitlement setup is optional — the app reads product IDs directly.
   Copy the public iOS key into `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
3. **Build & submit**: `npm run build:ios`, then `npm run submit:ios`
   (`eas.json` has `development`, `development-device`, `preview`, and
   `production` profiles; build numbers auto-increment remotely).
4. **App Privacy** questionnaire: no tracking; data collected is limited to
   **Purchases** (via RevenueCat), not linked to identity, for app
   functionality. Health data never leaves the device. This matches the
   privacy manifest in `app.json` (`ios.privacyManifests`) — double-check
   against RevenueCat's current guidance when you fill it in.
5. **Export compliance** is pre-answered (`ITSAppUsesNonExemptEncryption = false`).
6. **Before submitting**, the clinical review in
   `CONTENT_REVIEW_CHECKLIST.md` must be done — see *Safety framework*.

Paywall compliance already in place: live App Store prices (never
hard-coded in release), **Restore purchases**, auto-renewal disclosure,
Terms of Use + Privacy Policy links, and a Manage Subscription link (there
is no in-app cancel API). Apple also requires the app to be usable without
buying anything: all safety content, tracking, and the core routines are
free.

## Where things live

```
App.tsx                       Splash gating, billing listener, reminder deep link, error boundary
app.json / eas.json           iOS config (bundle id, privacy manifest, plugins) and build profiles
plugins/                      Config plugin that strips the unused push entitlement
src/
  config.ts                   Product IDs, URLs, env-driven settings
  types/journey.ts            Domain types (Journey, phases, exercises, prescriptions, workouts)
  data/                       Exercises (with prescriptions), red flags, articles — all UNREVIEWED
  utils/
    pregnancyDates.ts         Due-date / trimester / postpartum-week math
    safety.ts                 Phase eligibility check
    workout.ts                Daily routine builder, workout step engine, streak stats
    tracking.ts               Contraction stats, kick timing, provider-visit summary
  state/journeyStore.ts       Zustand store persisted to AsyncStorage (v2 schema + migration)
  state/hooks.ts              Journey context + stable selectors
  premium/entitlements.ts     Pure entitlement rules (pass scoping, restore, renewal)
  premium/billing.ts          RevenueCat wrapper (store / dev_mock / unavailable)
  notifications/reminders.ts  Local daily reminder
  components/                 Shared UI, animated anatomical SVG rig, safety components
  screens/                    One file per screen
  navigation/                 Root stack (modals, full-screen player) + SF Symbol tabs
```

## The Journey / reset mechanic

Only one Journey is active at a time; starting a new one archives the
current one. `runAutoArchiveSweep()` archives a Journey 12 months after
actual (or estimated) delivery. Archived Journeys and all their data are
kept forever on every tier and browsable from Journey History (premium adds
a side-by-side comparison). Postpartum weeks count from the **birth date**
entered on the Birth Details screen, falling back to the due date.

## Monetization

StoreKit has no API to pause and auto-resume an auto-renewable
subscription, so there are two honest entitlement sources
(`src/premium/entitlements.ts`):

- **Journey Pass** (primary) — non-renewing, attached to the Journey that was
  active when bought, valid for it forever. On a fresh install, *Restore
  purchases* re-attaches a pass bought within the last 22 months (the
  longest possible Journey) to the current Journey; older passes belong to
  Journeys that no longer exist on the device.
- **Monthly subscription** (secondary) — unlocks whichever Journey is active
  while it's paid; the paywall says plainly that it keeps renewing after a
  Journey ends until cancelled in Settings.

`needsRenewalPrompt()` routes a returning purchaser to the paywall after
starting a new Journey instead of pretending to "resume" anything.

Premium includes: personalized routine ordering (diastasis recti, C-section,
multiples), advanced progression exercises (also requires the provider
clearance acknowledgment), premium articles, the shareable provider-visit
summary, and cross-Journey comparison.

## Safety framework

- The warning-signs screen (with Call 911 / 988 / Maternal Mental Health
  Hotline), the standing disclaimer, check-ins, and all trackers are never
  premium-gated.
- Every exercise carries `eligiblePhases`, `avoidIf`, and `modifyIf`. The
  daily routine only ever contains exercises tagged for the current phase,
  and hard relevance filters (e.g. no scar work without a cesarean, no side
  bends with moderate/severe diastasis) apply to everyone.
- **All exercise, prescription, article, and red-flag content is AI-drafted
  placeholder content that has not been clinically reviewed.** It must be
  reviewed and signed off by a certified pre/postnatal fitness specialist or
  pelvic floor PT (and an OB/midwife for red flags) using
  `CONTENT_REVIEW_CHECKLIST.md` before real users see it. Dev builds show a
  red banner as a reminder. App Review scrutinizes health claims (guideline
  1.4.1).

## What's been verified, and where

Built in a Linux container with no Xcode, simulator, or device, and with
`docs.expo.dev` / `api.expo.dev` blocked by network policy (so Expo APIs
were checked against the installed SDK 57 packages' type definitions and
config-plugin source rather than the web docs). Verified here:

- `tsc --noEmit` — clean.
- `jest` — 29 tests over the routine builder, workout step engine, streaks,
  entitlement reconciliation/restore/migration, contraction stats, provider
  summary, and phase math. These caught and fixed an existing off-by-one in
  the week math (calendar-week boundaries instead of completed 7-day weeks),
  which affects which exercises unlock at which postpartum week.
- `expo export --platform ios` — the whole app bundles to Hermes bytecode.
- `expo prebuild --platform ios` — generates the native project; confirmed
  bundle id, iPhone-only device family, iOS 16.4 target, light mode,
  `ITSAppUsesNonExemptEncryption = false`, the privacy manifest, and an
  empty entitlements file (no unused push capability).
- `expo-doctor` / `expo install --check` — all checks pass except the two
  that need the blocked network (config schema, React Native Directory).

**Not yet verified — do this on a Mac before submitting:** running on a
simulator and a real iPhone (especially the workout player's timing,
haptics and speech, the SVG pulse animation on Fabric, and the date
pickers), and a sandbox purchase + restore of both products through
RevenueCat in a TestFlight build.

## Known gaps / next steps

- Clinical review of all content (above) — the one hard blocker for launch.
- Real commissioned anatomical illustrations (the SVG rig is a geometric
  placeholder; swap shapes in `anatomy/muscleGeometry.ts`, keyed by muscle).
- Dark mode (the app is currently locked to light appearance).
- iPad layouts (disabled: `supportsTablet: false`).
- Apple Health (HealthKit) workout export, iCloud sync, a partner view.
