import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { isPremiumActiveForJourney, needsRenewalPrompt } from '../premium/entitlements';
import { Card, PrimaryButton, ScreenContainer, SecondaryButton } from '../components/Basics';
import { colors, spacing, typography } from '../theme/theme';

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
  const purchasesInitialized = useJourneyStore((state) => state.purchasesInitialized);
  const purchaseJourneyPass = useJourneyStore((state) => state.purchaseJourneyPass);
  const purchaseSubscription = useJourneyStore((state) => state.purchaseSubscription);
  const restorePurchases = useJourneyStore((state) => state.restorePurchases);
  const devSimulateCancelSubscription = useJourneyStore((state) => state.devSimulateCancelSubscription);

  const [pendingAction, setPendingAction] = useState<'pass' | 'subscription' | 'restore' | null>(null);

  const isActive = isPremiumActiveForJourney(entitlement, activeJourney);
  const isRenewal = activeJourney ? needsRenewalPrompt(entitlement, activeJourney) : false;
  const hasPassForThisJourney = !!activeJourney && entitlement.journeyPassIds.includes(activeJourney.id);

  async function handlePurchasePass() {
    if (!activeJourney) {
      Alert.alert('Start a Journey first', 'Premium is unlocked per Journey — start one from Home.');
      return;
    }
    setPendingAction('pass');
    const result = await purchaseJourneyPass(activeJourney.id);
    setPendingAction(null);
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      Alert.alert('Couldn’t complete purchase', result.message ?? 'Please try again.');
      return;
    }
    Alert.alert(
      'Journey Pass unlocked',
      result.message ?? 'This Journey now has full premium access — permanently, no renewal needed.'
    );
    navigation.goBack();
  }

  async function handleSubscribe() {
    if (!activeJourney) {
      Alert.alert('Start a Journey first', 'Premium is unlocked per Journey — start one from Home.');
      return;
    }
    // Note: if `isRenewal` is true and RevenueCat is configured, this is a
    // good place to call RevenueCat.getPromotionalOffer()/purchaseDiscountedPackage
    // for a lapsed subscriber instead of the standard purchase flow — not
    // implemented here since it needs a real offer configured in App Store
    // Connect/RevenueCat first.
    setPendingAction('subscription');
    const result = await purchaseSubscription();
    setPendingAction(null);
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      Alert.alert('Couldn’t complete purchase', result.message ?? 'Please try again.');
      return;
    }
    Alert.alert(
      'Subscribed',
      result.message ??
        'Your monthly subscription is active. Remember: you’ll need to cancel it yourself in Settings once you no longer need it.'
    );
    navigation.goBack();
  }

  async function handleRestore() {
    setPendingAction('restore');
    await restorePurchases();
    setPendingAction(null);
    Alert.alert(
      'Restore complete',
      entitlement.subscriptionActive
        ? 'Your subscription is active again.'
        : 'No active subscription was found to restore. (Note: a Journey Pass purchase can only be restored if it was made on this account and device — see README "Known gaps".)'
    );
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>{isRenewal ? 'Welcome back — renew premium' : 'Premium'}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        {isRenewal
          ? 'You’ve had premium before. It doesn’t carry over automatically to a new Journey — pick how you’d like to unlock it again for this one.'
          : 'Premium unlocks per Journey. The Full Journey Pass is a one-time purchase for this Journey — no renewal, no subscription to remember to cancel.'}
      </Text>

      {!purchasesInitialized ? (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ ...typography.caption, color: colors.warning }}>
            Running without RevenueCat configured — purchases below are recorded locally for testing only and
            do not charge real money. See README "RevenueCat setup".
          </Text>
        </Card>
      ) : null}

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
        {pendingAction === 'pass' ? (
          <ActivityIndicator />
        ) : (
          <PrimaryButton
            label={hasPassForThisJourney ? 'Already purchased for this Journey' : 'Get the Journey Pass'}
            onPress={handlePurchasePass}
            disabled={hasPassForThisJourney || pendingAction !== null}
          />
        )}
      </Card>

      <Card>
        <Text style={typography.heading}>Or, monthly subscription — $9.99/mo</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          Auto-renews every month until cancelled. This is a good fit if you’d rather pay as you go, but
          since Apple doesn’t let apps pause billing automatically, it will keep charging you after your
          Journey archives unless you cancel it yourself in iOS Settings → [your name] → Subscriptions.
        </Text>
        {pendingAction === 'subscription' ? (
          <ActivityIndicator />
        ) : (
          <SecondaryButton
            label={entitlement.subscriptionActive ? 'Subscription active' : 'Start monthly subscription'}
            onPress={handleSubscribe}
            disabled={entitlement.subscriptionActive || pendingAction !== null}
          />
        )}
        {/* Only shown when there is no real RevenueCat subscription to (mis)represent as cancelled. */}
        {entitlement.subscriptionActive && !purchasesInitialized ? (
          <SecondaryButton label="(Dev only) Simulate cancel" onPress={devSimulateCancelSubscription} />
        ) : null}
      </Card>

      <Card>
        <Text style={typography.heading}>Already purchased?</Text>
        <Text style={{ ...typography.body, color: colors.textMuted }}>
          If you're signed in with the same account you purchased with, restore your subscription here.
        </Text>
        {pendingAction === 'restore' ? (
          <ActivityIndicator />
        ) : (
          <SecondaryButton label="Restore purchases" onPress={handleRestore} disabled={pendingAction !== null} />
        )}
      </Card>

      <Card>
        <Text style={typography.heading}>What’s included</Text>
        <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.xs }}>
          Personalized program branching (diastasis severity, delivery type, multiples, high-risk modifications) ·
          full advanced/progression exercise library · downloadable clearance/progress summary · ad-free ·
          cross-Journey analytics · one partner viewer seat.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
