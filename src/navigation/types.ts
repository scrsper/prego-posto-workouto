import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Today: undefined;
  Exercises: undefined;
  Track: undefined;
  Learn: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  /** With `updateJourneyId`, sets the due date on an existing (trying-to-conceive) Journey instead. */
  NewJourney: { updateJourneyId?: string } | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  JourneyArchive: undefined;
  ExerciseDetail: { exerciseId: string };
  WorkoutPlayer: { exerciseIds: string[]; title: string };
  DailyCheckIn: undefined;
  KickCounter: undefined;
  ContractionTimer: undefined;
  SafetyChecklist: undefined;
  ClearanceAcknowledgment: undefined;
  Delivery: undefined;
  ArticleDetail: { articleId: string };
  Paywall: undefined;
  Privacy: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
