import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ARTICLES } from '../data/articles';
import { useJourneyStore } from '../state/journeyStore';
import { isPremiumActiveForJourney } from '../premium/entitlements';
import { PremiumLockedNotice } from '../components/PremiumGate';
import { Card, ScreenContainer } from '../components/Basics';
import { colors, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArticleDetail'>;

export function ArticleDetailScreen({ route, navigation }: Props) {
  const article = ARTICLES.find((item) => item.id === route.params.articleId);
  const activeJourney = useJourneyStore((state) => state.activeJourney());
  const entitlement = useJourneyStore((state) => state.entitlement);
  const isPremium = isPremiumActiveForJourney(entitlement, activeJourney);

  if (!article) {
    return (
      <ScreenContainer>
        <Text style={typography.body}>Article not found.</Text>
      </ScreenContainer>
    );
  }

  if (article.isPremium && !isPremium) {
    return (
      <ScreenContainer>
        <Text style={typography.title}>{article.title}</Text>
        <PremiumLockedNotice onUpgradePress={() => navigation.navigate('Paywall')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>{article.title}</Text>
      <Card>
        <Text style={{ ...typography.body, color: colors.text, lineHeight: 22 }}>{article.body}</Text>
      </Card>
    </ScreenContainer>
  );
}
