import * as Notifications from 'expo-notifications';

/**
 * Local-only daily reminder (no push server, no device token leaves the
 * phone). Tapping it opens the daily check-in — see App.tsx.
 */
export const REMINDER_ROUTE = 'DailyCheckIn';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

/** Replaces any existing reminder. Returns the new id, or null if permission was denied. */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  previousId: string | null
): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  await cancelReminder(previousId);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your daily check-in',
      body: 'Log how you’re feeling and see today’s gentle routine.',
      data: { route: REMINDER_ROUTE },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelReminder(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already gone
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
