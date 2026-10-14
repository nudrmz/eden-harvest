"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useStreamChatContext } from "@/lib/stream/hooks";
import { getOtherMemberName, latestMessagePreview } from "@/lib/stream/channel";

interface NotificationBellProps {
  variant?: "hero" | "default";
}

interface UnreadConversation {
  channelId: string;
  name: string;
  preview: string;
  unread: number;
}

const EMPTY_MESSAGE =
  "No new messages. When a buyer or seller messages you, it shows up here.";

const SIGNED_OUT_MESSAGE = "Sign in to see your message notifications.";

/** Events that can change which conversations are unread. */
const UNREAD_EVENTS = [
  "message.new",
  "message.read",
  "notification.message_new",
  "notification.mark_read",
  "notification.mark_unread",
  "channel.deleted",
  "channel.hidden",
  "channel.visible",
  "connection.recovered"
];

export function NotificationBell({ variant = "hero" }: NotificationBellProps) {
  const { theme } = useTheme();
  const { client, connected } = useStreamChatContext();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    const userId = client?.userID;
    if (!client || !userId) return;

    try {
      const channels = await client.queryChannels(
        { type: "messaging", members: { $in: [userId] } },
        { last_message_at: -1 },
        { limit: 30, state: true }
      );

      const unread: UnreadConversation[] = [];
      for (const channel of channels) {
        const count = channel.countUnread();
        if (count < 1 || !channel.id) continue;
        unread.push({
          channelId: channel.id,
          name: getOtherMemberName(channel, userId),
          preview: latestMessagePreview(channel),
          unread: count
        });
      }

      setConversations(unread);
      // The badge is the sum of what the panel lists, so the two always agree.
      // (Using Stream's total_unread_count snapshot from sign-in left a stale
      // "1" on the bell after the message had been read.)
      setUnreadCount(unread.reduce((total, item) => total + item.unread, 0));
    } catch (error) {
      // A failed count should never break the header.
      console.error("unread refresh failed:", error);
    }
  }, [client]);

  useEffect(() => {
    if (!client || !connected) {
      setUnreadCount(0);
      setConversations([]);
      return;
    }

    void refreshUnread();

    // Several events can arrive together (e.g. reading a chat); refresh once.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshUnread(), 300);
    };

    const subscriptions = UNREAD_EVENTS.map((eventType) => client.on(eventType, scheduleRefresh));

    // Coming back to the tab/app (e.g. after reading on another device).
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client, connected, refreshUnread]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const markAllRead = async () => {
    if (!client?.userID) return;
    try {
      await client.markChannelsRead();
      setUnreadCount(0);
      setConversations([]);
    } catch (error) {
      console.error("mark all read failed:", error);
    }
  };

  const buttonClass =
    variant === "hero"
      ? "border-white/20 bg-white/10"
      : "border-[var(--card-border)] bg-[var(--glass-bg)]";

  const iconColor = variant === "hero" ? "#ffffff" : theme === "dark" ? "#ffffff" : "#1A1A18";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          // Always show an up-to-date list when the panel opens.
          if (!open) void refreshUnread();
        }}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border ${buttonClass}`}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell size={18} style={{ color: iconColor }} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-eden-gold px-1 text-[length:calc(9px*var(--fs-small))] font-bold text-[#0f1f0f]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[rgba(10,20,10,0.94)] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </h2>
            {conversations.length > 0 ? (
              <button
                type="button"
                className="text-[length:calc(11px*var(--fs-small))] font-medium text-eden-gold hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {conversations.length === 0 ? (
            <p className="px-4 py-5 text-xs leading-relaxed text-[var(--text-secondary)]">
              {connected ? EMPTY_MESSAGE : SIGNED_OUT_MESSAGE}
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/10 overflow-y-auto">
              {conversations.map((conversation) => (
                <li key={conversation.channelId}>
                  <Link
                    href={`/messages?channel=${conversation.channelId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/5"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-eden-gold" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                        {conversation.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[length:calc(11px*var(--fs-small))] text-[var(--text-secondary)]">
                        {conversation.preview}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-eden-gold px-1.5 text-[length:calc(9px*var(--fs-small))] font-bold leading-4 text-[#0f1f0f]">
                      {conversation.unread}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
