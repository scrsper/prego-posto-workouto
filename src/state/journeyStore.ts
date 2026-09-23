import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ClearanceAcknowledgment,
  ConceptionMode,
  ContractionSession,
  DailyCheckIn,
  DeliveryType,
  Journey,
  KickCountSession,
  ReminderSettings,
  WorkoutSession,
} from '../types/journey';
import { isJourneyPastEnd } from '../utils/pregnancyDates';
import { APP_CONFIG } from '../config';
import {
  type EntitlementState,
  type StoreSnapshot,
  initialEntitlementState,
  migrateEntitlement,
  mockPurchaseJourneyPass,
  mockSetSubscription,
  reconcileEntitlement,
} from '../premium/entitlements';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const initialReminderSettings: ReminderSettings = {
  enabled: false,
  hour: 19,
  minute: 0,
  scheduledNotificationId: null,
};

interface PersistedState {
  journeys: Journey[];
  activeJourneyId: string | null;
  dailyCheckIns: DailyCheckIn[];
  kickCountSessions: KickCountSession[];
  contractionSessions: ContractionSession[];
  workoutSessions: WorkoutSession[];
  entitlement: EntitlementState;
  reminders: ReminderSettings;
  hasRequestedReview: boolean;
  /** When the user accepted the "educational, not medical advice" acknowledgment. */
  safetyAcknowledgedAt: string | null;
}

const initialPersistedState: PersistedState = {
  journeys: [],
  activeJourneyId: null,
  dailyCheckIns: [],
  kickCountSessions: [],
  contractionSessions: [],
  workoutSessions: [],
  entitlement: initialEntitlementState,
  reminders: initialReminderSettings,
  hasRequestedReview: false,
  safetyAcknowledgedAt: null,
};

interface JourneyStoreState extends PersistedState {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  startNewJourney: (input: {
    conceptionMode: ConceptionMode;
    estimatedDueDate: string | null;
    displayName?: string;
  }) => string;
  archiveJourney: (journeyId: string) => void;
  setEstimatedDueDate: (journeyId: string, estimatedDueDate: string) => void;
  recordDelivery: (journeyId: string, actualDeliveryDate: string | null, deliveryType: DeliveryType) => void;
  setPersonalizationTags: (journeyId: string, tags: string[]) => void;
  recordClearanceAcknowledgment: (journeyId: string, ack: ClearanceAcknowledgment) => void;
  runAutoArchiveSweep: () => void;

  addDailyCheckIn: (checkIn: Omit<DailyCheckIn, 'id' | 'createdAt'>) => void;

  startKickCountSession: (journeyId: string, targetKickCount: number) => string;
  recordKick: (sessionId: string) => void;
  undoKick: (sessionId: string) => void;
  endKickCountSession: (sessionId: string) => void;

  startContractionSession: (journeyId: string) => string;
  startContraction: (sessionId: string) => void;
  endContraction: (sessionId: string) => void;
  endContractionSession: (sessionId: string) => void;

  addWorkoutSession: (session: Omit<WorkoutSession, 'id'>) => void;

  setReminders: (reminders: ReminderSettings) => void;
  markReviewRequested: () => void;
  acknowledgeSafety: () => void;

  applyStoreSnapshot: (snapshot: StoreSnapshot) => void;
  mockPurchaseJourneyPass: (journeyId: string) => void;
  mockSetSubscription: (active: boolean) => void;

  resetAllData: () => void;
}

function mapJourney(journeys: Journey[], journeyId: string, update: (journey: Journey) => Journey): Journey[] {
  return journeys.map((journey) => (journey.id === journeyId ? update(journey) : journey));
}

export const useJourneyStore = create<JourneyStoreState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      startNewJourney: ({ conceptionMode, estimatedDueDate, displayName }) => {
        const id = generateId();
        const now = new Date();
        const journey: Journey = {
          id,
          status: 'active',
          conceptionMode,
          estimatedDueDate,
          actualDeliveryDate: null,
          deliveryType: 'unknown',
          personalizationTags: [],
          clearanceAcknowledgment: null,
          createdAt: now.toISOString(),
          archivedAt: null,
          displayName: displayName ?? `Journey started ${now.toLocaleDateString()}`,
        };
        // Only one Journey may be active: archive (never delete) any other.
        // No entitlement mutation — a Journey Pass never carries over, and
        // a subscription simply covers whichever Journey is active.
        set((state) => ({
          journeys: [
            ...state.journeys.map((j) =>
              j.status === 'active' ? { ...j, status: 'archived' as const, archivedAt: now.toISOString() } : j
            ),
            journey,
          ],
          activeJourneyId: id,
        }));
        return id;
      },

      archiveJourney: (journeyId) => {
        set((state) => ({
          journeys: mapJourney(state.journeys, journeyId, (j) => ({
            ...j,
            status: 'archived',
            archivedAt: new Date().toISOString(),
          })),
          activeJourneyId: state.activeJourneyId === journeyId ? null : state.activeJourneyId,
        }));
      },

      setEstimatedDueDate: (journeyId, estimatedDueDate) => {
        set((state) => ({
          journeys: mapJourney(state.journeys, journeyId, (j) => ({
            ...j,
            estimatedDueDate,
            conceptionMode: 'due_date',
          })),
        }));
      },

      recordDelivery: (journeyId, actualDeliveryDate, deliveryType) => {
        set((state) => ({
          journeys: mapJourney(state.journeys, journeyId, (j) => ({ ...j, actualDeliveryDate, deliveryType })),
        }));
      },

      setPersonalizationTags: (journeyId, tags) => {
        set((state) => ({
          journeys: mapJourney(state.journeys, journeyId, (j) => ({ ...j, personalizationTags: tags })),
        }));
      },

      recordClearanceAcknowledgment: (journeyId, ack) => {
        set((state) => ({
          journeys: mapJourney(state.journeys, journeyId, (j) => ({ ...j, clearanceAcknowledgment: ack })),
        }));
      },

      runAutoArchiveSweep: () => {
        const now = new Date();
        get().journeys.forEach((journey) => {
          if (journey.status === 'active' && isJourneyPastEnd(journey, now)) {
            get().archiveJourney(journey.id);
          }
        });
      },

      addDailyCheckIn: (checkIn) => {
        set((state) => ({
          dailyCheckIns: [
            ...state.dailyCheckIns,
            { ...checkIn, id: generateId(), createdAt: new Date().toISOString() },
          ],
        }));
      },

      startKickCountSession: (journeyId, targetKickCount) => {
        const id = generateId();
        const session: KickCountSession = {
          id,
          journeyId,
          startedAt: new Date().toISOString(),
          endedAt: null,
          kickTimestamps: [],
          targetKickCount,
        };
        set((state) => ({ kickCountSessions: [...state.kickCountSessions, session] }));
        return id;
      },

      recordKick: (sessionId) => {
        set((state) => ({
          kickCountSessions: state.kickCountSessions.map((s) =>
            s.id === sessionId ? { ...s, kickTimestamps: [...s.kickTimestamps, new Date().toISOString()] } : s
          ),
        }));
      },

      undoKick: (sessionId) => {
        set((state) => ({
          kickCountSessions: state.kickCountSessions.map((s) =>
            s.id === sessionId ? { ...s, kickTimestamps: s.kickTimestamps.slice(0, -1) } : s
          ),
        }));
      },

      endKickCountSession: (sessionId) => {
        set((state) => ({
          kickCountSessions: state.kickCountSessions.map((s) =>
            s.id === sessionId ? { ...s, endedAt: new Date().toISOString() } : s
          ),
        }));
      },

      startContractionSession: (journeyId) => {
        const id = generateId();
        const session: ContractionSession = {
          id,
          journeyId,
          startedAt: new Date().toISOString(),
          endedAt: null,
          contractions: [],
        };
        set((state) => ({ contractionSessions: [...state.contractionSessions, session] }));
        return id;
      },

      startContraction: (sessionId) => {
        set((state) => ({
          contractionSessions: state.contractionSessions.map((s) =>
            s.id === sessionId
              ? { ...s, contractions: [...s.contractions, { startedAt: new Date().toISOString(), endedAt: null }] }
              : s
          ),
        }));
      },

      endContraction: (sessionId) => {
        set((state) => ({
          contractionSessions: state.contractionSessions.map((s) => {
            if (s.id !== sessionId) return s;
            const contractions = [...s.contractions];
            const last = contractions[contractions.length - 1];
            if (last && !last.endedAt) {
              contractions[contractions.length - 1] = { ...last, endedAt: new Date().toISOString() };
            }
            return { ...s, contractions };
          }),
        }));
      },

      endContractionSession: (sessionId) => {
        get().endContraction(sessionId);
        set((state) => ({
          contractionSessions: state.contractionSessions.map((s) =>
            s.id === sessionId ? { ...s, endedAt: new Date().toISOString() } : s
          ),
        }));
      },

      addWorkoutSession: (session) => {
        set((state) => ({ workoutSessions: [...state.workoutSessions, { ...session, id: generateId() }] }));
      },

      setReminders: (reminders) => set({ reminders }),
      markReviewRequested: () => set({ hasRequestedReview: true }),
      acknowledgeSafety: () => set({ safetyAcknowledgedAt: new Date().toISOString() }),

      applyStoreSnapshot: (snapshot) => {
        const state = get();
        const active = state.journeys.find((j) => j.id === state.activeJourneyId) ?? null;
        const entitlement = reconcileEntitlement(
          state.entitlement,
          snapshot,
          active,
          new Date(),
          APP_CONFIG.journeyPassRestoreWindowMonths
        );
        if (entitlement !== state.entitlement) set({ entitlement });
      },

      mockPurchaseJourneyPass: (journeyId) => {
        set((state) => ({ entitlement: mockPurchaseJourneyPass(state.entitlement, journeyId, new Date()) }));
      },

      mockSetSubscription: (active) => {
        set((state) => ({ entitlement: mockSetSubscription(state.entitlement, active) }));
      },

      resetAllData: () => {
        // Purchases live with the Apple ID, not here; "Restore purchases"
        // brings a Journey Pass / subscription back after a reset.
        set({ ...initialPersistedState });
      },
    }),
    {
      name: 'prego-posto-workouto-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        journeys: state.journeys,
        activeJourneyId: state.activeJourneyId,
        dailyCheckIns: state.dailyCheckIns,
        kickCountSessions: state.kickCountSessions,
        contractionSessions: state.contractionSessions,
        workoutSessions: state.workoutSessions,
        entitlement: state.entitlement,
        reminders: state.reminders,
        hasRequestedReview: state.hasRequestedReview,
        safetyAcknowledgedAt: state.safetyAcknowledgedAt,
      }),
      migrate: (persisted) => {
        const raw = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...initialPersistedState,
          ...raw,
          workoutSessions: raw.workoutSessions ?? [],
          reminders: raw.reminders ?? initialReminderSettings,
          entitlement: migrateEntitlement(raw.entitlement),
        };
      },
      // Called with (undefined, error) if stored data can't be read — still
      // mark hydrated so the app falls back to an empty store instead of
      // hanging on the splash screen.
      onRehydrateStorage: () => () => {
        useJourneyStore.getState().setHasHydrated(true);
      },
    }
  )
);

/* Selectors. Each returns a stable reference so zustand doesn't re-render in a loop. */

export function useActiveJourney(): Journey | null {
  return useJourneyStore((state) => state.journeys.find((j) => j.id === state.activeJourneyId) ?? null);
}

export function selectActiveJourney(state: PersistedState): Journey | null {
  return state.journeys.find((j) => j.id === state.activeJourneyId) ?? null;
}
