import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme/theme';
import { PrimaryButton } from './Basics';

interface State {
  error: Error | null;
}

/**
 * Last-resort crash screen. Everything is stored on-device, so "Try again"
 * just re-renders the tree — nothing is lost.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={typography.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Your Journey data is stored safely on this iPhone. Try again, and if this keeps happening, restart the
            app. If you are having a medical emergency, call 911.
          </Text>
          <PrimaryButton label="Try again" onPress={() => this.setState({ error: null })} />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  body: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
});
