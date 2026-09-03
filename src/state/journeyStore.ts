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
  recordJourneyPassPurchase,
  setDemoModeEnabled,
  setSubscriptionActive,
} from '../premium/entitlements';
import { DEMO_MODE_UNLOCK_CODE } from '../premium/demoMode';
import * as RevenueCat from '../premium/revenueCat';

export interface PurchaseActionResult {
  status: 'success' | 'cancelled' | 'error';
  message?: string;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface JourneyStoreState {
  hasHydrated: boolean;
  /** Whether RevenueCat successfully configured (false in Expo Go, or with no API key set — see revenueCat.ts). */
  purchasesInitialized: boolean;
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

  /** Configures RevenueCat (if an API key is set) and syncs current + future subscription status. Call once at app start. */
  initializePurchases: () => Promise<void>;
  /** Buys a Journey Pass for `journeyId` via RevenueCat, or (no RevenueCat configured) records it locally as a dev fallback. */
  purchaseJourneyPass: (journeyId: string) => Promise<PurchaseActionResult>;
  /** Buys the monthly subscription via RevenueCat, or (no RevenueCat configured) records it locally as a dev fallback. */
  purchaseSubscription: () => Promise<PurchaseActionResult>;
  /** Restores prior purchases via RevenueCat and re-syncs subscription status. No-op without RevenueCat configured. */
  restorePurchases: () => Promise<void>;
  /** Dev-only: flips the local subscription flag off without touching any real subscription. Only meaningful when RevenueCat isn't configured — see PaywallScreen. */
  devSimulateCancelSubscription: () => void;

  /** App Store reviewer / QA unlock — see src/premium/demoMode.ts. Returns whether the code was correct. */
  tryEnableDemoMode: (code: string) => boolean;
  disableDemoMode: () => void;

  activeJourney: () => Journey | null;
  archivedJourneys: () => Journey[];
}

export const useJourneyStore = create<JourneyStoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      purchasesInitialized: false,
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
        // Note: no entitlement mutation here. A Journey Pass is scoped to
        // the Journey it was bought for and never carries over; an active
        // subscription (not Journey-scoped) simply keeps covering whatever
        // Journey is active, with no action needed. See
        // src/premium/entitlements.ts for the full explanation and
        // `needsRenewalPrompt` for detecting when to offer renewal.
        set((state) => ({
          journeys: [...state.journeys, journey],
          activeJourneyId: id,
        }));
        return id;
      },

      archiveJourney: (journeyId) => {
        // Note: no entitlement mutation here — a subscription cannot be
        // paused programmatically (see entitlements.ts). If the user has
        // an active subscription, the UI is responsible for reminding them
        // to cancel it themselves; a Journey Pass simply stops mattering
        // once its Journey is archived (still valid if they look back).
        set((state) => ({
          journeys: state.journeys.map((j) =>
            j.id === journeyId
              ? { ...j, status: 'archived', archivedAt: new Date().toISOString() }
              : j
          ),
          activeJourneyId: state.activeJourneyId === journeyId ? null : state.activeJourneyId,
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

      initializePurchases: async () => {
        const configured = RevenueCat.configureRevenueCat();
        set({ purchasesInitialized: configured });
        if (!configured) return;

        const info = await RevenueCat.getCustomerInfo();
        if (info) {
          set((state) => ({
            entitlement: setSubscriptionActive(state.entitlement, RevenueCat.isSubscriptionEntitlementActive(info)),
          }));
        }

        // Keeps subscriptionActive in sync with renewals/expirations/refunds
        // that happen outside the app (e.g. the subscription lapses while
        // the app isn't open, or the user cancels via iOS Settings).
        RevenueCat.subscribeToCustomerInfoUpdates((updatedInfo) => {
          set((state) => ({
            entitlement: setSubscriptionActive(state.entitlement, RevenueCat.isSubscriptionEntitlementActive(updatedInfo)),
          }));
        });
      },

      purchaseJourneyPass: async (journeyId) => {
        if (RevenueCat.isRevenueCatConfigured()) {
          const pkg = await RevenueCat.fetchJourneyPassPackage();
          if (!pkg) {
            return { status: 'error', message: 'The Journey Pass isn’t available right now — please try again shortly.' };
          }
          const outcome = await RevenueCat.purchasePackage(pkg);
          if (outcome.status !== 'success') return outcome;
          set((state) => ({ entitlement: recordJourneyPassPurchase(state.entitlement, journeyId) }));
          return { status: 'success' };
        }

        // Dev/Expo Go fallback — no RevenueCat API key configured, so there
        // is no real product to buy. Records the pass locally so the rest
        // of the app (premium gating, renewal flow, etc.) stays testable.
        set((state) => ({ entitlement: recordJourneyPassPurchase(state.entitlement, journeyId) }));
        return { status: 'success', message: 'Recorded locally — RevenueCat is not configured in this build.' };
      },

      purchaseSubscription: async () => {
        if (RevenueCat.isRevenueCatConfigured()) {
          const pkg = await RevenueCat.fetchSubscriptionPackage();
          if (!pkg) {
            return { status: 'error', message: 'The subscription isn’t available right now — please try again shortly.' };
          }
          const outcome = await RevenueCat.purchasePackage(pkg);
          if (outcome.status !== 'success') return outcome;
          set((state) => ({ entitlement: setSubscriptionActive(state.entitlement, true) }));
          return { status: 'success' };
        }

        set((state) => ({ entitlement: setSubscriptionActive(state.entitlement, true) }));
        return { status: 'success', message: 'Recorded locally — RevenueCat is not configured in this build.' };
      },

      restorePurchases: async () => {
        if (!RevenueCat.isRevenueCatConfigured()) return;
        const info = await RevenueCat.restorePurchases();
        if (info) {
          set((state) => ({
            entitlement: setSubscriptionActive(state.entitlement, RevenueCat.isSubscriptionEntitlementActive(info)),
          }));
        }
      },

      devSimulateCancelSubscription: () => {
        set((state) => ({ entitlement: setSubscriptionActive(state.entitlement, false) }));
      },

      tryEnableDemoMode: (code) => {
        if (code !== DEMO_MODE_UNLOCK_CODE) return false;
        set((state) => ({ entitlement: setDemoModeEnabled(state.entitlement, true) }));
        return true;
      },

      disableDemoMode: () => {
        set((state) => ({ entitlement: setDemoModeEnabled(state.entitlement, false) }));
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
