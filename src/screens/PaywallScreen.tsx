import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { PurchasesPackage } from 'react-native-purchases';
import type { RootStackScreenProps } from '../navigation/types';
import { useJourneyStore } from '../state/journeyStore';
import { useJourneyContext } from '../state/hooks';
import { hasJourneyPass, isPremiumActiveForJourney, needsRenewalPrompt } from '../premium/entitlements';
import {
  billingMode,
  errorMessage,
  loadProducts,
  openManageSubscriptions,
  purchase,
  restorePurchases,
  type StoreProducts,
} from '../premium/billing';
import { APP_CONFIG } from '../config';
import { Card, LinkButton, Muted, PrimaryButton, ScreenContainer, SecondaryButton, SectionTitle } from '../components/Basics';
import { haptics } from '../utils/haptics';
import { colors, spacing, typography } from '../theme/theme';

type Props = RootStackScreenProps<'Paywall'>;

const INCLUDED: { icon: SFSymbol; text: string }[] = [
  { icon: 'person.crop.circle.badge.checkmark', text: 'Routines personalized for diastasis recti, C-section recovery, and multiples' },
  { icon: 'figure.strengthtraining.functional', text: 'Advanced progression exercises (after provider clearance)' },
  { icon: 'doc.text.fill', text: 'Shareable provider-visit summary of your check-ins, workouts, and tracking' },
  { icon: 'book.fill', text: 'In-depth articles on diastasis recti and multiples pregnancies' },
  { icon: 'chart.bar.xaxis', text: 'Compare recovery across Journeys' },
];

const MOCK_PRICES = { journeyPass: '$59.99', monthly: '$9.99' };

type Busy = 'pass' | 'monthly' | 'restore' | null;

export function PaywallScreen({ navigation }: Props) {
  const { journey } = useJourneyContext();
  const entitlement = useJourneyStore((state) => state.entitlement);
  const applyStoreSnapshot = useJourneyStore((state) => state.applyStoreSnapshot);
  const mockPurchasePass = useJourneyStore((state) => state.mockPurchaseJourneyPass);
  const mockSetSubscription = useJourneyStore((state) => state.mockSetSubscription);

  const [products, setProducts] = useState<StoreProducts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const fetchProducts = useCallback(() => {
    if (billingMode !== 'store') return;
    setLoadError(null);
    loadProducts()
      .then(setProducts)
      .catch((error) => setLoadError(errorMessage(error)));
  }, []);

  useEffect(fetchProducts, [fetchProducts]);

  const isActive = isPremiumActiveForJourney(entitlement, journey);
  const isRenewal = journey ? needsRenewalPrompt(entitlement, journey) : false;
  const passForThisJourney = hasJourneyPass(entitlement, journey?.id);

  const passPrice =
    billingMode === 'store' ? products?.journeyPass?.product.priceString : billingMode === 'dev_mock' ? MOCK_PRICES.journeyPass : undefined;
  const monthlyPrice =
    billingMode === 'store' ? products?.monthly?.product.priceString : billingMode === 'dev_mock' ? MOCK_PRICES.monthly : undefined;

  function requireJourney(): boolean {
    if (journey) return true;
    Alert.alert('Start a Journey first', 'Premium unlocks per Journey — start one from the Today tab.');
    return false;
  }

  function celebrate(title: string, message: string) {
    haptics.success();
    Alert.alert(title, message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }

  async function buy(kind: 'pass' | 'monthly') {
    if (!requireJourney()) return;
    if (billingMode === 'dev_mock') {
      if (kind === 'pass') mockPurchasePass(journey!.id);
      else mockSetSubscription(true);
      celebrate('Unlocked (dev mock)', 'No App Store purchase was made — this is a development build without a RevenueCat key.');
      return;
    }
    const pkg: PurchasesPackage | null | undefined = kind === 'pass' ? products?.journeyPass : products?.monthly;
    if (!pkg) return;
    setBusy(kind);
    try {
      const outcome = await purchase(pkg);
      if (outcome.status === 'cancelled') return;
      applyStoreSnapshot(outcome.snapshot);
      celebrate(
        kind === 'pass' ? 'Journey Pass unlocked' : 'Subscription active',
        kind === 'pass'
          ? 'Premium is unlocked for this Journey — permanently, with nothing to cancel.'
          : 'Premium is unlocked. Remember: it renews monthly until you cancel it in Settings.'
      );
    } catch (error) {
      Alert.alert('Purchase didn’t go through', errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (billingMode !== 'store') {
      Alert.alert('Restore purchases', 'Purchases aren’t available in this build.');
      return;
    }
    setBusy('restore');
    try {
      const snapshot = await restorePurchases();
      applyStoreSnapshot(snapshot);
      const state = useJourneyStore.getState();
      const active = state.journeys.find((j) => j.id === state.activeJourneyId) ?? null;
      if (isPremiumActiveForJourney(state.entitlement, active)) {
        celebrate('Purchases restored', 'Premium is unlocked for your current Journey.');
      } else {
        Alert.alert(
          'Nothing to restore',
          snapshot.journeyPassTransactions.length > 0
            ? 'We found an earlier Journey Pass, but it belongs to a previous Journey. A new Journey needs its own pass.'
            : 'We couldn’t find an active purchase for this Apple ID.'
        );
      }
    } catch (error) {
      Alert.alert('Couldn’t restore purchases', errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  const loadingProducts = billingMode === 'store' && !products && !loadError;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <SymbolView name="sparkles" size={40} tintColor={colors.premium} style={{ width: 40, height: 40 }} />
        <Text style={styles.title} accessibilityRole="header">
          {isRenewal ? 'Welcome back' : 'Prego Posto Premium'}
        </Text>
        <Muted style={styles.center}>
          {isRenewal
            ? 'Premium doesn’t carry over to a new Journey automatically. Pick how you’d like to unlock it for this one.'
            : 'One simple unlock for this whole pregnancy-to-postpartum Journey.'}
        </Muted>
      </View>

      <Card>
        {INCLUDED.map((item) => (
          <View key={item.text} style={styles.included}>
            <SymbolView name={item.icon} size={20} tintColor={colors.premium} style={{ width: 24, height: 24 }} />
            <Text style={styles.includedText}>{item.text}</Text>
          </View>
        ))}
      </Card>

      {isActive ? (
        <Card style={{ borderColor: colors.premium, borderWidth: 1 }}>
          <SectionTitle>{passForThisJourney ? 'Journey Pass active for this Journey' : 'Premium active via subscription'}</SectionTitle>
          {!passForThisJourney && entitlement.subscriptionActive ? (
            <>
              <Muted>
                This subscription renews monthly until you cancel it — including after this Journey ends. Apple
                doesn’t let apps cancel for you.
              </Muted>
              <SecondaryButton label="Manage subscription" tone="premium" onPress={() => void openManageSubscriptions()} />
            </>
          ) : null}
        </Card>
      ) : null}

      {billingMode === 'unavailable' ? (
        <Card>
          <SectionTitle>Purchases unavailable</SectionTitle>
          <Muted>In-app purchases aren’t available right now. Please try again later.</Muted>
        </Card>
      ) : loadingProducts ? (
        <ActivityIndicator color={colors.premium} style={{ marginVertical: spacing.lg }} />
      ) : loadError ? (
        <Card>
          <SectionTitle>Couldn’t reach the App Store</SectionTitle>
          <Muted>{loadError}</Muted>
          <SecondaryButton label="Try again" onPress={fetchProducts} />
        </Card>
      ) : (
        <>
          <Card style={{ borderColor: colors.premium, borderWidth: 1.5 }}>
            <View style={styles.recommended}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
            <SectionTitle>Journey Pass{passPrice ? ` — ${passPrice}` : ''}</SectionTitle>
            <Muted>
              One-time purchase for this Journey, from today through 12 months postpartum. Never renews, never bills
              again, and stays unlocked for this Journey even after it’s archived.
            </Muted>
            <PrimaryButton
              label={passForThisJourney ? 'Purchased for this Journey' : busy === 'pass' ? 'Purchasing…' : 'Get the Journey Pass'}
              tone="premium"
              onPress={() => void buy('pass')}
              disabled={passForThisJourney || busy !== null || !passPrice}
            />
          </Card>

          <Card>
            <SectionTitle>Monthly{monthlyPrice ? ` — ${monthlyPrice}/month` : ''}</SectionTitle>
            <Muted>
              Auto-renews monthly until cancelled. Apple doesn’t let apps pause billing, so it keeps renewing after your
              Journey ends unless you cancel in Settings → your name → Subscriptions.
            </Muted>
            <SecondaryButton
              label={entitlement.subscriptionActive ? 'Subscribed' : busy === 'monthly' ? 'Subscribing…' : 'Subscribe monthly'}
              tone="premium"
              onPress={() => void buy('monthly')}
              disabled={entitlement.subscriptionActive || busy !== null || !monthlyPrice}
            />
            {billingMode === 'dev_mock' && entitlement.subscriptionActive ? (
              <LinkButton label="Dev only: simulate cancellation" onPress={() => mockSetSubscription(false)} />
            ) : null}
          </Card>
        </>
      )}

      <LinkButton label={busy === 'restore' ? 'Restoring…' : 'Restore purchases'} onPress={() => void restore()} />

      <Text style={styles.legal}>
        Payment is charged to your Apple ID at confirmation of purchase. The monthly subscription renews automatically
        unless cancelled at least 24 hours before the end of the current period; your account is charged for renewal
        within 24 hours before the period ends. Manage or cancel any time in your App Store account settings. The
        Journey Pass is a non-renewing purchase and is never charged again.
      </Text>
      <View style={styles.legalLinks}>
        <LinkButton label="Terms of Use" color={colors.textMuted} onPress={() => void Linking.openURL(APP_CONFIG.termsOfUseUrl)} />
        <LinkButton
          label="Privacy Policy"
          color={colors.textMuted}
          onPress={() =>
            APP_CONFIG.privacyPolicyUrl ? void Linking.openURL(APP_CONFIG.privacyPolicyUrl) : navigation.navigate('Privacy')
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  title: { ...typography.title, textAlign: 'center', color: colors.text },
  included: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  includedText: { ...typography.body, color: colors.text, flex: 1, lineHeight: 20 },
  recommended: {
    alignSelf: 'flex-start',
    backgroundColor: colors.premiumSurface,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedText: { ...typography.caption, fontSize: 11, color: colors.premium, fontWeight: '800', letterSpacing: 0.5 },
  legal: { ...typography.caption, fontSize: 11, color: colors.textMuted, lineHeight: 16, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
});
