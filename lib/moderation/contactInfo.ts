/**
 * Spots contact details in a chat message: phone numbers, email addresses and
 * WhatsApp/Telegram links. Used in the browser (to stop the send and explain
 * why) and on the server (Stream's before-send hook, so it can't be bypassed).
 *
 * Pure and dependency-free so both sides share exactly the same rules.
 *
 * It catches the usual tricks: spaces or dashes between digits, numbers
 * written as words ("zero eight zero…"), the letter O used for zero, and
 * "name at gmail dot com". It deliberately lets through ordinary numbers in a
 * trade conversation: prices, quantities, weights and dates, and a 10-digit
 * bank account number when the message says it's an account number, so
 * buyers and sellers can still arrange payment.
 */

export type ContactKind = "phone" | "email" | "link";

export interface ContactMatch {
  kind: ContactKind;
}

const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  nought: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9"
};

const DIGIT_WORD_RE = new RegExp(`\\b(${Object.keys(DIGIT_WORDS).join("|")})\\b`, "g");

/** Lower-case, plain ASCII digits, spelled-out digits and "O for zero" undone. */
function normalise(text: string): string {
  return (
    text
      // Full-width and other look-alike digits/letters → plain ones.
      .normalize("NFKC")
      .toLowerCase()
      .replace(DIGIT_WORD_RE, (word) => DIGIT_WORDS[word])
      // A stand-alone "o" next to a digit is a zero ("o8o1…", "0 8 o 1").
      .replace(/(?<![a-z])o(?![a-z])/g, (o, offset: number, all: string) => {
        const before = all.slice(Math.max(0, offset - 2), offset);
        const after = all.slice(offset + 1, offset + 3);
        return /\d/.test(before) || /\d/.test(after) ? "0" : o;
      })
  );
}

// Digits joined by up to three spaces, dashes, dots, brackets etc.
// Commas, slashes and colons are left out: those make prices (1,500,000),
// dates (21/10/2026) and times (10:30), not phone numbers.
const DIGIT_RUN_RE = /\+?\(?\d(?:[\s\-.()_*# ]{0,3}\d)+/g;

// "1 500 000"-style thousands grouping, i.e. an amount, not a number to dial.
const THOUSANDS_RE = /^[1-9]\d{0,2}(?: \d{3})+$/;

const ACCOUNT_CONTEXT_RE = /\b(account|acct|acc|a\/c|nuban|bank|iban)\b[^\d]{0,25}$/;

function findPhone(text: string): boolean {
  for (const match of text.matchAll(DIGIT_RUN_RE)) {
    const run = match[0].trim();
    const digits = run.replace(/\D/g, "");
    const international = run.startsWith("+") || digits.startsWith("00");

    if (digits.length < (international ? 7 : 9)) continue;
    if (!international && THOUSANDS_RE.test(run)) continue;

    // A Nigerian bank account number (NUBAN) is exactly 10 digits. Allow it
    // when the message just said it's an account number.
    const before = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index ?? 0);
    if (digits.length === 10 && ACCOUNT_CONTEXT_RE.test(before)) continue;

    return true;
  }
  return false;
}

const EMAIL_RE = /[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(?:\s*\.\s*[a-z0-9-]+)+/;

const TLDS = "com|net|org|ng|uk|io|info|biz|africa|edu|me|app|co\\s*\\.\\s*uk|com\\s*\\.\\s*ng";
// "ada at gmail dot com", "ada (at) yahoo (dot) com", "ada[at]farm.ng"
const SPELLED_EMAIL_RE = new RegExp(
  // A real "." must touch both sides ("gmail.com"), so "I'm at Lagos. Me…" isn't read as an email.
  `[a-z0-9._%+-]+\\s*[([{]?\\s*(?:@|\\bat\\b)\\s*[)\\]}]?\\s*[a-z0-9-]+(?:\\.|\\s*[([{]?\\s*\\bdot\\b\\s*[)\\]}]?\\s*)(?:${TLDS})\\b`
);
// "ada at gmail", "ada @ yahoo" with no domain ending at all.
const PROVIDER_RE =
  /(?:@|\bat\b)\s*(?:gmail|googlemail|yahoo|ymail|hotmail|outlook|live|icloud|aol|protonmail|proton)\b/;

function findEmail(text: string): boolean {
  return EMAIL_RE.test(text) || SPELLED_EMAIL_RE.test(text) || PROVIDER_RE.test(text);
}

const LINK_RE =
  /\b(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|whatsapp\.com\/send|t\.me\/|telegram\.me|telegram\.org|m\.me\/)/;

function findLink(text: string): boolean {
  return LINK_RE.test(text.replace(/\s+/g, ""));
}

/** The first kind of contact detail found in the message, or null. */
export function findContactInfo(text: string | null | undefined): ContactMatch | null {
  if (!text) return null;
  const clean = normalise(text);
  if (findEmail(clean)) return { kind: "email" };
  if (findLink(clean)) return { kind: "link" };
  if (findPhone(clean)) return { kind: "phone" };
  return null;
}

/** What the sender sees when a message is stopped. */
export function contactBlockedNotice(kind: ContactKind): string {
  const what =
    kind === "email"
      ? "Email addresses"
      : kind === "link"
        ? "WhatsApp and Telegram links"
        : "Phone numbers";
  return `${what} can't be shared in messages. Please keep the conversation on Eden Harvest. It keeps everyone safe and gives you a record of what was agreed.`;
}

/** Replaces an edited message that slipped contact details in. */
export const CONTACT_HIDDEN_TEXT =
  "[Message hidden: contact details can't be shared on Eden Harvest]";
