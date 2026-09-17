import { StreamChat } from "stream-chat";

/** Browser-side singleton. Only the public API key ever lives here. */
let client: StreamChat | null = null;

export function isStreamConfiguredInBrowser(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STREAM_API_KEY?.trim());
}

export function getStreamClient(): StreamChat | null {
  if (client) return client;

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY?.trim();
  if (!apiKey) return null;

  client = StreamChat.getInstance(apiKey);
  return client;
}
