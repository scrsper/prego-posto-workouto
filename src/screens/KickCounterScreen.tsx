import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'KickCounter'>;

const TARGET_KICKS = 10;

export function KickCounterScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const startKickCountSession = useJourneyStore((state) => state.startKickCountSession);
  const recordKick = useJourneyStore((state) => state.recordKick);
  const endKickCountSession = useJourneyStore((state) => state.endKickCountSession);
  const sessions = useJourneyStore((state) => state.kickCountSessions);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const kickCount = session?.kickTimestamps.length ?? 0;

  useEffect(() => {
    if (!session || session.endedAt) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  function handleStart() {
    if (!activeJourney) return;
    const id = startKickCountSession(activeJourney.id, TARGET_KICKS);
    setSessionId(id);
    setElapsedSeconds(0);
  }

  function handleEnd() {
    if (sessionId) endKickCountSession(sessionId);
    setSessionId(null);
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <ScreenContainer>
      <Text style={typography.title}>Kick counter</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        Many providers suggest counting until you feel {TARGET_KICKS} movements, and calling if it consistently
        takes much longer than usual for you.
      </Text>

      {!session ? (
        <PrimaryButton label="Start counting" onPress={handleStart} disabled={!activeJourney} />
      ) : (
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 48, fontWeight: '800', color: colors.primaryDark }}>
            {kickCount} / {TARGET_KICKS}
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            {minutes}:{seconds.toString().padStart(2, '0')} elapsed
          </Text>
          <PrimaryButton label="I felt a kick" onPress={() => recordKick(session.id)} />
          <SecondaryButton label="End session" onPress={handleEnd} />
        </Card>
      )}

      <View style={{ gap: spacing.xs }}>
        <Text style={typography.heading}>Recent sessions</Text>
        {sessions
          .filter((s) => s.journeyId === activeJourney?.id && s.endedAt)
          .slice(-5)
          .reverse()
          .map((s) => (
            <Text key={s.id} style={{ ...typography.body, color: colors.textMuted }}>
              {new Date(s.startedAt).toLocaleString()}: {s.kickTimestamps.length} kicks
            </Text>
          ))}
      </View>

      <DisclaimerBanner />
    </ScreenContainer>
  );
}
