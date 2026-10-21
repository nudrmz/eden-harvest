import "server-only";
import { getStreamServerClient } from "@/lib/stream/server";
import { siteUrl } from "@/lib/site";

/**
 * Points Stream's before-send hook at this app, once per server instance.
 * Only on the production deployment, so a preview build never redirects the
 * live app's hook to itself. Safe to call often: it reads the current setting
 * and only writes when it's different.
 */

let ensured: Promise<void> | null = null;

export function ensureStreamHooks(): Promise<void> {
  if (process.env.VERCEL_ENV !== "production") return Promise.resolve();
  if (ensured) return ensured;

  ensured = (async () => {
    const client = getStreamServerClient();
    const url = `${siteUrl()}/api/webhooks/stream/before-send`;
    const { app } = await client.getAppSettings();
    const current = (app as { before_message_send_hook_url?: string } | undefined)
      ?.before_message_send_hook_url;
    if (current === url) return;

    await client.updateAppSettings({
      before_message_send_hook_url: url,
      // Serverless cold starts can take a moment; Stream's default is 1.5s.
      before_message_send_hook_attempt_timeout_ms: 3000
    } as Parameters<typeof client.updateAppSettings>[0]);
    console.info("Stream before-send hook set to", url);
  })().catch((error) => {
    ensured = null; // try again on the next request
    console.error("Could not set Stream before-send hook:", error);
  });

  return ensured;
}
