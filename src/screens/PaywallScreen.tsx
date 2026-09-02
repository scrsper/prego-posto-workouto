import React from 'react';
import { Alert, Linking, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { isPremiumActiveForJourney, needsRenewalPrompt } from '../premium/entitlements';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { colors, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/**
 * Opens the platform's subscription-management surface. This is the only
 * way a user (or we) can actually cancel a real auto-renewing subscription
 * — there is no in-app "cancel" API. On a non-iOS device or if the deep
 * link fails, fall back to telling them where to look.
 */
async function openManageSubscriptions() {
  const url = 'itms-apps://apps.apple.com/account/subscriptions';
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to the alert below
  }
  Alert.alert(
    'Manage your subscription',
    'Open the App Store, tap your profile icon, then Subscriptions, to view or cancel this plan.'
  );
}

export function PaywallScreen({ navigation }: Props) {
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);
  const purchaseJourneyPass = useJourneyStore((state) => state.purchaseJourneyPass);
  const activateSubscription = useJourneyStore((state) => state.activateSubscription);
  const deactivateSubscription = useJourneyStore((state) => state.deactivateSubscription);

  const isActive = isPremiumActiveForJourney(entitlement, activeJourney);
  const isRenewal = activeJourney ? needsRenewalPrompt(entitlement, activeJourney) : false;
  const hasPassForThisJourney = !!activeJourney && entitlement.journeyPassIds.includes(activeJourney.id);

  function handlePurchasePass() {
    if (!activeJourney) {
      Alert.alert('Start a Journey first', 'Premium is unlocked per Journey — start one from Home.');
      return;
    }
    // Integration point: replace with a RevenueCat purchase of the
    // non-renewing "Full Journey Pass" product, then call
    // purchaseJourneyPass() from the resulting purchase-completed callback.
    purchaseJourneyPass(activeJourney.id);
    Alert.alert('Journey Pass unlocked', 'This Journey now has full premium access — permanently, no renewal needed.');
    navigation.goBack();
  }

  function handleSubscribe() {
    if (!activeJourney) {
      Alert.alert('Start a Journey first', 'Premium is unlocked per Journey — start one from Home.');
      return;
    }
    // Integration point: replace with a RevenueCat purchase of the
    // auto-renewing monthly subscription product. If `isRenewal` is true,
    // this is a good place to instead present a RevenueCat promotional
    // offer to a lapsed subscriber rather than the standard purchase flow.
    activateSubscription();
    Alert.alert('Subscribed', 'Your monthly subscription is active. Remember: you’ll need to cancel it yourself in Settings once you no longer need it.');
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>{isRenewal ? 'Welcome back — renew premium' : 'Premium'}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        {isRenewal
          ? 'You’ve had premium before. It doesn’t carry over automatically to a new Journey — pick how you’d like to unlock it again for this one.'
          : 'Premium unlocks per Journey. The Full Journey Pass is a one-time purchase for this Journey — no renewal, no subscription to remember to cancel.'}
      </Text>

      {isActive ? (
        <Card style={{ borderColor: colors.premium }}>
          <Text style={typography.heading}>
            {hasPassForThisJourney ? 'Journey Pass active for this Journey' : 'Premium is active (via subscription)'}
          </Text>
          {!hasPassForThisJourney && entitlement.subscriptionActive ? (
            <>
              <Text style={{ ...typography.body, color: colors.textMuted }}>
                This is an auto-renewing subscription — it keeps billing monthly until you cancel it yourself.
                We can’t cancel it for you from here; iOS doesn’t allow that.
              </Text>
              <SecondaryButton label="Manage subscription in Settings" onPress={openManageSubscriptions} />
            </>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ borderColor: colors.primary }}>
        <Text style={typography.heading}>Full Journey Pass — $59.99, one time</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Covers this entire pregnancy-through-12-months-postpartum arc. Never renews, never bills again, and
          stays unlocked for this Journey permanently — including after it archives.
        </Text>
        <PrimaryButton
          label={hasPassForThisJourney ? 'Already purchased for this Journey' : 'Get the Journey Pass'}
          onPress={handlePurchasePass}
          disabled={hasPassForThisJourney}
        />
      </Card>

      <Card>
        <Text style={typography.heading}>Or, monthly subscription — $9.99/mo</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Auto-renews every month until cancelled. This is a good fit if you’d rather pay as you go, but
          since Apple doesn’t let apps pause billing automatically, it will keep charging you after your
          Journey archives unless you cancel it yourself in iOS Settings → [your name] → Subscriptions.
        </Text>
        <SecondaryButton
          label={entitlement.subscriptionActive ? 'Subscription active' : 'Start monthly subscription'}
          onPress={handleSubscribe}
          disabled={entitlement.subscriptionActive}
        />
        {entitlement.subscriptionActive ? (
          <SecondaryButton label="(Dev only) Simulate cancel" onPress={deactivateSubscription} />
        ) : null}
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
