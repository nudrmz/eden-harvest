/**
 * Notification preferences, stored on the auth user's metadata so they follow
 * the account across devices and the server can honour them when emailing.
 * Shared by the settings page (client) and the Stream webhook (server).
 */
export const NOTIFICATION_PREFS_METADATA_KEY = "notification_prefs";

export interface NotificationPrefs {
  /** Email me about new chat messages while I'm away. */
  enquiries: boolean;
  listingUpdates: boolean;
  marketing: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enquiries: true,
  listingUpdates: true,
  marketing: false
};

export function readNotificationPrefs(metadata: unknown): NotificationPrefs {
  const stored =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)[NOTIFICATION_PREFS_METADATA_KEY]
      : null;
  if (!stored || typeof stored !== "object") return { ...DEFAULT_NOTIFICATION_PREFS };
  const s = stored as Partial<Record<keyof NotificationPrefs, unknown>>;
  return {
    enquiries: typeof s.enquiries === "boolean" ? s.enquiries : DEFAULT_NOTIFICATION_PREFS.enquiries,
    listingUpdates:
      typeof s.listingUpdates === "boolean" ? s.listingUpdates : DEFAULT_NOTIFICATION_PREFS.listingUpdates,
    marketing: typeof s.marketing === "boolean" ? s.marketing : DEFAULT_NOTIFICATION_PREFS.marketing
  };
}
