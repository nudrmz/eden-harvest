"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert, X } from "lucide-react";
import {
  Chat,
  Channel,
  ChannelList,
  Window,
  MessageList,
  MessageInput,
  Thread,
  useChannelStateContext,
  useChatContext
} from "stream-chat-react";
import { useAuth } from "@/lib/supabase/hooks";
import { Lock } from "lucide-react";
import { useStreamChatContext } from "@/lib/stream/hooks";
import { getOtherMemberName } from "@/lib/stream/channel";
import { installContactFilter, onContactBlocked } from "@/lib/stream/contactFilter";
import { contactBlockedNotice } from "@/lib/moderation/contactInfo";
import "stream-chat-react/dist/css/v2/index.css";
import "./messages.css";

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

/** Shown above the message box when a message with contact details is stopped. */
function ContactBlockedNotice() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onContactBlocked((kind) => {
      setText(contactBlockedNotice(kind));
      clearTimeout(timer);
      timer = setTimeout(() => setText(null), 9000);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!text) return null;

  return (
    <div
      role="alert"
      className="mx-3 mb-2 flex items-start gap-2 rounded-xl border border-[#F5C44266] bg-[#F5C4421a] px-3 py-2.5 text-sm text-[#F5D98A]"
    >
      <ShieldAlert size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{text}</p>
      <button type="button" onClick={() => setText(null)} aria-label="Dismiss" className="shrink-0 opacity-70">
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * The buyer's side of a conversation once their trial or subscription has
 * ended: they can read everything but need Verified Access to reply. Sellers
 * always keep the normal message box. (Stream's before-send hook enforces
 * the same rule on the server.)
 */
function ComposerOrUpgrade() {
  const { channel } = useChannelStateContext("ComposerOrUpgrade");
  const { client } = useChatContext("ComposerOrUpgrade");
  const { access, isSeller, isVerifiedAccess } = useAuth();
  const startedBy = (channel.data as { created_by?: { id?: string } } | undefined)?.created_by?.id;
  const iAmBuyer = Boolean(startedBy && startedBy === client.userID);
  const locked = iAmBuyer && !isSeller && access !== null && !isVerifiedAccess;

  if (!locked) return <MessageInput />;

  const name = getOtherMemberName(channel, client.userID ?? "");
  return (
    <div className="border-t border-white/10 px-4 py-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
        <Lock size={15} className="text-eden-gold" />
        {access?.trialEndsAt ? "Your free trial has ended" : "Verified Access needed to reply"}
      </p>
      <p className="mt-1 text-xs text-white/60">
        Subscribe to keep messaging {name} and other sellers. Your conversations are all still here.
      </p>
      <Link
        href="/upgrade"
        className="mt-3 inline-flex rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Subscribe to Verified Access
      </Link>
    </div>
  );
}

/** Replaces Stream's header (whose hamburger menu does nothing in our layout). */
function ConversationHeader() {
  const { channel } = useChannelStateContext("ConversationHeader");
  const { client, setActiveChannel } = useChatContext("ConversationHeader");
  const name = getOtherMemberName(channel, client.userID ?? "");

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setActiveChannel(undefined)}
        aria-label="Back to conversations"
        className="text-white/70"
      >
        <ArrowLeft size={20} />
      </button>
      <p className="truncate text-base font-semibold text-white">{name}</p>
    </div>
  );
}

/**
 * Phone-style layout: the conversation list OR one open conversation fills the
 * screen, never both stacked. Stacking them (each 100% tall) made the page
 * itself scroll behind the inner lists, which is what made scrolling stick.
 * The list stays mounted while a chat is open so it keeps its scroll position.
 */
function MessagesPanes({ userId, preselectedChannelId }: { userId: string; preselectedChannelId?: string }) {
  const { channel: activeChannel } = useChatContext("MessagesPanes");
  const filters = { members: { $in: [userId] }, type: "messaging" };
  const sort = { last_message_at: -1 as const };

  return (
    <>
      <div className={`eh-chat-pane ${activeChannel ? "hidden" : "flex"}`}>
        <ChannelList
          filters={filters}
          sort={sort}
          customActiveChannel={preselectedChannelId}
          // Don't auto-open the newest chat on phones; show the list first.
          setActiveChannelOnMount={Boolean(preselectedChannelId)}
          getLatestMessagePreview={(channel) => {
            const latest =
              channel.state.latestMessages?.[channel.state.latestMessages.length - 1] ??
              channel.state.messages?.[channel.state.messages.length - 1];

            if (!latest || latest.deleted_at) {
              return `Say hello to ${getOtherMemberName(channel, userId)}`;
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
      </div>
      {activeChannel ? (
        <div className="eh-chat-pane flex">
          <Channel EmptyStateIndicator={ChannelMessageEmptyState}>
            <Window>
              <ConversationHeader />
              <MessageList />
              <ContactBlockedNotice />
              <ComposerOrUpgrade />
            </Window>
            <Thread />
          </Channel>
        </div>
      ) : null}
    </>
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

  useEffect(() => {
    if (client) installContactFilter(client);
  }, [client]);

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

  return (
    <main className="app-shell eh-chat-page">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4">
        <Link href="/" aria-label="Back" className="text-white/70">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold text-white">Messages</h1>
      </div>

      <div className="str-chat relative min-h-0 flex-1" data-theme="dark">
        <Chat client={client} theme="str-chat__theme-dark">
          <MessagesPanes userId={user.id} preselectedChannelId={preselectedChannelId} />
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
