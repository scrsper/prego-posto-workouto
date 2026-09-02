import React from 'react';
import { Alert, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { colors, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);
  const purchasePremium = useJourneyStore((state) => state.purchasePremium);
  const cancelPremium = useJourneyStore((state) => state.cancelPremium);
  const resumePremiumForActiveJourney = useJourneyStore((state) => state.resumePremiumForActiveJourney);

  const isActive = isPremiumActiveForJourney(entitlement, activeJourney);

  function handlePurchase(plan: 'monthly_pausable' | 'full_journey_pass') {
    if (!activeJourney) {
      Alert.alert('Start a Journey first', 'Premium is unlocked per Journey — start one from Home.');
      return;
    }
    // Integration point: replace with RevenueCat purchase flow, then call
    // purchasePremium() from the resulting webhook/customer-info listener.
    purchasePremium(plan, activeJourney.id);
    Alert.alert('Premium unlocked', 'This Journey now has full premium access.');
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Premium</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        Premium is tied to your active Journey. When your Journey archives, billing automatically pauses — you
        keep all your free-tier access and history, and resume premium with one tap for your next Journey.
      </Text>

      {isActive ? (
        <Card style={{ borderColor: colors.premium }}>
          <Text style={typography.heading}>Premium is active for this Journey</Text>
          <SecondaryButton label="Cancel premium" onPress={cancelPremium} />
        </Card>
      ) : null}

      {!isActive && entitlement.isPaused ? (
        <Card style={{ borderColor: colors.premium }}>
          <Text style={typography.heading}>Your premium is paused</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            Resume it for this Journey with one tap — no need to re-subscribe.
          </Text>
          <PrimaryButton label="Resume premium" onPress={resumePremiumForActiveJourney} />
        </Card>
      ) : null}

      <Card>
        <Text style={typography.heading}>Monthly, pausable — $9.99/mo</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Active only while your Journey is active. Automatically pauses when your Journey archives.
        </Text>
        <PrimaryButton label="Choose monthly" onPress={() => handlePurchase('monthly_pausable')} />
      </Card>

      <Card>
        <Text style={typography.heading}>Full Journey Pass — $59.99 one-time</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Covers this entire pregnancy-through-12-months-postpartum arc, no subscription.
        </Text>
        <SecondaryButton label="Choose Full Journey Pass" onPress={() => handlePurchase('full_journey_pass')} />
      </Card>

      <Card>
        <Text style={typography.heading}>What’s included</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Personalized program branching (diastasis severity, delivery type, multiples, high-risk modifications) ·
          full advanced/progression exercise library · downloadable clearance/progress summary · ad-free ·
          cross-Journey analytics · one partner viewer seat.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
