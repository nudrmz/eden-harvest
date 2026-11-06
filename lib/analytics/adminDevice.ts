/**
 * Marks this browser as an admin's device so its visits aren't counted in
 * Web Analytics (see components/layout/SiteAnalytics). The mark stays after
 * signing out, so browsing the site logged-out on the same phone doesn't
 * count either.
 */
export const ADMIN_DEVICE_KEY = "eh-admin-device";

export function markAdminDevice(): void {
  try {
    window.localStorage.setItem(ADMIN_DEVICE_KEY, "1");
  } catch {
    // Private mode or blocked storage: nothing to do.
  }
}

export function isAdminDevice(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}
