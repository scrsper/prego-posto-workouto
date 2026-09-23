import { useMemo } from 'react';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import type { Journey, JourneyPhase } from '../types/journey';
import { useActiveJourney, useJourneyStore } from './journeyStore';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { resolveJourneyPhase } from '../utils/pregnancyDates';

export interface JourneyContext {
  journey: Journey | null;
  phase: JourneyPhase | null;
  isPremium: boolean;
  /** Premium AND provider clearance acknowledged — gates advanced/progression exercises. */
  advancedUnlocked: boolean;
}

export function useJourneyContext(): JourneyContext {
  const journey = useActiveJourney();
  const entitlement = useJourneyStore((state) => state.entitlement);
  return useMemo(() => {
    const isPremium = isPremiumActiveForJourney(entitlement, journey);
    return {
      journey,
      phase: journey ? resolveJourneyPhase(journey) : null,
      isPremium,
      advancedUnlocked: isPremium && !!journey?.clearanceAcknowledgment,
    };
  }, [journey, entitlement]);
}

/** Archived Journeys, newest first. `useShallow` keeps the derived array from re-rendering in a loop. */
export function useArchivedJourneys(): Journey[] {
  return useJourneyStore(
    useShallow((state) =>
      state.journeys
        .filter((j) => j.status === 'archived')
        .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))
    )
  );
}

/** Local-calendar day key (not UTC), so an evening check-in counts for today. */
export function localDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
