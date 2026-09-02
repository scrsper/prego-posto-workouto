import type { RedFlagSymptom } from '../types/journey';

/**
 * CLINICAL CONTENT NOTICE
 * ------------------------------------------------------------------------
 * This list is drafted from widely published public maternal-health warning
 * signs (aligned with the CDC "Urgent Maternal Warning Signs" campaign and
 * general ACOG patient guidance) purely as a structural placeholder for the
 * app's information architecture.
 *
 * Per the safety framework requirement, this content MUST be reviewed and
 * signed off by a certified pre/postnatal fitness specialist or pelvic
 * floor physical therapist (and ideally an OB/midwife) before it ships to
 * real users. Do not remove this notice until that review has happened and
 * is tracked (e.g. reviewer name + date) in this file's history.
 *
 * This list, and the disclaimer shown alongside it, must always remain free
 * and must never be placed behind a paywall or account-creation gate.
 */
export const RED_FLAG_SYMPTOMS: RedFlagSymptom[] = [
  {
    id: 'vaginal-bleeding',
    label: 'Vaginal bleeding or leaking fluid',
    guidance: 'Contact your provider immediately or go to the nearest emergency department.',
    appliesTo: 'both',
  },
  {
    id: 'severe-headache',
    label: 'Severe or persistent headache that will not go away, especially with vision changes',
    guidance: 'This can be a sign of preeclampsia. Contact your provider right away.',
    appliesTo: 'both',
  },
  {
    id: 'decreased-fetal-movement',
    label: 'A noticeable decrease in your baby’s movement',
    guidance: 'Stop activity, use the kick counter, and call your provider if movement remains reduced.',
    appliesTo: 'prenatal',
  },
  {
    id: 'severe-abdominal-pain',
    label: 'Severe, persistent, or worsening abdominal pain',
    guidance: 'Stop exercising and contact your provider immediately.',
    appliesTo: 'both',
  },
  {
    id: 'chest-pain-breathing',
    label: 'Chest pain, a racing heart, or difficulty breathing',
    guidance: 'Stop activity right away. If severe, call emergency services.',
    appliesTo: 'both',
  },
  {
    id: 'calf-swelling',
    label: 'Swelling, redness, or pain in one leg (especially the calf)',
    guidance: 'This can be a sign of a blood clot. Contact your provider promptly and avoid exercise until cleared.',
    appliesTo: 'both',
  },
  {
    id: 'fever',
    label: 'A fever of 100.4°F (38°C) or higher',
    guidance: 'Contact your provider; avoid strenuous exercise until you’re evaluated.',
    appliesTo: 'both',
  },
  {
    id: 'contractions-preterm',
    label: 'Regular, painful contractions before 37 weeks',
    guidance: 'Use the contraction timer and contact your provider if contractions continue.',
    appliesTo: 'prenatal',
  },
  {
    id: 'heavy-postpartum-bleeding',
    label: 'Soaking through a pad in an hour, or passing large clots (postpartum)',
    guidance: 'This can signal postpartum hemorrhage. Seek emergency care immediately.',
    appliesTo: 'postpartum',
  },
  {
    id: 'incision-signs',
    label: 'Redness, warmth, oozing, or opening at a C-section or perineal incision',
    guidance: 'Contact your provider — this may be a sign of infection.',
    appliesTo: 'postpartum',
  },
  {
    id: 'mood-safety',
    label: 'Thoughts of harming yourself or your baby, or feeling unable to cope',
    guidance: 'This is urgent. Contact your provider now, or call/text 988 (Suicide & Crisis Lifeline) for immediate support.',
    appliesTo: 'postpartum',
  },
  {
    id: 'pelvic-pressure-coning',
    label: 'A visible bulge/doming (coning) along your abdomen, or a heavy dragging pelvic pressure, during movement',
    guidance: 'Stop the exercise. This can indicate excess intra-abdominal pressure on diastasis recti or the pelvic floor — modify or skip until assessed by a pelvic floor specialist.',
    appliesTo: 'both',
  },
];
