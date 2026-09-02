import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Home: undefined;
  Exercises: undefined;
  Track: undefined;
  Learn: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  NewJourney: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  JourneyArchive: undefined;
  ExerciseDetail: { exerciseId: string };
  DailyCheckIn: undefined;
  KickCounter: undefined;
  ContractionTimer: undefined;
  SafetyChecklist: undefined;
  ClearanceAcknowledgment: undefined;
  ArticleDetail: { articleId: string };
  Paywall: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
