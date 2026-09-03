# Prego Posto Workouto

A safety-first pregnancy-to-postpartum fitness and recovery app, built around a
bounded **Journey** — due date (or "trying to conceive") through 12 months
postpartum — that archives instead of expiring, so a woman can pick it back up
for a future pregnancy without losing anything.

Built with Expo (React Native), following the AI-coding build path from the
product spec.

## Stack

- **Expo SDK 57 / React Native 0.86 / React 19**, TypeScript, New Architecture.
- **`react-native-svg` + `react-native-reanimated` v4** for the animated
  anatomical exercise system.
- **Zustand**, persisted to `@react-native-async-storage/async-storage`, for
  Journey / check-in / entitlement state (swap-in point for Supabase/Firebase
  if you want sync across devices — see `src/state/journeyStore.ts`).
- **`@react-navigation`** (native-stack + bottom-tabs) for navigation.
- Premium entitlement rules are implemented as plain, testable functions in
  `src/premium/entitlements.ts`, ready to sit behind RevenueCat.

## Getting started

```bash
npm install
npm run ios      # or: npm run android / npm run web
```

### What's been verified, and where

This has been built and iterated in a sandboxed Linux container with **no
Xcode, no iOS Simulator, no Android SDK/emulator, and no physical device** —
and no route to `api.expo.dev` / `reactnative.directory` either (outbound
network policy). That rules out an actual on-device run from this
environment, full stop. What *was* verified here, using `EXPO_OFFLINE=1` to
get past the network policy for the checks that support it:

- `npx tsc --noEmit` — clean, no type errors.
- `npx expo export --platform web` — the full app (1,346+ modules, every
  screen, the SVG rig, reanimated worklets, and navigation) bundles
  successfully.
- `npx expo install --check` (offline mode) — flagged six dependencies
  (`@react-native-async-storage/async-storage`, `react-native-gesture-handler`,
  `react-native-reanimated`, `react-native-safe-area-context`,
  `react-native-screens`, `react-native-svg`) that had drifted ahead of the
  versions this Expo SDK actually bundles/tests against, because they were
  originally installed with plain `npm install` rather than `expo install`.
  Pinned all six back to the expected versions.
- `npx expo-doctor` — found and fixed one real issue: `react-native-worklets`
  (a required peer of `react-native-reanimated` v4, and a native module that
  needs direct-dependency autolinking) was only present transitively, not as
  a direct `package.json` dependency. Added it explicitly. The only two
  remaining `expo-doctor` failures are its config-schema and
  React-Native-Directory checks, both of which call out to the same blocked
  hosts above — not project issues, just unreachable from here.
- Reviewed `AnatomicalFigure.tsx` specifically for New Architecture/
  Reanimated v4 correctness (this was the one component called out for
  extra scrutiny). Found and fixed one real bug this way: the infinite
  `withRepeat(..., -1, ...)` pulse animation had no cleanup, so navigating
  away from an exercise screen (unmounting the component) would leave it
  running on the UI thread indefinitely — added `cancelAnimation()` in the
  effect's cleanup. Everything else (worklet auto-detection via the babel
  plugin, `useAnimatedProps` on `Animated.createAnimatedComponent(Ellipse/Rect)`,
  shared-value typing) checked out against current Reanimated docs, but this
  is a static read, not a runtime one.

**What's still unverified, because it genuinely requires hardware/tooling
this sandbox doesn't have**: actually launching the app on an iOS
simulator or device, confirming the muscle-pulse animation renders and
performs correctly on Fabric (native `react-native-svg` + Reanimated
rendering can differ meaningfully from the web bundle's DOM-based SVG
shim, which is a real gap the web-bundle check above cannot close),
navigation gesture behavior, and general on-device feel. If you're picking
this up on a Mac: `npm install && npx expo run:ios` (or open in Expo Go /
a dev client) is the next step, and the exercise detail screens
(`ExerciseDetailScreen`) are the highest-value place to look first.

## Testing

```bash
npm test         # run the suite once
npm run test:watch
```

Jest (via `jest-expo`, matched to this Expo SDK version) covers the logic
that matters most to get right before any real money or medical-adjacent
timing is on the line:

- `src/utils/__tests__/pregnancyDates.test.ts` — trimester/postpartum-week
  resolution for both the due-date and trying-to-conceive paths, trimester
  boundary weeks (13→14, 27→28), the exact 12-months-postpartum boundary
  instant (inclusive), a Feb 29 leap-year delivery date (clamped to Feb 28
  the following year, per `date-fns`), early/preterm delivery and
  pregnancy-loss handling (confirms the app switches straight to a sane
  postpartum phase rather than crashing or going negative — see the test
  file's comments for what this does *not* claim about UX/tone), and
  timezone-change behavior (verified to actually flip the computed local
  calendar day between two extreme-offset zones, not just a no-op check).
- `src/state/__tests__/journeyStore.test.ts` — the Journey lifecycle
  (start/archive, never deleting history) and `runAutoArchiveSweep()` at,
  just before, and just after its boundary instant, using
  `jest.setSystemTime()` for a controllable "now". Also confirms a Journey
  Pass never carries over to a new Journey.
- `src/premium/__tests__/entitlements.test.ts` — `isPremiumActiveForJourney`
  and `needsRenewalPrompt` across every pass/subscription/archived-Journey
  combination.

`jest.setup.js` pins the test process to `TZ=UTC` for determinism and swaps
in `@react-native-async-storage/async-storage`'s official Jest mock. CI runs
`tsc --noEmit` and `jest --ci` on every push/PR — see
`.github/workflows/test.yml`.

Not yet covered: component/screen-level tests (e.g. rendering
`ExerciseDetailScreen` and asserting premium-gating behavior), and anything
in `AnatomicalFigure.tsx`'s actual animation runtime (a unit test can't
observe on-device Reanimated/Fabric behavior — see "What's been verified,
and where" above).

## Where things live

```
src/
  types/journey.ts          Core domain types (Journey, phases, exercises, ...)
  utils/pregnancyDates.ts   Due-date/trimester/postpartum-week math, Journey end date
  state/journeyStore.ts     Zustand store: journeys, check-ins, kick/contraction
                            sessions, entitlement — persisted to AsyncStorage
  premium/entitlements.ts   Paywall rules (pause-on-archive, resume-on-new-journey)
  data/                     Exercise, red-flag, and article content
  components/
    AnatomicalFigure.tsx    The animated SVG rig (see below)
    anatomy/muscleGeometry.ts  Placeholder muscle-group geometry, keyed by name
    SafetyTag.tsx, RedFlagChecklist.tsx, DisclaimerBanner.tsx, PremiumGate.tsx
  screens/                  One file per screen
  navigation/               RootNavigator (stack) + MainTabs (bottom tabs)
```

## The Journey / reset mechanic

`src/state/journeyStore.ts` holds an array of `Journey` records, each with a
`status` of `active` or `archived`. Only one Journey is active at a time.
`runAutoArchiveSweep()` (called on app start) archives any active Journey
whose `journeyEndDate` — 12 months after actual/estimated delivery — has
passed. Archived Journeys, their check-ins, kick/contraction sessions, and
personalization data are never deleted, on any tier, and remain browsable
from **Journey history**. Starting a new Journey (`startNewJourney`) also
calls `resumeEntitlementForNewJourney`, so a previously-paused premium plan
reactivates for the new Journey with one tap instead of a fresh purchase.

## The animated anatomical SVG system

`AnatomicalFigure` renders one shared rig per `BodyVariant`
(`neutral` / `pregnant` / `postpartum`) from `anatomy/muscleGeometry.ts`, and
animates an opacity pulse (via `react-native-reanimated`) over whichever
named muscle groups an exercise calls out, synced to that exercise's rep
tempo. Every exercise reuses the same rig — nothing is drawn per-exercise.

**This rig is a geometric placeholder** (ellipses/rects standing in for real
illustration), built to prove out the architecture described in the spec:
one base illustration, named muscle-group layers, reused and re-highlighted
per exercise. Swapping in real commissioned artwork means replacing the
shapes in `muscleGeometry.ts` with `<Path>` data under the same
`MuscleGroupId` keys — no changes needed anywhere else, including the
exercise screens. See the comments at the top of that file for specifics,
including the current front-view-only limitation for glutes/hamstrings/
erector spinae.

## Safety framework

- The red-flag symptom checklist (`src/data/redFlagSymptoms.ts`,
  rendered by `RedFlagChecklist`) and the standing medical disclaimer
  (`DisclaimerBanner`) are never gated by `isPremium` anywhere in the app —
  by design, not by convention. Grep for `PremiumLockedNotice` /
  `PremiumBadge` usage to confirm neither wraps that content.
- Every exercise carries `eligiblePhases` (trimester / postpartum-week-range
  tags), `avoidIf`, and `modifyIf`, checked against the user's live journey
  phase by `isExerciseSafeForPhase` in `SafetyTag.tsx`.
- **All exercise/article/red-flag content in `src/data/` is placeholder
  copy** loosely based on public guidance (CDC "Urgent Maternal Warning
  Signs", general ACOG-aligned conventions), written to exercise the data
  model — not clinically reviewed. Each data file has a notice comment
  at the top. Per the spec, get this content signed off by a certified
  pre/postnatal fitness specialist or pelvic floor physical therapist
  before real users see it — this is the single highest-leverage trust and
  liability investment described in the product spec, and Apple's review
  process scrutinizes health/safety claims like these.
- Advanced/progression (premium) exercises are additionally gated behind a
  `clearanceAcknowledgment` on the active Journey (see
  `ClearanceAcknowledgmentScreen`), matching the "cleared for exercise by my
  provider" requirement.

## Monetization

**This was reworked from an earlier "pausable subscription" design that
turned out not to be implementable.** StoreKit gives no developer API to
pause and later auto-resume billing on an auto-renewable subscription —
only the subscriber can cancel it, and Apple only supports discounts/
promotional offers on top of an existing subscription, not a true pause.
See the long comment at the top of `src/premium/entitlements.ts` for the
full reasoning.

The model now has two independent, honestly-modeled entitlement sources:

- **Full Journey Pass — $59.99, one-time, non-renewing (primary/default).**
  Scoped to a specific Journey id (`entitlement.journeyPassIds`). Never
  expires, never bills again, needs no pause logic because it's already
  scoped to one Journey — buying it again for the next Journey is just
  another (separate) purchase.
- **Monthly subscription — $9.99/mo, auto-renewing (secondary/opt-in).**
  A plain `subscriptionActive` boolean mirroring RevenueCat's entitlement
  state, not Journey-scoped (Apple has no concept of that). It unlocks
  premium for whichever Journey is currently active, keeps billing after a
  Journey archives unless the subscriber cancels it themselves, and
  `PaywallScreen` says so explicitly and links out to iOS's subscription
  management screen (`itms-apps://apps.apple.com/account/subscriptions`) —
  there is no in-app "cancel" button because there is no API for one.
- **Renewal, not auto-resume.** `needsRenewalPrompt()` detects when a
  returning purchaser's new Journey isn't covered by either a pass or an
  active subscription, and `NewJourneyScreen` routes straight to the
  Paywall in that case (`isRenewal` framing) instead of silently trying to
  resume something that can't be resumed. For an active subscriber, this is
  where you'd offer a RevenueCat promotional offer instead of a fresh
  purchase flow.

RevenueCat (`react-native-purchases`) is wired in for real — see
"RevenueCat setup" below for what that means in practice and what's still
unverified. `entitlements.ts` stays purely local/pure-function (no SDK
import): `recordJourneyPassPurchase` and `setSubscriptionActive` are plain
state writers that `journeyStore.ts` calls either after a real RevenueCat
purchase succeeds, or directly (dev/Expo Go fallback) when RevenueCat isn't
configured — see `src/premium/revenueCat.ts` for the SDK wrapper and its
long comment on why Journey Pass ownership is tracked locally rather than
as a RevenueCat entitlement. The ~85/15 free/premium split from the spec is
reflected in `isPremium` flags across `src/data/exercises.ts` and
`src/data/articles.ts`.

**App Store Connect setup**: this needs **two separate IAP products** —
a non-renewing subscription (or non-consumable, if you'd rather it be a
literal one-time unlock with no product-level "duration") for the Journey
Pass, and the existing auto-renewable subscription product for the monthly
plan. They are different product types in App Store Connect and are not
interchangeable — don't try to model the Journey Pass as an auto-renewable
product with quantity 1, since that still auto-renews unless cancelled.

## RevenueCat setup

The SDK integration is real code (`react-native-purchases@10.8.1`,
`src/premium/revenueCat.ts`, wired into `journeyStore.ts` and
`PaywallScreen`), but **no purchase has actually been tested against
RevenueCat or the App Store**, sandbox or otherwise — this sandboxed
environment has no Apple Developer account, no App Store Connect access,
no RevenueCat dashboard account, and (per the device-verification pass
above) no simulator/device to run a native build on at all. Everything
below is the setup + test runbook for whoever picks this up with real
credentials and hardware, written from having actually implemented against
the installed SDK's real TypeScript types (not from memory/guesswork).

### One-time setup

1. **App Store Connect**: create two In-App Purchase products.
   - A **Non-Renewing Subscription** (or Non-Consumable, if you'd rather it
     read as a literal one-time unlock with no built-in "duration" concept)
     for the **Full Journey Pass**. Do not use an auto-renewable product
     here even at "quantity 1" — it will still auto-renew unless the user
     cancels it, defeating the entire point of this being the pause-free
     option.
   - The existing **auto-renewable subscription** product for the $9.99/mo
     plan, in its own subscription group.
2. **RevenueCat dashboard**: create a project, connect the App Store
   Connect app, then:
   - Create an **entitlement** (e.g. `premium_subscription` — must match
     `SUBSCRIPTION_ENTITLEMENT_ID` in `src/premium/revenueCatConfig.ts`)
     and attach ONLY the auto-renewable subscription product to it. Do
     **not** attach the Journey Pass product to any entitlement — see the
     long comment at the top of `revenueCat.ts` for why.
   - Create an **Offering** (id `default`, matching `DEFAULT_OFFERING_ID`)
     with two **Packages**: one wrapping the Journey Pass product (custom
     package identifier `journey_pass`, matching `JOURNEY_PASS_PACKAGE_ID`)
     and one wrapping the subscription product (the built-in `$rc_monthly`
     package type is the default match for `MONTHLY_SUBSCRIPTION_PACKAGE_ID`
     — keep it, or update the config constant if you rename it).
   - Grab the **public** iOS (and Android, if you build for it) API key
     from Project Settings → API Keys.
3. Copy `.env.example` to `.env` and fill in
   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (and `_ANDROID_API_KEY`) with those
   keys. These are public SDK keys meant to ship in the client — never put
   RevenueCat's separate REST API *secret* key in app code.
4. **This is a native module — Expo Go will not work.** Build a custom dev
   client (`npx expo run:ios`, or `eas build --profile development`) or a
   full release/TestFlight build. Without a dev client, `configureRevenueCat()`
   will always report failure and the app will silently keep using the
   local mock (which is safe, but obviously isn't what you want to test).

### Testing with a sandbox account

1. Create a Sandbox Apple ID in App Store Connect (Users and Access →
   Sandbox → Testers) if you don't already have one, and sign into it on
   the test device under Settings → App Store → Sandbox Account (iOS 17
   splits this out from your regular Apple ID — don't sign into it as your
   main iCloud account).
2. Run the dev client build on that device and open the Paywall screen. If
   `purchasesInitialized` is true (no yellow warning card at the top of the
   screen), RevenueCat configured successfully.
3. **Journey Pass purchase**: tap "Get the Journey Pass". Confirm the
   sandbox purchase sheet appears, complete it, and confirm
   `ExerciseLibraryScreen`'s premium items unlock immediately for the
   active Journey.
4. **Subscription purchase**: tap "Start monthly subscription" the same
   way. Confirm the "Manage subscription in Settings" link actually opens
   the App Store subscriptions screen for that sandbox account.
5. **Restore**: on a second device (or after deleting and reinstalling the
   dev client on the same device) signed into the same sandbox account, tap
   "Restore purchases". The subscription should reactivate correctly. The
   Journey Pass will NOT re-associate with its original Journey — see the
   known limitation below; this is expected, not a bug to chase.
6. **Renewal flow**: archive the Journey (Settings → "End this Journey"),
   start a new one, and confirm you land on the Paywall automatically
   (`needsRenewalPrompt`) with "Welcome back" framing, rather than premium
   silently carrying over.
7. **Live entitlement sync**: with the app open, cancel the sandbox
   subscription from Settings, then background/foreground the app (or wait
   for RevenueCat's periodic sync) and confirm `subscriptionActive` flips
   off via the `addCustomerInfoUpdateListener` wiring in
   `initializePurchases`, without needing to reopen the Paywall screen.

### Known limitation: Journey Pass restore can't reconstruct which Journey it was for

RevenueCat's `CustomerInfo.nonSubscriptionTransactions` can tell you a
Journey Pass product was purchased and when — it has no concept of "which
Journey" because that's an app-specific idea, not a store one. Journey
Pass → Journey-id association lives only in this app's local
`entitlement.journeyPassIds`, in AsyncStorage. Reinstalling the app or
switching devices loses that mapping even though `restorePurchases()`
correctly confirms *a* purchase happened. There are two real fixes, neither
implemented here:
- Sync `journeys` (and thus `entitlement.journeyPassIds`) to a backend
  (Supabase/Firebase — see "Known gaps" below), so the mapping survives a
  reinstall independent of RevenueCat entirely.
- Or, if a given Journey Pass product is only ever meant to be purchased
  once per account (not one-per-Journey), collapse the model to a single
  lifetime `hasJourneyPass: boolean` instead of a per-Journey list —
  but that's a real product-scope change (it would mean a second pregnancy
  doesn't need a second purchase at all), not just an engineering fix, so
  it needs a decision, not a silent code change.

## Accessibility

This was a source-level audit and fix pass — real VoiceOver/TalkBack
verification on a device is still outstanding, same constraint as the rest
of this session (no simulator/device access). What was checked and what
was found/fixed:

- **`AnatomicalFigure.tsx`'s muscle-pulse animation had no text
  equivalent at all** — a screen-reader user got nothing from it. Fixed:
  the whole figure is now one `accessible` node with
  `accessibilityRole="image"` and a generated label naming the body
  variant, which muscle group(s) are highlighted (from
  `MUSCLE_GROUP_LABELS`), and the movement's rep pace (e.g. "pulsing every
  4 seconds to match the pace of this movement") — see
  `buildAccessibilityLabel` in that file. `importantForAccessibility="no-hide-descendants"`
  keeps the dozens of individual decorative SVG shapes from being
  individually walkable/announced. `ExerciseDetailScreen` passes the
  exercise name through for extra context.
- **Dynamic Type**: audited every screen for `numberOfLines`,
  `allowFontScaling={false}`, `maxFontSizeMultiplier`, fixed-height text
  containers, and `overflow: hidden` — found none. Exercise steps, safety
  warnings (`SafetyWarnings`), and the red-flag checklist all wrap in
  flexible containers with no font-scale caps, so they grow rather than
  clip at larger accessibility text sizes. Not independently verified on a
  device at the largest accessibility sizes (that would be the next step
  with a simulator/device in hand). One known platform-level caveat, not
  fixable in app code: React Navigation's bottom tab bar labels can get
  visually tight at the largest Dynamic Type sizes — a general constraint
  of tab bars, not something specific to this app.
- **Tap targets**: audited every `Pressable`/button against the ~44×44pt
  guideline. Found and fixed three real under-sized targets:
  - The mood/symptom/tag toggle chips (`DailyCheckInScreen`,
    `SettingsScreen`) were ~24-28pt tall. Extracted into a single shared
    `ToggleChip` component (`src/components/Basics.tsx`) with `hitSlop`
    extending the tappable area to the full guideline size without
    changing how compact they look, plus `accessibilityState={{selected}}`
    (previously missing entirely — a screen reader had no way to announce
    a chip's toggle state).
  - The clearance-acknowledgment checkbox row got `hitSlop`,
    `accessibilityRole="checkbox"`, and `accessibilityState={{checked}}`
    (previously just read as unstated body text).
  - `PremiumLockedNotice`'s "See premium options" button (~36pt) now
    reuses the shared `PrimaryButton`, which is both properly sized and
    carries `accessibilityRole="button"`.
  - `PrimaryButton`/`SecondaryButton` (used for essentially every action
    in the app, including the Kick Counter's "I felt a kick" and the
    Contraction Timer's start/stop controls — the screens called out
    specifically for tap-speed) were already comfortably over the
    guideline size; added explicit `accessibilityRole="button"` and
    `accessibilityState={{disabled}}` to both for completeness.

## Privacy

`PRIVACY_POLICY.md` and `APP_STORE_PRIVACY.md` at the project root are
drafts, traced against actual data flows in this codebase (there are
exactly two: everything the user enters stays in local `AsyncStorage`
— `src/state/journeyStore.ts` — and RevenueCat is the one place data
leaves the device — flagged inline with `PRIVACY:` comments at its call
sites in `src/premium/revenueCat.ts`). No analytics, crash reporting, or
custom backend exists in this codebase as of this writing; if you add any
of those, update both documents in the same change — they say so
explicitly.

**Both documents are drafts and say so at the top.** Neither has been
reviewed by a lawyer or privacy professional, and this is a health-adjacent
app collecting pregnancy/postpartum data — that review is not optional
before a real launch. There's also no in-app "View Privacy Policy" screen
yet and no hosted URL for one; App Store Connect requires a privacy policy
URL regardless, so publishing `PRIVACY_POLICY.md` somewhere reachable is a
prerequisite for submission, not just a nice-to-have.

## App Store review access (demo mode)

Since premium is gated behind a real purchase, reviewers need a way to see
it without paying. `src/premium/demoMode.ts` implements a hidden unlock: on
the Settings screen, tapping "About" 7 times within ~2.5 seconds reveals a
code entry field; the correct code sets `entitlement.demoModeEnabled`,
which makes `isPremiumActiveForJourney` return true unconditionally (see
`entitlements.ts`) — no purchase, no RevenueCat interaction, unlocked for
every Journey including archived ones. It's off by default, persisted
locally once enabled, and reversible from a visible "Turn off demo mode"
card that appears once it's on.

**`APP_REVIEW_NOTES.md`** has the actual text to paste into App Store
Connect's review-notes field, plus an important caveat: the default code
committed in this repo is not a real secret once this repo has been shared
with anyone — rotate it via `EXPO_PUBLIC_DEMO_MODE_CODE` before a real
submission. The gesture itself was implemented and typechecked in this
session but never tapped through on a real device — verify it on an actual
TestFlight build before relying on reviewers to be the first to try it.

## Known gaps / next steps

- **An actual on-device/simulator run.** See "What's been verified, and
  where" above — this has never been launched on a real iOS device,
  simulator, or Android emulator. Do this before shipping, with particular
  attention to `AnatomicalFigure.tsx`'s pulse animation and, per the
  Accessibility section, an actual VoiceOver/TalkBack pass and a check at
  the largest Dynamic Type sizes — this session could audit the code but
  not verify runtime screen-reader behavior. Also confirm the demo-mode
  tap gesture (see "App Store review access" below) actually works on a
  real TestFlight build before submitting.
- Real commissioned anatomical illustrations (see above).
- Clinical review of all safety/exercise/article content (see above, and
  work through `CONTENT_REVIEW_CHECKLIST.md` at the project root). Every
  entry in `exercises.ts`/`articles.ts` carries a `contentReviewStatus:
  'needs_clinical_review'` field until a named reviewer has actually
  checked it off. Running the app in dev mode (`__DEV__`) shows a red
  banner and logs a console warning as a standing reminder of this.
- RevenueCat sandbox/production purchase testing (SDK is wired in; nothing
  has actually been purchased against it — see "RevenueCat setup" above).
- The Journey Pass restore-across-reinstall limitation described above
  (needs either backend sync of Journey data, or a product-scope decision
  to make the pass a one-time lifetime purchase instead of per-Journey).
- Cloud sync (Supabase/Firebase) for cross-device Journey history — the
  Zustand store's `partialize`d shape is already the natural sync payload.
- Cross-Journey analytics charts (`JourneyArchiveScreen` has a labeled slot
  for this).
- Downloadable clearance/progress PDF summary for OB/PT visits.
- Partner/family viewer seat (auth + a read-only view are not built).
- Push notifications (daily check-in reminders, red-flag follow-ups).
- Legal review and hosting of `PRIVACY_POLICY.md`, and an in-app link to
  it, plus the real App Store Connect "App Privacy" questionnaire submission
  (draft in `APP_STORE_PRIVACY.md`) — see "Privacy" above.
