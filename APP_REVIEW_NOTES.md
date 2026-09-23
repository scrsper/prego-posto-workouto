# App Review Notes (draft)

**This file's contents belong in App Store Connect's "App Review
Information → Notes" field for the submitted build — not anywhere public.**
Do not link to this file from the app, marketing site, or a public support
page; do not paste it into a public GitHub issue or a customer support
reply. If this repository is public, treat the demo code below as
already-known and rotate it (see `src/premium/demoMode.ts`) before relying
on it for a real submission.

---

## Suggested text for App Store Connect's review notes field

> This app's premium features (personalized programs, the advanced
> exercise library, downloadable progress summaries) are unlocked via
> in-app purchase — either a one-time "Full Journey Pass" or a monthly
> subscription. To review premium content without completing a purchase:
>
> 1. Open the app and start a Journey from the welcome screen (enter any
>    due date, or choose "Trying to conceive").
> 2. Go to the **Settings** tab.
> 3. Tap the word **"About"** near the bottom of the screen **7 times in a
>    row, within about 2.5 seconds** — this reveals a hidden code entry
>    field (there is no visible button for it; this is intentional).
> 4. Enter the code: **`277747`** *(placeholder — see "Before you
>    submit" below; do not use this default value for a real
>    submission if this repo has ever been shared outside your team)*
>    and tap Submit.
> 5. A "Demo mode is ON" card appears in Settings, and every premium
>    feature is unlocked app-wide immediately, with no purchase required.
>    You can turn it back off with the button on that same card.
>
> The app also has a free tier that requires no purchase or account at
> all — the safety framework (red-flag symptom checklist, disclaimers),
> the core exercise library, daily check-ins, kick counter, and
> contraction timer are all free and don't need this unlock.

## Why this exists

Apple's review process (and general good practice for any app with
paywalled content) expects a way for reviewers to see what's behind an
in-app purchase without actually paying. See the long comment at the top
of `src/premium/demoMode.ts` for the full reasoning, including the honest
limitation that this is a client-side secret, not a cryptographically
secure gate — it only needs to be non-discoverable to an ordinary user
tapping around the app normally, not resistant to reverse engineering.

## Before you submit this for real

1. **Rotate the code.** The default in `src/premium/demoMode.ts`
   (`277747`) is committed to this repository's git history and is not a
   secret once this code has been shared with anyone, including (if this
   repo becomes public) the entire internet. Set a real value via the
   `EXPO_PUBLIC_DEMO_MODE_CODE` environment variable (same `.env` /
   EAS-secret pattern as the RevenueCat API keys — see `.env.example`) and
   put THAT value in the App Store Connect notes field instead of the
   default.
2. Confirm the gesture still works on the actual submitted build — this
   was implemented and typechecked in this session but never tapped
   through on a real device (see README "What's been verified, and
   where"). Test it yourself on a TestFlight build before relying on
   reviewers to be the first ones to try it.
3. If you rotate the code between submissions (recommended), update the
   App Store Connect notes field for that submission — an old code left in
   old, stale review notes doesn't automatically update.
4. Consider whether you want demo mode to also unlock the free/paid split
   permanently for a specific test account instead of a device-wide
   toggle — the current implementation is a single boolean unlocked
   locally on whichever device enters the code, which is simplest and
   matches how a reviewer actually tests (one physical device or
   simulator), but doesn't generalize to "give tester X account
   long-term access" if you ever need that instead.

## Other context worth including in review notes (not demo-mode-specific)

Given this is a pregnancy/postpartum health app, consider also proactively
noting in App Store Connect:

- The medical disclaimer and red-flag safety content are always free and
  never gated (reviewers sometimes specifically check health apps for
  this).
- All exercise/safety content currently ships as clinically-unreviewed
  placeholder copy per `CONTENT_REVIEW_CHECKLIST.md` — **do not submit to
  a real App Store review until that's been addressed**; a health app
  shipping unreviewed medical guidance is a real risk on both the
  liability and the App Review fronts, independent of anything else in
  this document.
