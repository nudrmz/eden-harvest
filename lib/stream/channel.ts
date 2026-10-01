import type { Channel as StreamChannel } from "stream-chat";

/**
 * Display name for a 1:1 enquiry thread. Prefers the other member's Stream
 * user name, falling back to the seller_farm_name we set on the channel when
 * the conversation was created (members aren't always hydrated in list views).
 */
export function getOtherMemberName(channel: StreamChannel, currentUserId: string): string {
  const data = channel.data as Record<string, unknown> | undefined;
  const customName =
    typeof data?.seller_farm_name === "string"
      ? data.seller_farm_name
      : typeof data?.name === "string"
        ? data.name
        : null;

  const members = Object.values(channel.state.members ?? {});
  const other = members.find(
    (member) => member.user?.id && member.user.id !== currentUserId
  );

  return other?.user?.name?.trim() || customName?.trim() || "this seller";
}

/** Last message text for list previews, with a fallback for attachment-only messages. */
export function latestMessagePreview(channel: StreamChannel): string {
  const messages = channel.state.latestMessages;
  const latest = messages?.[messages.length - 1];
  if (!latest) return "No messages yet";
  return latest.text?.trim() || "Sent an attachment";
}
