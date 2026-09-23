import type {
  Contraction,
  ContractionSession,
  DailyCheckIn,
  Journey,
  JourneyPhase,
  KickCountSession,
  WorkoutSession,
} from '../types/journey';
import { RED_FLAG_SYMPTOMS } from '../data/redFlagSymptoms';
import { formatClock } from './workout';
import { phaseLabel } from './pregnancyDates';

export interface ContractionStats {
  /** Completed contractions considered (last hour). */
  count: number;
  averageDurationSeconds: number | null;
  /** Start-to-start interval. */
  averageFrequencySeconds: number | null;
}

/** Averages over contractions that started within `windowMinutes` of `now`. */
export function contractionStats(contractions: Contraction[], now: Date, windowMinutes = 60): ContractionStats {
  const cutoff = now.getTime() - windowMinutes * 60_000;
  const recent = contractions.filter((c) => new Date(c.startedAt).getTime() >= cutoff);
  const completed = recent.filter((c) => c.endedAt);
  const durations = completed.map((c) => (new Date(c.endedAt!).getTime() - new Date(c.startedAt).getTime()) / 1000);
  const starts = recent.map((c) => new Date(c.startedAt).getTime()).sort((a, b) => a - b);
  const intervals = starts.slice(1).map((start, index) => (start - starts[index]) / 1000);
  const average = (values: number[]) =>
    values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    count: completed.length,
    averageDurationSeconds: average(durations),
    averageFrequencySeconds: average(intervals),
  };
}

export function kickSessionMinutes(session: KickCountSession): number | null {
  const reachedTargetAt = session.kickTimestamps[session.targetKickCount - 1];
  const end = reachedTargetAt ?? session.endedAt;
  if (!end) return null;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(session.startedAt).getTime()) / 60_000));
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export interface ProviderSummaryInput {
  journey: Journey;
  phase: JourneyPhase;
  checkIns: DailyCheckIn[];
  workouts: WorkoutSession[];
  kickSessions: KickCountSession[];
  contractionSessions: ContractionSession[];
  now: Date;
  days?: number;
}

/**
 * Plain-text summary a user can share (AirDrop, Messages, Mail, Files) or
 * show at an OB/PT visit. Self-reported data only — no interpretation.
 */
export function buildProviderSummary(input: ProviderSummaryInput): string {
  const days = input.days ?? 14;
  const since = input.now.getTime() - days * 86_400_000;
  const inWindow = <T,>(items: T[], date: (item: T) => string) =>
    items.filter((item) => new Date(date(item)).getTime() >= since);

  const { journey } = input;
  const checkIns = inWindow(input.checkIns, (c) => c.createdAt);
  const workouts = inWindow(input.workouts, (w) => w.completedAt);
  const kicks = inWindow(input.kickSessions, (k) => k.startedAt);
  const contractions = inWindow(input.contractionSessions, (c) => c.startedAt);

  const lines: string[] = [];
  lines.push(`Prego Posto — self-reported summary (last ${days} days)`);
  lines.push(`Generated ${input.now.toLocaleString()}`);
  lines.push('');
  lines.push(`Current phase: ${phaseLabel(input.phase)}`);
  if (journey.estimatedDueDate) lines.push(`Estimated due date: ${dateLabel(journey.estimatedDueDate)}`);
  if (journey.actualDeliveryDate) lines.push(`Delivery date: ${dateLabel(journey.actualDeliveryDate)}`);
  if (journey.deliveryType !== 'unknown') lines.push(`Delivery type: ${journey.deliveryType}`);
  if (journey.personalizationTags.length > 0) {
    lines.push(`Noted conditions: ${journey.personalizationTags.map((t) => t.replace(/-/g, ' ')).join(', ')}`);
  }
  lines.push(
    journey.clearanceAcknowledgment
      ? `Exercise clearance acknowledged: ${dateLabel(journey.clearanceAcknowledgment.acknowledgedAt)}${
          journey.clearanceAcknowledgment.note ? ` — "${journey.clearanceAcknowledgment.note}"` : ''
        }`
      : 'Exercise clearance: not yet acknowledged in app'
  );

  lines.push('');
  lines.push(`Daily check-ins: ${checkIns.length}`);
  const flagged = checkIns.filter((c) => c.redFlagsReported.length > 0);
  if (flagged.length > 0) {
    lines.push('Warning signs reported:');
    flagged.forEach((c) => {
      const labels = c.redFlagsReported.map((id) => RED_FLAG_SYMPTOMS.find((s) => s.id === id)?.label ?? id);
      lines.push(`  • ${dateLabel(c.createdAt)}: ${labels.join('; ')}`);
    });
  }
  const symptomCounts = new Map<string, number>();
  checkIns.forEach((c) => c.symptoms.forEach((s) => symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1)));
  if (symptomCounts.size > 0) {
    const sorted = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1]);
    lines.push(`Symptoms logged: ${sorted.map(([s, n]) => `${s} (${n}d)`).join(', ')}`);
  }
  const moodCounts = new Map<string, number>();
  checkIns.forEach((c) => moodCounts.set(c.mood, (moodCounts.get(c.mood) ?? 0) + 1));
  if (moodCounts.size > 0) {
    lines.push(`Mood: ${[...moodCounts.entries()].map(([m, n]) => `${m} ${n}×`).join(', ')}`);
  }
  const notes = checkIns.filter((c) => c.notes.trim());
  if (notes.length > 0) {
    lines.push('Notes:');
    notes.forEach((c) => lines.push(`  • ${dateLabel(c.createdAt)}: ${c.notes.trim()}`));
  }

  lines.push('');
  const activeMinutes = Math.round(workouts.reduce((sum, w) => sum + w.durationSeconds, 0) / 60);
  lines.push(`Guided workouts: ${workouts.length} (${activeMinutes} active minutes)`);
  const unwell = workouts.filter((w) => w.feeling === 'unwell' || w.endedEarly);
  if (unwell.length > 0) {
    lines.push(
      `Workouts stopped early or reported feeling unwell: ${unwell.map((w) => dateLabel(w.completedAt)).join(', ')}`
    );
  }

  if (kicks.length > 0) {
    lines.push('');
    lines.push('Kick counts:');
    kicks
      .filter((k) => k.endedAt)
      .forEach((k) => {
        const minutes = kickSessionMinutes(k);
        lines.push(
          `  • ${new Date(k.startedAt).toLocaleString()}: ${k.kickTimestamps.length} movements${
            minutes ? ` in ${minutes} min` : ''
          }`
        );
      });
  }

  if (contractions.length > 0) {
    lines.push('');
    lines.push('Contraction timing sessions:');
    contractions.forEach((session) => {
      const stats = contractionStats(session.contractions, new Date(session.endedAt ?? input.now), 24 * 60);
      lines.push(
        `  • ${new Date(session.startedAt).toLocaleString()}: ${stats.count} contractions` +
          (stats.averageDurationSeconds ? `, avg ${formatClock(stats.averageDurationSeconds)} long` : '') +
          (stats.averageFrequencySeconds ? `, every ${formatClock(stats.averageFrequencySeconds)}` : '')
      );
    });
  }

  lines.push('');
  lines.push('Self-reported by the patient in an educational app. Not a medical record.');
  return lines.join('\n');
}
