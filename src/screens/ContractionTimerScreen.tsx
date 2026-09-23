import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { Card, LinkButton, Muted, PrimaryButton, RowDivider, ScreenContainer, SecondaryButton, SectionTitle, StatTile } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { contractionStats } from '../utils/tracking';
import { formatClock } from '../utils/workout';
import { haptics } from '../utils/haptics';
import { colors, spacing, typography } from '../theme/theme';

/** An unfinished session older than this is treated as abandoned. */
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

type Props = RootStackScreenProps<'ContractionTimer'>;

export function ContractionTimerScreen({ navigation }: Props) {
  const { journey } = useJourneyContext();
  const startContractionSession = useJourneyStore((state) => state.startContractionSession);
  const startContraction = useJourneyStore((state) => state.startContraction);
  const endContraction = useJourneyStore((state) => state.endContraction);
  const endContractionSession = useJourneyStore((state) => state.endContractionSession);
  const sessions = useJourneyStore((state) => state.contractionSessions);

  const session = useMemo(
    () => sessions.find(
        (s) =>
          s.journeyId === journey?.id &&
          !s.endedAt &&
          Date.now() - new Date(s.startedAt).getTime() < STALE_SESSION_MS
      ) ?? null,
    [sessions, journey?.id]
  );
  const contractions = session?.contractions ?? [];
  const active = contractions[contractions.length - 1] ?? null;
  const isContractingNow = !!active && !active.endedAt;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const stats = contractionStats(contractions, new Date(now));
  const lastEnded = [...contractions].reverse().find((c) => c.endedAt);
  const sinceLast = !isContractingNow && lastEnded ? (now - new Date(lastEnded.startedAt).getTime()) / 1000 : null;

  function handleToggle() {
    if (!session) return;
    if (isContractingNow) {
      endContraction(session.id);
      haptics.tap();
    } else {
      startContraction(session.id);
      haptics.firm();
    }
  }

  return (
    <ScreenContainer>
      <Muted>Tap when a contraction starts and again when it ends. We’ll time how long they last and how far apart they are.</Muted>

      {!session ? (
        <PrimaryButton label="Start timing" icon="stopwatch.fill" onPress={() => journey && startContractionSession(journey.id)} disabled={!journey} />
      ) : (
        <Card style={styles.timerCard}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole="button"
            accessibilityLabel={isContractingNow ? 'Contraction ended' : 'Contraction started'}
            style={({ pressed }) => [
              styles.bigButton,
              { backgroundColor: isContractingNow ? colors.danger : colors.primary },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={styles.bigTime}>
              {isContractingNow && active ? formatClock((now - new Date(active.startedAt).getTime()) / 1000) : sinceLast !== null ? formatClock(sinceLast) : '0:00'}
            </Text>
            <Text style={styles.bigLabel}>
              {isContractingNow ? 'Tap when it ends' : sinceLast !== null ? 'since last start · tap when one begins' : 'Tap when one begins'}
            </Text>
          </Pressable>
          <View style={styles.stats}>
            <StatTile value={String(stats.count)} label="last hour" />
            <StatTile value={stats.averageDurationSeconds ? formatClock(stats.averageDurationSeconds) : '—'} label="avg length" />
            <StatTile value={stats.averageFrequencySeconds ? formatClock(stats.averageFrequencySeconds) : '—'} label="avg apart" />
          </View>
          <SecondaryButton label="End session" onPress={() => endContractionSession(session.id)} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}

      <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
        <Text style={styles.warning}>
          Follow the plan your provider gave you for when to call or go in. Call right away for contractions before 37
          weeks, bleeding, fluid leaking, fever, or less movement from your baby.
        </Text>
        <LinkButton label="See all warning signs" color={colors.danger} onPress={() => navigation.navigate('SafetyChecklist')} />
      </Card>

      {contractions.length > 0 ? (
        <Card>
          <SectionTitle>This session</SectionTitle>
          {contractions
            .slice()
            .reverse()
            .map((c, index, list) => {
              const duration = c.endedAt ? (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000 : null;
              const previous = list[index + 1];
              const apart = previous ? (new Date(c.startedAt).getTime() - new Date(previous.startedAt).getTime()) / 1000 : null;
              return (
                <View key={c.startedAt}>
                  {index > 0 ? <RowDivider /> : null}
                  <View style={styles.row}>
                    <Text style={styles.rowTime}>{new Date(c.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                    <Text style={styles.rowValue}>
                      {duration !== null ? `${formatClock(duration)} long` : 'in progress'}
                      {apart !== null ? ` · ${formatClock(apart)} apart` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
        </Card>
      ) : null}

      <DisclaimerBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  timerCard: { alignItems: 'center', gap: spacing.md },
  bigButton: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  bigTime: { fontSize: 52, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  bigLabel: { ...typography.caption, color: '#fff', textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  warning: { ...typography.body, color: colors.danger, fontWeight: '600', lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowTime: { ...typography.body, color: colors.text },
  rowValue: { ...typography.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
