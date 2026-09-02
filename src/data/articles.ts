import type { Article } from '../types/journey';

/**
 * CLINICAL CONTENT NOTICE — see src/data/redFlagSymptoms.ts. Educational
 * copy only; requires clinical review before shipping to real users.
 */
export const ARTICLES: Article[] = [
  {
    id: 'why-safety-first',
    title: 'Why This App Leads With Safety, Not Intensity',
    summary: 'How trimester- and postpartum-week-specific guidance keeps movement appropriate for where you are right now.',
    body:
      'Pregnancy and postpartum recovery are not a single fitness level — your body’s needs change week to week. ' +
      'This app tags every exercise with the phases it is appropriate for, and flags positions or movements to avoid ' +
      'or modify. Always listen to your body and your care provider over any general guidance here.',
    appliesTo: 'both',
    isPremium: false,
  },
  {
    id: 'core-changes-in-pregnancy',
    title: 'What Happens to Your Core During Pregnancy',
    summary: 'A plain-language look at the transverse abdominis, linea alba, and why "crunches" fall out of favor.',
    body:
      'As your uterus grows, your abdominal wall stretches and the connective tissue at the midline (linea alba) ' +
      'thins — a normal, expected change called diastasis recti. Deep core exercises that avoid excess intra-abdominal ' +
      'pressure (like coning or doming) support this transition better than traditional crunches.',
    appliesTo: 'prenatal',
    isPremium: false,
  },
  {
    id: 'pelvic-floor-101',
    title: 'Pelvic Floor 101',
    summary: 'What your pelvic floor does, why it matters in pregnancy and postpartum, and simple ways to check in with it.',
    body:
      'Your pelvic floor supports your bladder, bowel, and uterus, and works together with your deep core. Pregnancy ' +
      'hormones and the growing weight of your uterus place new demands on it, and delivery (vaginal or cesarean) can ' +
      'affect its strength and coordination. Gentle activation and full relaxation are both part of a healthy pelvic floor.',
    appliesTo: 'both',
    isPremium: false,
  },
  {
    id: 'returning-to-exercise-postpartum',
    title: 'Returning to Exercise After Delivery',
    summary: 'A general timeline for easing back into movement, and why "cleared by my provider" matters.',
    body:
      'Most providers recommend a general wellness visit before returning to structured exercise after delivery, ' +
      'often around 6 weeks — sooner for gentle walking and breathing work, later for higher-intensity training, and ' +
      'individualized after a cesarean or complicated delivery. This app requires a clearance acknowledgment before ' +
      'unlocking more intense programs for exactly this reason.',
    appliesTo: 'postpartum',
    isPremium: false,
  },
  {
    id: 'csection-recovery-basics',
    title: 'C-Section Recovery: The Basics',
    summary: 'What to expect in the first weeks after a cesarean birth, and gentle ways to reconnect with your core.',
    body:
      'A cesarean is major abdominal surgery, and healing takes time. Early movement (like short walks and gentle ' +
      'breathing) supports circulation and recovery, while scar mobilization and deeper core work generally wait until ' +
      'the incision is fully healed and your provider has cleared you.',
    appliesTo: 'postpartum',
    isPremium: false,
  },
  {
    id: 'diastasis-recti-explained',
    title: 'Diastasis Recti: What It Is and Isn’t',
    summary: 'Separating myths from facts about abdominal separation, and how personalized tracks adapt to its severity.',
    body:
      'Diastasis recti — separation of the two sides of the rectus abdominis at the linea alba — is extremely common ' +
      'in pregnancy and often improves in the months postpartum with appropriate movement. Its severity varies widely, ' +
      'which is why premium personalized tracks branch by severity rather than offering one generic program.',
    appliesTo: 'postpartum',
    isPremium: true,
  },
  {
    id: 'multiples-pregnancy-considerations',
    title: 'Exercising Safely With Twins or Multiples',
    summary: 'How a multiples pregnancy changes load, timing, and recovery considerations.',
    body:
      'A multiples pregnancy carries additional physical demands and a higher likelihood of early delivery or ' +
      'complications, so guidance here should always be individualized with your care team. Premium modifications ' +
      'in this app favor conservative loading and earlier rest breaks.',
    appliesTo: 'prenatal',
    isPremium: true,
  },
];

export function articlesForPhase(appliesTo: Article['appliesTo']): Article[] {
  return ARTICLES.filter((article) => article.appliesTo === appliesTo || article.appliesTo === 'both');
}
