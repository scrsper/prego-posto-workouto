/**
 * Verifies the offline/network-failure behavior of the RevenueCat wrapper:
 * every SDK call can fail (no network, RevenueCat's servers unreachable,
 * etc.) and none of it should ever throw out of this module — everything
 * degrades to a null/error-shaped result the rest of the app already
 * handles gracefully (see journeyStore.ts). This is the one part of the
 * app with a real network dependency; the rest (AsyncStorage-backed
 * Journey data, the entire safety framework) has none by construction.
 *
 * Sets EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and re-imports the module fresh
 * (via jest.isolateModules) so `configureRevenueCat()` actually attempts
 * to configure instead of short-circuiting on "no API key", which is what
 * every other test in this suite relies on instead.
 */

const ORIGINAL_ENV = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

afterEach(() => {
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = ORIGINAL_ENV;
  jest.resetModules();
});

function loadRevenueCatWithApiKey() {
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'test-key';
  let moduleUnderTest!: typeof import('../revenueCat');
  let purchasesMock!: typeof import('react-native-purchases').default;
  jest.isolateModules(() => {
    purchasesMock = require('react-native-purchases').default;
    moduleUnderTest = require('../revenueCat');
  });
  return { revenueCat: moduleUnderTest, purchasesMock };
}

describe('RevenueCat wrapper offline/failure handling', () => {
  it('configureRevenueCat reports success when Purchases.configure does not throw', () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.configure as jest.Mock).mockImplementation(() => {});
    expect(revenueCat.configureRevenueCat()).toBe(true);
    expect(revenueCat.isRevenueCatConfigured()).toBe(true);
  });

  it('configureRevenueCat reports failure (not a throw) when the native call throws — e.g. Expo Go', () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.configure as jest.Mock).mockImplementation(() => {
      throw new Error('native module not available');
    });
    expect(() => revenueCat.configureRevenueCat()).not.toThrow();
    expect(revenueCat.configureRevenueCat()).toBe(false);
  });

  it('fetchJourneyPassPackage/fetchSubscriptionPackage return null (not a throw) when offerings can’t be fetched', async () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.configure as jest.Mock).mockImplementation(() => {});
    revenueCat.configureRevenueCat();
    (purchasesMock.getOfferings as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(revenueCat.fetchJourneyPassPackage()).resolves.toBeNull();
    await expect(revenueCat.fetchSubscriptionPackage()).resolves.toBeNull();
  });

  it('purchasePackage returns a status: "error" outcome (not a throw) on a network failure', async () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.purchasePackage as jest.Mock).mockRejectedValue(new Error('network unreachable'));

    const outcome = await revenueCat.purchasePackage({} as never);
    expect(outcome.status).toBe('error');
  });

  it('purchasePackage returns status: "cancelled" (not "error") when the user backs out, not offline-related', async () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.purchasePackage as jest.Mock).mockRejectedValue({ userCancelled: true });

    const outcome = await revenueCat.purchasePackage({} as never);
    expect(outcome.status).toBe('cancelled');
  });

  it('restorePurchases returns null (not a throw) when offline', async () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.configure as jest.Mock).mockImplementation(() => {});
    revenueCat.configureRevenueCat();
    (purchasesMock.restorePurchases as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(revenueCat.restorePurchases()).resolves.toBeNull();
  });

  it('getCustomerInfo returns null (not a throw) when offline, so cached local entitlement state is left untouched', async () => {
    const { revenueCat, purchasesMock } = loadRevenueCatWithApiKey();
    (purchasesMock.configure as jest.Mock).mockImplementation(() => {});
    revenueCat.configureRevenueCat();
    (purchasesMock.getCustomerInfo as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(revenueCat.getCustomerInfo()).resolves.toBeNull();
  });

  it('fetch/restore/getCustomerInfo all short-circuit to null without configuration, regardless of network', async () => {
    const { revenueCat } = loadRevenueCatWithApiKey();
    // Deliberately not calling configureRevenueCat() here.
    await expect(revenueCat.fetchJourneyPassPackage()).resolves.toBeNull();
    await expect(revenueCat.restorePurchases()).resolves.toBeNull();
    await expect(revenueCat.getCustomerInfo()).resolves.toBeNull();
  });
});
