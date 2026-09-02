# Content Review Checklist

Every safety-relevant claim in this app — exercise contraindications,
red-flag symptoms, trimester/postpartum-week modifications, clearance
guidance — is **AI-generated placeholder content, loosely based on general
public guidance, and has not been reviewed by a clinician.** Per the
product spec, this must be reviewed and signed off by a certified
pre/postnatal fitness specialist or pelvic floor physical therapist (and
ideally an OB/midwife for the trimester/red-flag content) before any real
user sees it.

This document exists so that review can happen systematically, file by
file and item by item, instead of relying on someone re-reading the whole
codebase from memory. Each data file also carries a `contentReviewStatus`
field on every entry (`'needs_clinical_review'` by default) — **do not**
flip an entry to `'clinically_reviewed'` in code until it has actually been
checked off here by a named reviewer.

## How to use this checklist

1. Work through each section below in order.
2. For each item, open the linked file/line, read the actual current text
   (this document does not duplicate full prose — line numbers will drift
   as the file is edited, so always check the file itself), and check the
   claim against current clinical guidance (ACOG, or your own professional
   judgment).
3. Record the outcome inline: check the box, add your name/date, and note
   any correction needed (or make the correction directly and note that
   you did).
4. Once every item in a file is checked off, update that entry's
   `contentReviewStatus` to `'clinically_reviewed'` in the source file and
   note the reviewer + date in a comment on that entry.

---

## 1. Red-flag symptom checklist — `src/data/redFlagSymptoms.ts`

This is the highest-priority section: it is the "stop and contact your
provider if..." list, always shown for free, and the thing most likely to
cause real harm if wrong (either a false negative that misses a genuine
emergency, or an over-broad claim that causes alarm fatigue).

For each item below, review: is the symptom description clear and
accurate, is the guidance the right level of urgency (ED vs. "call your
provider" vs. "mention at next visit"), and is anything clinically
important missing from the list entirely?

- [ ] `vaginal-bleeding` (line 22) — bleeding/leaking fluid guidance
- [ ] `severe-headache` (line 28) — preeclampsia-related headache guidance
- [ ] `decreased-fetal-movement` (line 34) — reduced movement guidance
- [ ] `severe-abdominal-pain` (line 40)
- [ ] `chest-pain-breathing` (line 46)
- [ ] `calf-swelling` (line 52) — DVT-related guidance
- [ ] `fever` (line 58) — threshold temperature is stated explicitly; confirm 100.4°F/38°C is the right cutoff to surface
- [ ] `contractions-preterm` (line 64) — preterm contraction guidance
- [ ] `heavy-postpartum-bleeding` (line 70) — postpartum hemorrhage guidance
- [ ] `incision-signs` (line 76) — C-section/perineal incision infection signs
- [ ] `mood-safety` (line 82) — perinatal mood/self-harm guidance; confirm the 988 crisis line reference is still the right resource to surface and current
- [ ] `pelvic-pressure-coning` (line 88) — diastasis/pelvic floor "coning" guidance
- [ ] **Completeness check**: is there a clinically significant red-flag symptom missing from this list entirely? (e.g. reduced urination, severe swelling of face/hands, visual disturbances beyond headache, signs of blood clot beyond calf)

## 2. Exercise library — `src/data/exercises.ts`

For each exercise, review the **steps** (is the movement described safely
and accurately), **eligiblePhases** (is it actually appropriate for every
trimester/postpartum-week range it's tagged for), **avoidIf** / **modifyIf**
(are the contraindications complete and correctly framed), and
**bodyVariant**/**primaryMuscles** (does the anatomical framing make sense).

Free exercises:

- [ ] `diaphragmatic-breathing` (line 17) — Diaphragmatic (Belly) Breathing
- [ ] `pelvic-floor-activation` (line 44) — Pelvic Floor Activation (Kegel)
- [ ] `cat-cow-stretch` (line 70) — Cat-Cow Stretch
- [ ] `glute-bridge` (line 96) — Supported Glute Bridge — check the "avoid flat supine after first trimester" claim specifically; this is a commonly-cited but debated guideline
- [ ] `seated-side-bend` (line 123) — Seated Side Bend (Oblique Awareness) — check the diastasis/twisting caution
- [ ] `wall-squat` (line 148) — Wall Sit / Supported Squat
- [ ] `prenatal-walking-intervals` (line 174) — Brisk Walking Intervals — check the "talk test" framing
- [ ] `diastasis-safe-heel-slide` (line 200) — Diastasis-Safe Heel Slide
- [ ] `postpartum-pelvic-tilts` (line 221) — Postpartum Pelvic Tilts
- [ ] `csection-scar-mobilization` (line 242) — Gentle C-Section Scar Mobilization — check the "fully healed + provider clearance" gating language and minimum week (6) tag
- [ ] `standing-marches` (line 263) — Standing Marches

Premium / advanced exercises (also require the in-app clearance
acknowledgment before unlocking, in addition to clinical review here):

- [ ] `weighted-hip-thrust` (line 286) — Progression: Weighted Hip Thrust — check minimum postpartum week (12) and loading guidance
- [ ] `loaded-carry-progression` (line 307) — Progression: Loaded Carry — check minimum postpartum week (16)
- [ ] `diastasis-progression-plank` (line 328) — Progression: Diastasis-Safe Plank Build — check minimum postpartum week (10) and the incline-to-floor progression logic
- [ ] `twins-modified-carry` (line 349) — Twins/Multiples: Modified Carry & Core — this one in particular should be reviewed by someone with high-risk/multiples pregnancy experience, not just general prenatal fitness

- [ ] **Completeness check**: are there any exercise categories or trimester/postpartum-week ranges with no appropriate content at all, or content that's tagged safe for a phase it shouldn't be?

## 3. Educational articles — `src/data/articles.ts`

For each article, review the **body** text for factual accuracy and
whether it could be read as more prescriptive/diagnostic than intended.

- [ ] `why-safety-first` (line 9)
- [ ] `core-changes-in-pregnancy` (line 21) — diastasis recti / linea alba framing
- [ ] `pelvic-floor-101` (line 33)
- [ ] `returning-to-exercise-postpartum` (line 45) — the "around 6 weeks" general timeline claim specifically
- [ ] `csection-recovery-basics` (line 58)
- [ ] `diastasis-recti-explained` (line 70) — premium
- [ ] `multiples-pregnancy-considerations` (line 82) — premium

## 4. Trimester / postpartum-week conventions — `src/utils/pregnancyDates.ts`

- [ ] Trimester boundaries (weeks 1–13 / 14–27 / 28–40+, see `resolveJourneyPhase`) — confirm this is the convention we want to standardize on and that it's labeled consistently everywhere in the UI
- [ ] Postpartum "12 months" Journey length and how `monthPostpartum` is computed (30-day months, not calendar months) — confirm this approximation is acceptable or needs to be calendar-accurate

## 5. Safety-adjacent UI copy

Not raw content-file claims, but worth a pass since they set user
expectations about what the app can and can't tell them:

- [ ] `src/components/DisclaimerBanner.tsx` — standing medical disclaimer wording
- [ ] `src/components/RedFlagChecklist.tsx` — framing text around the red-flag list ("stop and contact your provider if...", footnote about the list not being exhaustive)
- [ ] `src/screens/ClearanceAcknowledgmentScreen.tsx` — the provider-clearance acknowledgment wording (is this the right bar for "cleared for exercise," and is it legally sufficient as an acknowledgment rather than a waiver?)
- [ ] `src/screens/SafetyChecklistScreen.tsx` — surrounding copy

---

## Sign-off log

| Section | Reviewer | Credential | Date | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |
