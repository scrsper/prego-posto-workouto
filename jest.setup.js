// Pin the test process to a fixed timezone so date/trimester/postpartum-week
// math is deterministic regardless of the machine running the tests. Tests
// that specifically exercise timezone-change behavior (see
// pregnancyDates.test.ts) override this locally by reassigning
// process.env.TZ mid-test.
process.env.TZ = 'UTC';

// AsyncStorage's native module isn't available under Jest; use the
// package's own official mock (an in-memory Map) instead.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// react-native-purchases is a native module (unavailable under Jest, same
// as it's unavailable in Expo Go) whose JS package also ships ESM code
// jest-expo's transformIgnorePatterns doesn't cover. Every unit test runs
// with no RevenueCat API key set, so src/premium/revenueCat.ts never calls
// into this beyond `configure` (which then no-ops) — this stub only needs
// to satisfy module resolution, not behave correctly.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));
