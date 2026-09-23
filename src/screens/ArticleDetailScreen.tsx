import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ARTICLES } from '../data/articles';
import { useJourneyContext } from '../state/hooks';
import { PremiumLockedNotice } from '../components/PremiumGate';
import { Card, ScreenContainer } from '../components/Basics';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { colors, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArticleDetail'>;

export function ArticleDetailScreen({ route, navigation }: Props) {
  const article = ARTICLES.find((item) => item.id === route.params.articleId);
  const { isPremium } = useJourneyContext();

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
      <Text style={typography.title} accessibilityRole="header">
        {article.title}
      </Text>
      <Text style={{ ...typography.body, color: colors.textMuted, fontStyle: 'italic' }}>{article.summary}</Text>
      <Card>
        <Text style={{ ...typography.body, fontSize: 17, color: colors.text, lineHeight: 26 }}>{article.body}</Text>
      </Card>
      <DisclaimerBanner compact />
    </ScreenContainer>
  );
}
