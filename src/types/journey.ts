/**
 * A "Journey" is the bounded pregnancy -> 12-month-postpartum arc that is the
 * core mechanic of the app. Exactly one Journey is "active" at a time; all
 * others are "archived" and remain permanently readable (including on the
 * free tier).
 */
export type JourneyStatus = 'active' | 'archived';

/** How the user entered the Journey. */
export type ConceptionMode = 'due_date' | 'trying_to_conceive';

export type DeliveryType = 'vaginal' | 'cesarean' | 'unknown';

export interface ClearanceAcknowledgment {
  acknowledgedAt: string; // ISO date
  note: string;
}

export interface Journey {
  id: string;
  status: JourneyStatus;
  conceptionMode: ConceptionMode;
  /** ISO date string. Required once known; estimated from LMP/conception if needed. */
  estimatedDueDate: string | null;
  /** ISO date string, set once the baby has arrived. */
  actualDeliveryDate: string | null;
  deliveryType: DeliveryType;
  /** Free-text, e.g. "twins", "high-risk", "diastasis-recti-moderate". Drives premium branching. */
  personalizationTags: string[];
  clearanceAcknowledgment: ClearanceAcknowledgment | null;
  createdAt: string;
  /** Set when the Journey is archived (12 months after estimatedDueDate, or manually). */
  archivedAt: string | null;
  displayName: string;
}

export type JourneyPhase =
  | { kind: 'trying_to_conceive' }
  | { kind: 'prenatal'; trimester: 1 | 2 | 3; weekOfPregnancy: number }
  | { kind: 'postpartum'; weekPostpartum: number; monthPostpartum: number }
  | { kind: 'journey_complete' };

export interface DailyCheckIn {
  id: string;
  journeyId: string;
  date: string; // ISO date, day granularity
  mood: 'great' | 'okay' | 'rough' | 'struggling';
  energyLevel: 1 | 2 | 3 | 4 | 5;
  symptoms: string[];
  redFlagsReported: string[];
  notes: string;
  createdAt: string;
}

export interface KickCountSession {
  id: string;
  journeyId: string;
  startedAt: string;
  endedAt: string | null;
  kickTimestamps: string[];
  targetKickCount: number;
}

export interface Contraction {
  startedAt: string;
  endedAt: string | null;
}

export interface ContractionSession {
  id: string;
  journeyId: string;
  startedAt: string;
  endedAt: string | null;
  contractions: Contraction[];
}

export type MuscleGroupId =
  | 'transverseAbdominis'
  | 'rectusAbdominis'
  | 'obliques'
  | 'pelvicFloor'
  | 'glutes'
  | 'hipFlexors'
  | 'erectorSpinae'
  | 'quadriceps'
  | 'hamstrings'
  | 'chestShoulders';

export type BodyVariant = 'neutral' | 'pregnant' | 'postpartum';

export type SafetyEligibility =
  | { kind: 'trying_to_conceive' }
  | { kind: 'trimester'; trimester: 1 | 2 | 3 }
  | { kind: 'postpartum_week_range'; minWeek: number; maxWeek: number | null };

/**
 * Tracks whether a piece of safety-relevant content has been signed off by
 * a certified pre/postnatal fitness specialist or pelvic floor physical
 * therapist. Every entry in src/data/exercises.ts and src/data/articles.ts
 * currently ships as 'needs_clinical_review' — see CONTENT_REVIEW_CHECKLIST.md
 * at the project root. Do not flip an entry to 'clinically_reviewed' without
 * a real reviewer having actually looked at it.
 */
export type ContentReviewStatus = 'needs_clinical_review' | 'clinically_reviewed';

export interface Exercise {
  id: string;
  name: string;
  isPremium: boolean;
  contentReviewStatus: ContentReviewStatus;
  bodyVariant: BodyVariant;
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  /** Which phases of the journey this exercise is generally appropriate for. */
  eligiblePhases: SafetyEligibility[];
  steps: string[];
  avoidIf: string[];
  modifyIf: string[];
  repTempoSeconds: number;
  category: 'core' | 'pelvic-floor' | 'mobility' | 'strength' | 'cardio' | 'relaxation';
  audioCueDescription: string;
}

export interface RedFlagSymptom {
  id: string;
  label: string;
  guidance: string;
  appliesTo: 'prenatal' | 'postpartum' | 'both';
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  appliesTo: 'prenatal' | 'postpartum' | 'both';
  isPremium: boolean;
  contentReviewStatus: ContentReviewStatus;
}
