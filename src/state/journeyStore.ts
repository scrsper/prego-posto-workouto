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
} from '../types/journey';
import { isJourneyPastEnd } from '../utils/pregnancyDates';
import {
  type EntitlementState,
  initialEntitlementState,
  mockCancel,
  mockPurchase,
  pauseEntitlementOnJourneyArchive,
  resumeEntitlementForNewJourney,
  type SubscriptionPlan,
} from '../premium/entitlements';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface JourneyStoreState {
  hasHydrated: boolean;
  journeys: Journey[];
  activeJourneyId: string | null;
  dailyCheckIns: DailyCheckIn[];
  kickCountSessions: KickCountSession[];
  contractionSessions: ContractionSession[];
  entitlement: EntitlementState;

  setHasHydrated: (value: boolean) => void;

  startNewJourney: (input: {
    conceptionMode: ConceptionMode;
    estimatedDueDate: string | null;
    displayName?: string;
  }) => string;
  archiveJourney: (journeyId: string) => void;
  updateJourneyDelivery: (
    journeyId: string,
    actualDeliveryDate: string,
    deliveryType: DeliveryType
  ) => void;
  setPersonalizationTags: (journeyId: string, tags: string[]) => void;
  recordClearanceAcknowledgment: (journeyId: string, ack: ClearanceAcknowledgment) => void;
  runAutoArchiveSweep: () => void;

  addDailyCheckIn: (checkIn: Omit<DailyCheckIn, 'id' | 'createdAt'>) => void;

  startKickCountSession: (journeyId: string, targetKickCount: number) => string;
  recordKick: (sessionId: string) => void;
  endKickCountSession: (sessionId: string) => void;

  startContractionSession: (journeyId: string) => string;
  startContraction: (sessionId: string) => void;
  endContraction: (sessionId: string) => void;
  endContractionSession: (sessionId: string) => void;

  purchasePremium: (plan: Exclude<SubscriptionPlan, 'none'>, journeyId: string) => void;
  cancelPremium: () => void;
  resumePremiumForActiveJourney: () => void;

  activeJourney: () => Journey | null;
  archivedJourneys: () => Journey[];
}

export const useJourneyStore = create<JourneyStoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      journeys: [],
      activeJourneyId: null,
      dailyCheckIns: [],
      kickCountSessions: [],
      contractionSessions: [],
      entitlement: initialEntitlementState,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      startNewJourney: ({ conceptionMode, estimatedDueDate, displayName }) => {
        const id = generateId();
        const journey: Journey = {
          id,
          status: 'active',
          conceptionMode,
          estimatedDueDate,
          actualDeliveryDate: null,
          deliveryType: 'unknown',
          personalizationTags: [],
          clearanceAcknowledgment: null,
          createdAt: new Date().toISOString(),
          archivedAt: null,
          displayName: displayName ?? `Journey started ${new Date().toLocaleDateString()}`,
        };
        set((state) => ({
          journeys: [...state.journeys, journey],
          activeJourneyId: id,
          entitlement: resumeEntitlementForNewJourney(state.entitlement, id),
        }));
        return id;
      },

      archiveJourney: (journeyId) => {
        set((state) => ({
          journeys: state.journeys.map((j) =>
            j.id === journeyId
              ? { ...j, status: 'archived', archivedAt: new Date().toISOString() }
              : j
          ),
          activeJourneyId: state.activeJourneyId === journeyId ? null : state.activeJourneyId,
          entitlement: pauseEntitlementOnJourneyArchive(state.entitlement, journeyId),
        }));
      },

      updateJourneyDelivery: (journeyId, actualDeliveryDate, deliveryType) => {
        set((state) => ({
          journeys: state.journeys.map((j) =>
            j.id === journeyId ? { ...j, actualDeliveryDate, deliveryType } : j
          ),
        }));
      },

      setPersonalizationTags: (journeyId, tags) => {
        set((state) => ({
          journeys: state.journeys.map((j) =>
            j.id === journeyId ? { ...j, personalizationTags: tags } : j
          ),
        }));
      },

      recordClearanceAcknowledgment: (journeyId, ack) => {
        set((state) => ({
          journeys: state.journeys.map((j) =>
            j.id === journeyId ? { ...j, clearanceAcknowledgment: ack } : j
          ),
        }));
      },

      runAutoArchiveSweep: () => {
        const state = get();
        const now = new Date();
        state.journeys.forEach((journey) => {
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
            s.id === sessionId
              ? { ...s, kickTimestamps: [...s.kickTimestamps, new Date().toISOString()] }
              : s
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
        set((state) => ({
          contractionSessions: state.contractionSessions.map((s) =>
            s.id === sessionId ? { ...s, endedAt: new Date().toISOString() } : s
          ),
        }));
      },

      purchasePremium: (plan, journeyId) => {
        set((state) => ({ entitlement: mockPurchase(state.entitlement, plan, journeyId) }));
      },

      cancelPremium: () => {
        set((state) => ({ entitlement: mockCancel(state.entitlement) }));
      },

      resumePremiumForActiveJourney: () => {
        const active = get().activeJourney();
        if (!active) return;
        set((state) => ({
          entitlement: resumeEntitlementForNewJourney(state.entitlement, active.id),
        }));
      },

      activeJourney: () => {
        const state = get();
        return state.journeys.find((j) => j.id === state.activeJourneyId) ?? null;
      },

      archivedJourneys: () => {
        return get()
          .journeys.filter((j) => j.status === 'archived')
          .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
      },
    }),
    {
      name: 'prego-posto-workouto-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        journeys: state.journeys,
        activeJourneyId: state.activeJourneyId,
        dailyCheckIns: state.dailyCheckIns,
        kickCountSessions: state.kickCountSessions,
        contractionSessions: state.contractionSessions,
        entitlement: state.entitlement,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
