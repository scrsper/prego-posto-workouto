import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Dev-build-only reminder that safety/medical content has not been
 * clinically reviewed — see CONTENT_REVIEW_CHECKLIST.md. `__DEV__` is
 * false in a release build, so this never ships to real users; it exists
 * purely so nobody testing the app mistakes placeholder content for
 * reviewed guidance.
 */
if (__DEV__) {
  console.warn(
    '[prego-posto-workouto] DEV BUILD: exercise/article/red-flag safety content is UNREVIEWED ' +
      'placeholder content (AI-generated, not clinician-checked). See CONTENT_REVIEW_CHECKLIST.md ' +
      'before treating any of it as validated medical guidance.'
  );
}

export function DevContentWarningBanner() {
  // Renders nothing at all (not even an empty colored strip) outside dev —
  // __DEV__ is false in release builds, so this whole component collapses
  // to null and adds no layout in production.
  if (!__DEV__) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.container} pointerEvents="none">
      <Text style={styles.text}>
        DEV BUILD — safety/exercise/article content is UNREVIEWED. See CONTENT_REVIEW_CHECKLIST.md.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#B00020',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
