import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { Card, LinkButton, Muted, PrimaryButton, RowDivider, ScreenContainer, SecondaryButton, SectionTitle } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { kickSessionMinutes } from '../utils/tracking';
import { formatClock } from '../utils/workout';
import { haptics } from '../utils/haptics';
import { colors, spacing, typography } from '../theme/theme';

/** An unfinished session older than this is treated as abandoned. */
const STALE_SESSION_MS = 12 * 60 * 60 * 1000;

type Props = RootStackScreenProps<'KickCounter'>;

const TARGET_KICKS = 10;

export function KickCounterScreen({ navigation }: Props) {
  const { journey } = useJourneyContext();
  const startKickCountSession = useJourneyStore((state) => state.startKickCountSession);
  const recordKick = useJourneyStore((state) => state.recordKick);
  const undoKick = useJourneyStore((state) => state.undoKick);
  const endKickCountSession = useJourneyStore((state) => state.endKickCountSession);
  const sessions = useJourneyStore((state) => state.kickCountSessions);

  // An unfinished session survives leaving the screen or closing the app.
  const session = useMemo(
    () => sessions.find(
        (s) =>
          s.journeyId === journey?.id &&
          !s.endedAt &&
          Date.now() - new Date(s.startedAt).getTime() < STALE_SESSION_MS
      ) ?? null,
    [sessions, journey?.id]
  );
  const history = useMemo(
    () => sessions.filter((s) => s.journeyId === journey?.id && s.endedAt).slice(-7).reverse(),
    [sessions, journey?.id]
  );

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const kickCount = session?.kickTimestamps.length ?? 0;
  const elapsedSeconds = session ? (now - new Date(session.startedAt).getTime()) / 1000 : 0;

  function handleKick() {
    if (!session) return;
    recordKick(session.id);
    if (kickCount + 1 === TARGET_KICKS) haptics.success();
    else haptics.firm();
  }

  return (
    <ScreenContainer>
      <Muted>
        Many providers suggest counting movements at the same time each day, often after a meal, and noting how long it
        takes to feel {TARGET_KICKS}. Every baby is different — what matters most is a change from your baby’s usual pattern.
      </Muted>

      {!session ? (
        <PrimaryButton label="Start counting" icon="play.fill" onPress={() => journey && startKickCountSession(journey.id, TARGET_KICKS)} disabled={!journey} />
      ) : (
        <Card style={styles.counterCard}>
          <Text style={styles.elapsed}>{formatClock(elapsedSeconds)}</Text>
          <Pressable
            onPress={handleKick}
            accessibilityRole="button"
            accessibilityLabel={`Record a movement. ${kickCount} of ${TARGET_KICKS} so far`}
            style={({ pressed }) => [styles.kickButton, kickCount >= TARGET_KICKS && styles.kickButtonDone, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.kickCount}>{kickCount}</Text>
            <Text style={styles.kickLabel}>{kickCount >= TARGET_KICKS ? 'Target reached' : `of ${TARGET_KICKS} · tap for each movement`}</Text>
          </Pressable>
          {kickCount > 0 ? <LinkButton label="Undo last" onPress={() => undoKick(session.id)} color={colors.textMuted} /> : null}
          <SecondaryButton label="Finish session" onPress={() => endKickCountSession(session.id)} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}

      <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
        <Text style={styles.warning}>
          If your baby is moving less than usual, don’t wait — call your provider or labor & delivery right away.
        </Text>
        <LinkButton label="See all warning signs" color={colors.danger} onPress={() => navigation.navigate('SafetyChecklist')} />
      </Card>

      <Card>
        <SectionTitle>Recent sessions</SectionTitle>
        {history.length === 0 ? (
          <Muted>No sessions yet.</Muted>
        ) : (
          history.map((s, index) => {
            const minutes = kickSessionMinutes(s);
            const reached = s.kickTimestamps.length >= s.targetKickCount;
            return (
              <View key={s.id}>
                {index > 0 ? <RowDivider /> : null}
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(s.startedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.historyValue}>
                    {s.kickTimestamps.length} {reached && minutes ? `in ${minutes} min` : 'movements'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  counterCard: { alignItems: 'center', gap: spacing.md },
  elapsed: { ...typography.heading, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  kickButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  kickButtonDone: { backgroundColor: colors.success },
  kickCount: { fontSize: 72, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  kickLabel: { ...typography.caption, color: '#fff', textAlign: 'center' },
  warning: { ...typography.body, color: colors.danger, fontWeight: '600', lineHeight: 21 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  historyDate: { ...typography.body, color: colors.text },
  historyValue: { ...typography.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
