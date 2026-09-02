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

This sandboxed build environment could not reach `api.expo.dev` /
`reactnative.directory` (network policy), so `expo install`/`expo-doctor`
network checks and a device/simulator run were not possible here. What *was*
verified in this environment:

- `npx tsc --noEmit` — clean, no type errors.
- `npx expo export --platform web` — the full app (1,392 modules, including
  every screen, the SVG rig, reanimated worklets, and navigation) bundles
  successfully.

Before shipping, run the app on an iOS simulator/device and click through the
flows below — that hasn't been done yet.

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

`mockPurchaseJourneyPass` / `mockActivateSubscription` /
`mockDeactivateSubscription` in `entitlements.ts` are the integration seam
for RevenueCat (`react-native-purchases`): replace them with real purchase
calls, and drive `EntitlementState` from RevenueCat's `CustomerInfo`
listener instead of local mutation. The ~85/15 free/premium split from the
spec is reflected in `isPremium` flags across `src/data/exercises.ts` and
`src/data/articles.ts`.

**App Store Connect setup**: this needs **two separate IAP products** —
a non-renewing subscription (or non-consumable, if you'd rather it be a
literal one-time unlock with no product-level "duration") for the Journey
Pass, and the existing auto-renewable subscription product for the monthly
plan. They are different product types in App Store Connect and are not
interchangeable — don't try to model the Journey Pass as an auto-renewable
product with quantity 1, since that still auto-renews unless cancelled.

## Known gaps / next steps

- Real commissioned anatomical illustrations (see above).
- Clinical review of all safety/exercise/article content (see above, and
  work through `CONTENT_REVIEW_CHECKLIST.md` at the project root). Every
  entry in `exercises.ts`/`articles.ts` carries a `contentReviewStatus:
  'needs_clinical_review'` field until a named reviewer has actually
  checked it off. Running the app in dev mode (`__DEV__`) shows a red
  banner and logs a console warning as a standing reminder of this.
- RevenueCat integration (currently mocked locally).
- Cloud sync (Supabase/Firebase) for cross-device Journey history — the
  Zustand store's `partialize`d shape is already the natural sync payload.
- Cross-Journey analytics charts (`JourneyArchiveScreen` has a labeled slot
  for this).
- Downloadable clearance/progress PDF summary for OB/PT visits.
- Partner/family viewer seat (auth + a read-only view are not built).
- Push notifications (daily check-in reminders, red-flag follow-ups).
