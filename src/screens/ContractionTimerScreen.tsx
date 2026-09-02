import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ContractionTimer'>;

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ContractionTimerScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const startContractionSession = useJourneyStore((state) => state.startContractionSession);
  const startContraction = useJourneyStore((state) => state.startContraction);
  const endContraction = useJourneyStore((state) => state.endContraction);
  const endContractionSession = useJourneyStore((state) => state.endContractionSession);
  const sessions = useJourneyStore((state) => state.contractionSessions);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const contractions = session?.contractions ?? [];
  const active = contractions[contractions.length - 1] ?? null;
  const isContractingNow = !!active && !active.endedAt;

  useEffect(() => {
    if (!isContractingNow) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isContractingNow]);

  function handleStartSession() {
    if (!activeJourney) return;
    setSessionId(startContractionSession(activeJourney.id));
  }

  function handleToggleContraction() {
    if (!sessionId) return;
    if (isContractingNow) {
      endContraction(sessionId);
    } else {
      startContraction(sessionId);
    }
  }

  function handleEndSession() {
    if (sessionId) endContractionSession(sessionId);
    setSessionId(null);
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Contraction timer</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        Tap "Start contraction" when one begins, and "End contraction" when it stops, so we can time duration
        and frequency for you.
      </Text>

      {!session ? (
        <PrimaryButton label="Start session" onPress={handleStartSession} disabled={!activeJourney} />
      ) : (
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          {isContractingNow && active ? (
            <Text style={{ fontSize: 36, fontWeight: '800', color: colors.danger }}>
              {formatSeconds((Date.now() - new Date(active.startedAt).getTime()) / 1000)}
            </Text>
          ) : (
            <Text style={{ ...typography.body, color: colors.textMuted }}>Ready for the next contraction</Text>
          )}
          <PrimaryButton
            label={isContractingNow ? 'End contraction' : 'Start contraction'}
            onPress={handleToggleContraction}
          />
          <SecondaryButton label="End session" onPress={handleEndSession} />
        </Card>
      )}

      <View style={{ gap: spacing.xs }}>
        <Text style={typography.heading}>This session</Text>
        {contractions
          .slice()
          .reverse()
          .map((c, index) => {
            const duration = c.endedAt
              ? (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000
              : null;
            return (
              <Text key={`${c.startedAt}-${index}`} style={{ ...typography.body, color: colors.textMuted }}>
                {new Date(c.startedAt).toLocaleTimeString()} — {duration !== null ? `${formatSeconds(duration)} long` : 'in progress'}
              </Text>
            );
          })}
      </View>

      <DisclaimerBanner />
    </ScreenContainer>
  );
}
