"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import type { Channel as StreamChannel } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelList,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  useChannelStateContext,
  useChatContext
} from "stream-chat-react";
import { useAuth } from "@/lib/supabase/hooks";
import { useStreamChatContext } from "@/lib/stream/hooks";
import "stream-chat-react/dist/css/v2/index.css";

function getOtherMemberName(channel: StreamChannel, currentUserId: string): string {
  const customName =
    typeof channel.data?.seller_farm_name === "string"
      ? channel.data.seller_farm_name
      : typeof channel.data?.name === "string"
        ? channel.data.name
        : null;

  const members = Object.values(channel.state.members ?? {});
  const other = members.find(
    (member) => member.user?.id && member.user.id !== currentUserId
  );

  return other?.user?.name?.trim() || customName?.trim() || "this seller";
}

function ChannelMessageEmptyState() {
  const { channel } = useChannelStateContext("ChannelMessageEmptyState");
  const { client } = useChatContext("ChannelMessageEmptyState");
  const name = getOtherMemberName(channel, client.userID ?? "");

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-base font-medium text-white/85">Say hello to {name}</p>
      <p className="mt-2 max-w-xs text-sm text-white/50">
        Send a message to start the conversation about their produce.
      </p>
    </div>
  );
}

function MessagesShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-md flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Link href="/" aria-label="Back" className="text-white/70">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold text-white">Messages</h1>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        {children}
      </div>
    </main>
  );
}

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
  const { client, connected, status, error } = useStreamChatContext();

  if (authLoading || status === "idle" || status === "connecting") {
    return (
      <MessagesShell>
        <p className="text-sm text-white/50">Loading messages…</p>
      </MessagesShell>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <MessagesShell>
        <div className="space-y-4">
          <p className="text-sm text-white/70">Sign in to view your messages.</p>
          <Link
            href="/login?redirect=/messages"
            className="inline-flex rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Log in
          </Link>
        </div>
      </MessagesShell>
    );
  }

  if (status === "unconfigured" || status === "error" || !client || !connected) {
    return (
      <MessagesShell>
        <div className="space-y-3">
          <p className="text-sm text-[#F09595]">
            {error ?? "Chat is unavailable right now."}
          </p>
          <p className="text-xs text-white/45">
            In Vercel, add <code className="text-white/70">NEXT_PUBLIC_STREAM_API_KEY</code>{" "}
            and <code className="text-white/70">STREAM_API_SECRET</code>, then redeploy.
          </p>
        </div>
      </MessagesShell>
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
        <h1 className="text-lg font-semibold text-white">Messages</h1>
      </div>

      <div className="str-chat min-h-0 flex-1" data-theme="dark">
        <Chat client={client} theme="str-chat__theme-dark">
          <ChannelList
            filters={filters}
            sort={sort}
            customActiveChannel={preselectedChannelId}
            getLatestMessagePreview={(channel) => {
              const latest =
                channel.state.latestMessages?.[channel.state.latestMessages.length - 1] ??
                channel.state.messages?.[channel.state.messages.length - 1];

              if (!latest || latest.deleted_at) {
                return `Say hello to ${getOtherMemberName(channel, user.id)}`;
              }

              const text = latest.text?.trim();
              return text || "Attachment";
            }}
            EmptyStateIndicator={() => (
              <p className="px-4 py-8 text-center text-sm text-white/50">
                No conversations yet. Message a seller from a listing to start one.
              </p>
            )}
          />
          <Channel EmptyStateIndicator={ChannelMessageEmptyState}>
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
        <MessagesShell>
          <p className="text-sm text-white/50">Loading messages…</p>
        </MessagesShell>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
