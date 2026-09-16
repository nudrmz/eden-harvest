"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Chat,
  Channel,
  ChannelList,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread
} from "stream-chat-react";
import { useAuth } from "@/lib/supabase/hooks";
import { useStreamChatContext } from "@/lib/stream/hooks";
import "stream-chat-react/dist/css/v2/index.css";

/**
 * Single page for both the conversation list and an open thread — Stream's
 * React SDK tracks the "active channel" in Chat context, so ChannelList and
 * Channel stay in sync without any routing of our own. Deep-link a specific
 * conversation with /messages?channel=<id> (used by the "Message on Eden
 * Harvest" buttons on listing/seller pages).
 */
function MessagesPageContent() {
  const searchParams = useSearchParams();
  const preselectedChannelId = searchParams.get("channel") ?? undefined;
  const { user, loading: authLoading } = useAuth();
  const { client, connected } = useStreamChatContext();

  if (authLoading || !connected || !user) {
    return (
      <main className="app-shell mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <p className="text-sm text-white/50">Loading messages…</p>
      </main>
    );
  }

  const filters = { members: { $in: [user.id] }, type: "messaging" };
  const sort = { last_message_at: -1 as const };

  return (
    <main className="app-shell mx-auto flex h-screen w-full max-w-md flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Link href="/" aria-label="Back" className="text-white/70">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold">Messages</h1>
      </div>

      <div className="str-chat min-h-0 flex-1" data-theme="dark">
        <Chat client={client} theme="str-chat__theme-dark">
          <ChannelList
            filters={filters}
            sort={sort}
            customActiveChannel={preselectedChannelId}
            EmptyStateIndicator={() => (
              <p className="px-4 py-8 text-center text-sm text-white/50">
                No conversations yet. Message a seller from a listing to start one.
              </p>
            )}
          />
          <Channel>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
          <p className="text-sm text-white/50">Loading messages…</p>
        </main>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
