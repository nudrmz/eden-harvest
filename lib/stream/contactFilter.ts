"use client";

import type { StreamChat } from "stream-chat";
import { findContactInfo, type ContactKind } from "@/lib/moderation/contactInfo";

/**
 * Stops a message containing a phone number, email address or WhatsApp link
 * before it leaves the browser, for both new messages and edits, and tells
 * the sender why. The text stays in the box so they can remove the details.
 *
 * Stream's before-send hook (app/api/webhooks/stream/before-send) applies the
 * same rules on the server, so this is the friendly layer, not the only one.
 */

type Listener = (kind: ContactKind) => void;
const listeners = new Set<Listener>();

export function onContactBlocked(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const MIDDLEWARE_ID = "eden-harvest/no-contact-details";

export function installContactFilter(client: StreamChat): void {
  client.setMessageComposerSetupFunction(({ composer }) => {
    composer.compositionMiddlewareExecutor.insert({
      middleware: [
        {
          id: MIDDLEWARE_ID,
          handlers: {
            compose: async ({ state, next, discard }) => {
              const found = findContactInfo(state.message.text);
              if (found) {
                listeners.forEach((listener) => listener(found.kind));
                return discard();
              }
              return next(state);
            }
          }
        }
      ],
      position: { before: "stream-io/message-composer-middleware/data-validation" },
      unique: true
    });
  });
}
