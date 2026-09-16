import { StreamChat } from "stream-chat";

/** Browser-side singleton. Only the public API key ever lives here. */
let client: StreamChat | null = null;

export function getStreamClient(): StreamChat {
  if (client) return client;

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_STREAM_API_KEY is not set.");
  }

  client = StreamChat.getInstance(apiKey);
  return client;
}
