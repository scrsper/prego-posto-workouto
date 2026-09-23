import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { ARTICLES } from '../data/articles';
import { PremiumBadge } from '../components/PremiumGate';
import { Card, ScreenContainer } from '../components/Basics';
import { colors, spacing, typography } from '../theme/theme';
import { useJourneyContext } from '../state/hooks';
import type { Article } from '../types/journey';

export function ArticlesScreen({ navigation }: MainTabScreenProps<'Learn'>) {
  const { isPremium } = useJourneyContext();

  function renderItem({ item }: { item: Article }) {
    return (
      <Pressable
        onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}
        accessibilityRole="button"
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.heading, { flex: 1 }]}>{item.title}</Text>
            {item.isPremium && !isPremium ? <PremiumBadge /> : null}
          </View>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{item.summary}</Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenContainer scroll={false} largeTitle="Learn">
      <FlatList
        data={ARTICLES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.xs }}
      />
    </ScreenContainer>
  );
}
