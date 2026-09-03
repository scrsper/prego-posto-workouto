// Explicitly pulls in @types/jest's global declarations (describe, it,
// expect, jest, beforeEach, ...) for the whole program. Needed because this
// project's tsconfig (via expo/tsconfig.base, under TypeScript 6's
// "bundler" module resolution) doesn't auto-include @types/jest globally
// even though it's installed — without this, `tsc --noEmit` fails on every
// test file even though Jest itself runs and passes them fine.
/// <reference types="jest" />
