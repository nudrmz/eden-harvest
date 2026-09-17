"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { StreamChat as StreamChatClient } from "stream-chat";
import { getStreamClient, isStreamConfiguredInBrowser } from "@/lib/stream/client";
import { useAuth } from "@/lib/supabase/hooks";

export type StreamChatStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unauthenticated"
  | "unconfigured"
  | "error";

interface StreamChatContextValue {
  client: StreamChatClient | null;
  connected: boolean;
  status: StreamChatStatus;
  error: string | null;
}

const StreamChatContext = createContext<StreamChatContextValue | null>(null);

export function StreamChatProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const client = getStreamClient();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<StreamChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (authLoading) {
      setStatus("idle");
      return;
    }

    if (!isStreamConfiguredInBrowser() || !client) {
      setConnected(false);
      setStatus("unconfigured");
      setError(
        "Chat is not configured. Add NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET in Vercel, then redeploy."
      );
      return;
    }

    if (!isAuthenticated || !user) {
      if (client.userID) {
        void client.disconnectUser();
      }
      setConnected(false);
      setStatus("unauthenticated");
      setError(null);
      return;
    }

    if (client.userID === user.id) {
      setConnected(true);
      setStatus("connected");
      setError(null);
      return;
    }

    if (connectingRef.current) return;

    connectingRef.current = true;
    setStatus("connecting");
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/stream-token");
        const payload = (await response.json().catch(() => ({}))) as {
          token?: string;
          error?: string;
        };

        if (!response.ok || !payload.token) {
          throw new Error(payload.error ?? "Could not get chat token.");
        }

        await client.connectUser(
          { id: user.id, name: user.full_name ?? user.email },
          payload.token
        );
        setConnected(true);
        setStatus("connected");
        setError(null);
      } catch (err) {
        console.error("Stream connectUser failed:", err);
        setConnected(false);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to chat. Check Stream API keys on Vercel."
        );
      } finally {
        connectingRef.current = false;
      }
    })();
  }, [authLoading, isAuthenticated, user, client]);

  return (
    <StreamChatContext.Provider value={{ client, connected, status, error }}>
      {children}
    </StreamChatContext.Provider>
  );
}

export function useStreamChatContext(): StreamChatContextValue {
  const context = useContext(StreamChatContext);
  if (!context) {
    throw new Error("useStreamChatContext must be used within StreamChatProvider");
  }
  return context;
}
