# App Store Connect "App Privacy" Questionnaire — Draft Answers

**Status: DRAFT, based on tracing actual data flows in the code as of this
document's last update (see git history). Not a substitute for actually
reading Apple's current questionnaire text and RevenueCat's current privacy
disclosure before submitting** — Apple's exact question wording and
category list change between App Store Connect releases, and RevenueCat's
own data practices are third-party and can change independent of this
codebase. Whoever fills out the real form should treat this as a
transcription starting point, verify each answer against the live form,
and re-run this whole exercise before every submission that changes what
data the app collects or where it goes.

This app currently has **two, and only two, real data flows**:

1. Everything the user enters (Journey data, check-ins, kick/contraction
   sessions, personalization tags) → stored **only locally**
   (`@react-native-async-storage/async-storage`), never transmitted. See
   `src/state/journeyStore.ts`.
2. Purchase/entitlement data → **RevenueCat** (`react-native-purchases`),
   flagged inline at its one call site in `src/premium/revenueCat.ts`. No
   health data is included in this flow — see that file's data-flow
   comment.

There is no analytics SDK, no crash reporter, no ad network, and no custom
backend in this codebase (verified by grepping for `fetch`/`axios`/known
SDK names — see the PR/commit that added this document for the exact
search). If any of those get added later, this document is wrong the
moment that ships, until it's updated.

## Data collection: top-level question

**"Do you or your third-party partners collect data from this app?"**

Answer: **Yes** — because RevenueCat, a third-party partner, collects
purchase-related data. (If you strip RevenueCat out entirely and self-host
StoreKit handling, this could become "No.")

## Data categories

Apple's form groups questions by category. Below is this app's answer for
each category Apple asks about, with **only the categories that apply**
filled in — everything else is "Data Not Collected."

### Health & Fitness

- **Collected?** This is the one genuinely ambiguous answer, and it's
  worth walking through rather than guessing: the app absolutely
  *processes* health-adjacent data (symptoms, mood, delivery type, kick
  counts) as its whole purpose, but Apple's nutrition label is about data
  that is **collected** in Apple's sense — meaning transmitted off the
  device to you or a third party. As the code stands today, none of this
  data leaves the device. Under a strict reading of Apple's guidance, that
  means the correct answer here is **"Data Not Collected"** for this
  category, with an internal note that this is a deliberate architectural
  fact, not an oversight, and the answer flips to "Yes, collected" the
  moment cloud sync, analytics, or crash reporting is added and could
  capture any of it.
- **Recommendation**: given this is a trust-sensitive health app, consider
  disclosing this proactively as "used but not linked, not used for
  tracking" even if not strictly required, since App Review for
  health-adjacent apps tends to scrutinize this closely and a
  conservative, over-disclosed answer is safer than a technically-correct
  but reviewer-surprising one. That's a product/legal call, not an
  engineering one — flagging it here rather than deciding it.

### Purchases

- **Collected?** Yes.
- **Type:** Purchase History.
- **Linked to the user's identity?** No — there is no name/email/account
  in this app; RevenueCat's app_user_id is a random, app-generated
  identifier, not tied to a real-world identity we hold.
- **Used for tracking?** No (not used to track the user across other
  companies' apps/websites).
- **Purpose:** App Functionality (unlocking premium features the user
  paid for).

### Identifiers

- **Collected?** Yes, indirectly — RevenueCat's SDK generates/uses an
  anonymous app-instance identifier (and, per RevenueCat's standard
  practice, may use device identifiers for fraud prevention). Confirm the
  exact identifier types against RevenueCat's current privacy manifest /
  disclosure before submitting.
- **Type:** Device ID (anonymous).
- **Linked to identity?** No.
- **Used for tracking?** No — this app does not use IDFA and does not
  request App Tracking Transparency permission (there is no code path
  that calls `requestTrackingPermissionsAsync` or equivalent anywhere in
  this project).
- **Purpose:** App Functionality (fraud prevention, entitlement sync).

### Usage Data

- **Collected?** No. No analytics SDK is integrated.

### Diagnostics

- **Collected?** No. No crash reporter is integrated. (If you later add
  Sentry, Bugsnag, or similar, this becomes Yes, and depending on
  configuration the crash payload could inadvertently include health data
  from app state — review breadcrumb/context configuration carefully if
  that day comes, so a crash report doesn't leak a user's symptom log.)

### Contact Info

- **Collected?** No. There is no login, account, or contact form
  anywhere in the app.

### Location

- **Collected?** No.

### Contacts, Browsing History, Search History, Sensitive Info (as its own
Apple category, distinct from Health & Fitness), Financial Info, User
Content (photos/videos/audio), Other Data Types

- **Collected?** No, for all of the above, based on the current codebase.

## Third-party SDK inventory (for the "third-party partners" part of the form)

| SDK | Purpose | Data it can see | Where wired in |
|---|---|---|---|
| RevenueCat (`react-native-purchases`) | Purchase/entitlement management | Anonymous app user ID, purchase/transaction data, device info for fraud prevention | `src/premium/revenueCat.ts` |

That's the entire list as of this document's last update. Cross-check it
against `package.json` before submitting — any new native SDK dependency
is a candidate for a new row here.

## Before you submit this for real

1. Re-read Apple's actual current "App Privacy" form in App Store Connect
   — question wording and category boundaries have changed across
   versions, and this document may be stale relative to the live form.
2. Pull RevenueCat's current privacy manifest / data-use disclosure (they
   publish one specifically for App Store submission purposes) and
   reconcile it with the "Identifiers" and "Purchases" sections above.
3. Get a second read from whoever owns `PRIVACY_POLICY.md` — the two
   documents describe the same underlying facts and should never
   contradict each other.
4. If anything in "What data the app collects" in `PRIVACY_POLICY.md` has
   changed since this document was last touched, redo this whole
   exercise rather than patching individual answers.
