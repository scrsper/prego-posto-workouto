# App Store Launch Checklist

**Start here.** This is the single ordered path from where this codebase
stands today to a real listing on the App Store that real people download
and use. Everything else in this repo (`README.md`, `CONTENT_REVIEW_CHECKLIST.md`,
`APP_REVIEW_NOTES.md`, `PRIVACY_POLICY.md`, `APP_STORE_PRIVACY.md`) is
referenced from here rather than duplicated.

Every item below is tagged with who does it:

- 🤖 **Code** — done, or doable by an engineer/AI working in this repo.
- 👤 **You** — a business/product decision or an account only you can create.
- ⚕️ **Clinician** — requires a licensed professional. Not optional, not
  skippable, not something an AI (including the one that built this) can
  do or fake.
- 📱 **Device** — requires a Mac with Xcode, or at minimum a physical
  iPhone/iPad and an Expo dev client, none of which this session has.

---

## 0. Where things actually stand

This app is **code-complete for a v1 feature set** and reasonably
well-tested (60 automated tests, `tsc` clean, CI wired up), but it has
**never been run on an iOS device or simulator**, and its safety/medical
content has **never been reviewed by anyone medically qualified**. Neither
of those is a formality — both are launch blockers for a health-adjacent
app, and the second one is the most important thing in this entire
checklist. Don't let the amount of finished-looking code below create a
false sense of "almost done" — read section 1 first.

---

## 1. ⚕️ Clinical content review — BLOCKING, do this first

Every exercise, every trimester/postpartum-week safety tag, every red-flag
symptom, every article is **AI-generated placeholder content**. It reads
plausibly and follows real conventions, but nobody medically qualified has
checked it, and it must not reach a real pregnant or postpartum user until
someone does.

- Work through **`CONTENT_REVIEW_CHECKLIST.md`** with a certified
  pre/postnatal fitness specialist or pelvic floor physical therapist (and
  ideally an OB/midwife for the red-flag/trimester content specifically).
- Every entry in `src/data/exercises.ts` and `src/data/articles.ts` carries
  `contentReviewStatus: 'needs_clinical_review'`. Don't flip any of them to
  `'clinically_reviewed'` until that specific entry has actually been
  checked off by a named reviewer — the field exists so this can't be
  silently skipped.
- This gates the whole launch, not just a compliance checkbox: Apple's App
  Review is known to scrutinize health apps specifically for exactly this
  (unreviewed medical claims), and shipping unvetted exercise contraindication
  guidance to pregnant/postpartum users is a real safety risk independent
  of App Review.
- **I did not do this, cannot do this, and won't pretend to.** I'm not a
  licensed clinician, and this is precisely the kind of judgment call the
  app's own red-flag/disclaimer content already tells users to defer to a
  real provider on. Find and pay a real specialist for this pass — it's
  the single highest-leverage thing standing between this app and being
  trustworthy.

---

## 2. 👤 Business & account setup

None of this exists yet and only you can create it:

1. **Apple Developer Program** enrollment ($99/year) — apple.com/programs.
2. **Pick and lock in**: the real app name for the store listing (this repo
   currently uses the placeholder "Prego Posto Workouto" throughout —
   `app.json`'s `expo.name`), and a support email/URL (App Store Connect
   requires both).
3. **Bundle identifier**: `app.json` currently ships
   `com.pregopostoworkouto.app` as a placeholder for both
   `ios.bundleIdentifier` and `android.package`. This needs to become
   whatever reverse-DNS string you actually want to own permanently (once
   an App Store Connect record is created with an identifier, it's very
   hard to change) — update it in `app.json` **before** creating the App
   Store Connect app record, not after.
4. **RevenueCat account** + the two App Store Connect IAP products (Full
   Journey Pass, monthly subscription) — full steps already written out in
   `README.md`'s "RevenueCat setup" section. Fill in
   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (see `.env.example`) once you have
   it.
5. **Expo/EAS account** (free tier is fine) to run the builds in the next
   section — `eas login`, then `eas init` in this repo to link it to a
   real EAS project (this repo has `eas.json` build profiles already
   configured, but no project is linked yet).

---

## 3. 📱 Build and device testing

Nothing in this repo has ever run outside a Linux sandbox's web bundle
(see `README.md` "What's been verified, and where" for exactly what that
did and didn't cover). This needs a Mac with Xcode, or at minimum access
to EAS Build's cloud builders plus a physical device or TestFlight:

```bash
npm install -g eas-cli   # or npx eas-cli for one-off use
eas login
eas init                 # links this repo to a real EAS project
eas build --profile development --platform ios   # first: a dev client build
```

Once you have a working dev client build on a real device:

- Click through every screen. Start a Journey, log a check-in, use the
  kick counter and contraction timer, open several exercises.
- **Specifically check `AnatomicalFigure.tsx`'s muscle-pulse animation** —
  native SVG + Reanimated rendering on Fabric can differ from the web
  bundle this was validated against in this sandbox.
- **Turn on VoiceOver** and go through the same flows — `README.md`'s
  Accessibility section documents what was fixed at the source level
  (labels, tap targets) versus what still needs an actual screen-reader
  pass, which is this step.
- Check the largest Dynamic Type / accessibility text sizes for any
  layout breakage.
- Test the demo-mode unlock gesture (`APP_REVIEW_NOTES.md`) actually works
  on this real build before relying on App Store reviewers to be the first
  to try it.
- Test a RevenueCat sandbox purchase end to end (full runbook in
  `README.md`'s "RevenueCat setup").

Then a production build for submission:

```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

(`eas.json`'s `submit.production.ios` block has placeholder
`appleId`/`ascAppId`/`appleTeamId` fields — fill those in with your real
values, or answer the prompts interactively instead.)

---

## 4. 🤖👤 App icon and splash screen

`expo-splash-screen` is properly configured (background color, no
blank-frame flash on launch — see `README.md`'s "Polish pass"), but
**the actual artwork is still Expo's generic template placeholder**
(`assets/icon.png`, `assets/splash-icon.png`, `assets/android-icon-*.png`).
This session has no image-generation tooling to produce real branded
artwork. Before submission:

- Commission or design a real app icon (1024×1024 master, Apple auto-generates
  the rest) and splash image reflecting actual branding.
- Replace the files in `assets/` and re-run through EAS Build — no code
  changes needed beyond swapping the image files, since `app.json` already
  points at those paths.
- Same placeholder-artwork situation applies to `AnatomicalFigure.tsx`'s
  anatomical rig (see `README.md`) — lower urgency than the icon since it's
  functional, not just cosmetic, but on the list for a v1.1 polish pass.

---

## 5. 👤 Store listing content

Not started — none of this exists yet:

- Screenshots (need a device/simulator — see section 3).
- App Store description, keywords, promotional text.
- Age rating questionnaire (this is a pregnancy/fitness app with no
  mature content — should be straightforward, but you still have to
  answer Apple's questionnaire).
- Category selection (Health & Fitness / Medical).

---

## 6. 👤⚖️ Privacy policy — needs legal review

`PRIVACY_POLICY.md` and `APP_STORE_PRIVACY.md` are drafts traced against
this codebase's actual data flows (local-only storage + RevenueCat is the
only thing that leaves the device — see those files for the full
reasoning). Both say so at the top, but to spell it out here too:

- Neither has been reviewed by a lawyer or privacy professional. This is a
  health-adjacent app; that review is not optional.
- `PRIVACY_POLICY.md` needs to be hosted somewhere with a real URL — App
  Store Connect requires one, and there's no in-app viewer for it yet
  either (a small gap worth closing: a Settings screen link to a hosted
  URL).
- Fill in the placeholder support contact in `PRIVACY_POLICY.md`.

---

## 7. 🤖 App Review access

Already built and documented: `APP_REVIEW_NOTES.md` has the exact text to
paste into App Store Connect's review notes, describing the hidden
demo-mode unlock (7 taps on "About" in Settings + a code) that lets
reviewers see premium content without paying. **Before you use it**:
rotate the default code (`src/premium/demoMode.ts`) via the
`EXPO_PUBLIC_DEMO_MODE_CODE` env var — the committed default isn't a real
secret once this repo has been shared with anyone.

---

## 8. Final pre-submission pass

Once sections 1–7 are done:

- [ ] Re-run `npm test` and `npx tsc --noEmit` one more time on the exact
      commit you're submitting.
- [ ] Re-read `APP_STORE_PRIVACY.md`'s "Before you submit this for real"
      checklist against the actual current App Store Connect form.
- [ ] Confirm every `contentReviewStatus` that ships is
      `'clinically_reviewed'`, not `'needs_clinical_review'` — grep for
      the latter; it should return nothing.
- [ ] Submit for review, and watch for the "Claude Approvals" style
      feedback loop only if you've set one up separately — otherwise just
      watch App Store Connect directly.

---

## Summary: what's actually stopping you today

If you started right now, in order of how long each one realistically
takes:

1. **Clinical review** (section 1) — likely the longest lead time; find
   and book a specialist now, in parallel with everything else.
2. **Apple Developer Program enrollment** (section 2) — can take a day or
   two to process.
3. **A Mac or EAS Build access + a physical device** (section 3) — needed
   before you can verify anything runs correctly at all.
4. Everything else (icon artwork, store listing copy, privacy policy legal
   review) can happen in parallel with 1–3.

Nothing in this repo's code is what's between you and launch anymore — the
remaining blockers are a licensed professional's time, your business
accounts, and physical hardware.
