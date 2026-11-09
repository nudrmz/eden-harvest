/**
 * Listing rotation. Listings are shown in a shuffled order that changes every
 * ROTATE_HOURS, so the home page and Browse don't always lead with the newest
 * uploads. Within one period the order is fixed, which keeps "load more" pages
 * consistent. Farms are interleaved so one seller with many listings doesn't
 * fill the top of the page.
 */
export const ROTATE_HOURS = 6;

function hash(text: string): number {
  // FNV-1a, 32-bit: small, fast and stable across servers.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rotationSeed(now = Date.now()): number {
  return Math.floor(now / (ROTATE_HOURS * 60 * 60 * 1000));
}

export function rotateListings<T extends { id: string; sellerId?: string }>(items: T[], seed = rotationSeed()): T[] {
  const bySeller = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => hash(`${a.id}:${seed}`) - hash(`${b.id}:${seed}`))) {
    const key = item.sellerId ?? item.id;
    const list = bySeller.get(key) ?? [];
    list.push(item);
    bySeller.set(key, list);
  }
  const groups = [...bySeller.entries()]
    .sort(([a], [b]) => hash(`${a}:${seed}`) - hash(`${b}:${seed}`))
    .map(([, list]) => list);
  const out: T[] = [];
  for (let round = 0; out.length < items.length; round += 1) {
    for (const group of groups) if (group[round]) out.push(group[round]);
  }
  return out;
}
