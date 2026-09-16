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
import { getStreamClient } from "@/lib/stream/client";
import { useAuth } from "@/lib/supabase/hooks";

interface StreamChatContextValue {
  client: StreamChatClient;
  connected: boolean;
}

const StreamChatContext = createContext<StreamChatContextValue | null>(null);

export function StreamChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const client = getStreamClient();
  const [connected, setConnected] = useState(false);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (client.userID) {
        void client.disconnectUser();
      }
      setConnected(false);
      return;
    }

    if (connectingRef.current || client.userID === user.id) {
      return;
    }

    connectingRef.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/stream-token");
        if (!response.ok) throw new Error("Could not get chat token.");
        const { token } = (await response.json()) as { token: string };

        await client.connectUser(
          { id: user.id, name: user.full_name ?? user.email },
          token
        );
        setConnected(true);
      } catch (error) {
        console.error("Stream connectUser failed:", error);
        setConnected(false);
      } finally {
        connectingRef.current = false;
      }
    })();
  }, [isAuthenticated, user, client]);

  return (
    <StreamChatContext.Provider value={{ client, connected }}>
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
