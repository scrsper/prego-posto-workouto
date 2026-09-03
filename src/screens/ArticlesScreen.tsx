import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { MainTabScreenProps } from '../navigation/types';
import { ARTICLES } from '../data/articles';
import { PremiumBadge } from '../components/PremiumGate';
import { Card, ScreenContainer } from '../components/Basics';
import { spacing, typography } from '../theme/theme';
import { colors } from '../theme/theme';
import type { Article } from '../types/journey';

export function ArticlesScreen({ navigation }: MainTabScreenProps<'Learn'>) {
  function renderItem({ item }: { item: Article }) {
    return (
      <Pressable onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={typography.heading}>{item.title}</Text>
            {item.isPremium ? <PremiumBadge /> : null}
          </View>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{item.summary}</Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <Text style={[typography.title, { marginBottom: spacing.sm }]}>Learn</Text>
      <FlatList
        style={{ flex: 1 }}
        data={ARTICLES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <Card>
            <Text style={typography.heading}>No articles to show</Text>
            <Text style={{ ...typography.body, color: colors.textMuted }}>
              That's unexpected — try restarting the app. If this keeps happening, please let us know.
            </Text>
          </Card>
        }
      />
    </ScreenContainer>
  );
}
