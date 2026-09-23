# Privacy Policy — Prego Posto Workouto

**Status: DRAFT. Not reviewed by a lawyer or privacy professional. Do not
publish this as-is or link to it from a live App Store listing until it
has been reviewed by qualified counsel** — this is a health-adjacent app
collecting pregnancy and postpartum health information, and privacy law in
this space (HIPAA applicability questions, state health-data laws like
Washington's My Health My Data Act, COPPA if a partner/family viewer seat
is ever opened to minors, GDPR/UK GDPR if distributed in the EU/UK, and
Apple/Google's own health-data app-review policies) genuinely needs a
professional to confirm before this goes live, not an AI's best effort.

This draft is accurate to **the code as written** as of this document's
last update — see "How this document stays accurate" at the bottom. If you
change what data the app collects or where it goes (adding cloud sync,
analytics, crash reporting, an account/login system, etc.), this document
must be updated before that change ships, not after.

_Last reviewed against code: see git history of this file._

## What this app is

Prego Posto Workouto is a pregnancy-to-postpartum fitness and recovery
app. It is not a substitute for medical advice — see the in-app
disclaimer and `CONTENT_REVIEW_CHECKLIST.md` for more on that. This policy
covers only how the app handles your data, not clinical guidance.

## What data the app collects

The app does not require an account, login, name, or email address to use
it. Everything you enter is tied to a locally-generated Journey record on
your device, not to your real-world identity.

You may enter or generate the following while using the app, all of which
is **Health & Fitness data**:

- Due date, or trying-to-conceive status
- Delivery date and delivery type (vaginal/cesarean)
- Personalization tags you choose to set (e.g. diastasis recti severity,
  twins/multiples, high-risk pregnancy)
- Daily check-in entries: mood, energy level, symptoms, and any red-flag
  symptoms you report
- Kick-counter and contraction-timer session data (timestamps only — no
  audio, video, or location)
- Provider-clearance acknowledgment (that you confirmed being cleared for
  exercise, plus any note you add)
- Which exercises and articles you view (implicitly, through normal use)

If you purchase premium (a Full Journey Pass or a monthly subscription),
our payment processing partner, RevenueCat, and the App Store/Play Store
process **purchase and transaction data** — see "Purchases" below. We do
not collect or see your payment card details at any point; that is
handled entirely by Apple/Google.

## Where your data lives

**Almost all of your data — every Journey, check-in, kick/contraction
session, and personalization setting — is stored only on your device**,
using standard on-device storage (`AsyncStorage`). It is not uploaded to
any server we operate, because we don't currently operate one. If you
delete the app, that data is deleted with it (we cannot recover it for
you, and we never had a copy). If you use the app on a second device or
reinstall it, that data does not carry over — see `README.md` "Known
gaps" for the (not-yet-built) cloud-sync feature this implies, which would
change this section when it ships.

## Purchases

If you buy the Full Journey Pass or the monthly subscription, the
purchase itself is handled by the Apple App Store (or Google Play). We use
**RevenueCat** to verify and track entitlements. RevenueCat receives:

- A random, anonymous identifier RevenueCat generates for your install —
  not your name, email, or any account we hold, because we don't collect
  those in the first place
- Purchase and transaction data (which product, when, transaction ID)
- Standard device/platform information used for fraud prevention, per
  [RevenueCat's own privacy practices](https://www.revenuecat.com/privacy/)
  (confirm the current version of that document before publishing this
  policy — third-party data practices can change)

We do not send RevenueCat, or anyone else, your health data described
above. That stays on your device (see "Where your data lives").

## What we don't do

- We don't have an account system, so we don't collect your name, email,
  phone number, or a password.
- We don't run analytics or usage-tracking software in the app. (The
  in-app "cross-Journey analytics" premium feature compares **your own**
  data across **your own** past Journeys, on your device — it is not
  third-party tracking or telemetry sent to us.)
- We don't run crash-reporting software that would transmit device logs
  off your device.
- We don't request your location, contacts, camera, or microphone.
- We don't sell or share your data with data brokers or advertisers. We
  have nothing to sell — your health data never reaches us.

## Your choices

- You can delete any Journey's data by uninstalling the app (there is
  currently no per-field delete beyond that, since there is no server copy
  to delete from — see "Known gaps" in `README.md`).
- If premium purchase syncing (RevenueCat) is a concern, you can decline
  premium entirely; the free tier — including the full safety framework
  and red-flag guidance — never requires a purchase or RevenueCat account
  interaction.

## Children's privacy

This app is not directed at children and is not intended for use by
anyone under 18. It has no dedicated safeguards for a minor user beyond
that this is a pregnancy/postpartum app, which is inherently unlikely to
be used by children — this line needs legal review if the planned
"partner/family viewer seat" premium feature is ever built, since a family
member using that seat could plausibly be under 18.

## Changes to this policy

We'll update this document (and the version bundled in the app) whenever
what we actually do with your data changes. Since this app has no account
system, we cannot email you about changes — check this page or the
in-app copy of it for the current version.

## Contact

_(Fill in: a real support email/contact before publishing. There is
currently no support contact configured in this project.)_

---

## How this document stays accurate

This policy was drafted by tracing actual data flows in the codebase
(`src/state/journeyStore.ts` for what's stored locally, `src/premium/`
for the one place data leaves the device), not written generically. When
the code changes in ways that affect this document, update it in the same
change:

- Adding any network call, analytics SDK, or crash reporter → add a new
  "Where your data lives" bullet and rerun the App Store Privacy
  questionnaire in `APP_STORE_PRIVACY.md`.
- Adding cloud sync of Journey data → rewrite "Where your data lives"
  entirely; this is the biggest planned change that would invalidate the
  current "stays on your device" claim.
- Adding a login/account system or a partner/family viewer seat → add a
  "Contact Info" data category and revisit "Children's privacy."
