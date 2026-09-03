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
