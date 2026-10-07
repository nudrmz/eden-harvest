/**
 * Shared rules for farm and produce photos.
 *
 * Uploads go through /api/uploads/photo (service-role key) rather than straight
 * from the browser to Supabase Storage, so no storage.objects RLS policies are
 * needed — the route checks the signed-in user and writes only under their own
 * folder. The bucket is public-read so <img> tags can load photos directly.
 */

export const PHOTO_BUCKET = "produce-photos";

export type PhotoKind = "farm" | "listing";

/** Vercel rejects function request bodies over ~4.5 MB, so stay under that. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Phone photos are often 5–10 MB; shrink to this long edge before upload. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Public URL prefix every photo in the bucket starts with, for a given user. */
export function photoUrlPrefixFor(userId: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${userId}/`;
}

export function isOwnPhotoUrl(url: string, userId: string): boolean {
  return url.startsWith(photoUrlPrefixFor(userId));
}

/**
 * Downscale and re-encode as JPEG in the browser. Falls back to the original
 * file if the browser can't decode it (e.g. some HEIC files) and it's already
 * an allowed type under the size cap.
 */
export async function preparePhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("encode failed");

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Upload a photo for the signed-in user; returns its public URL. */
export async function uploadPhoto(
  file: File,
  kind: PhotoKind
): Promise<{ url: string | null; error: string | null }> {
  const prepared = await preparePhoto(file);

  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(prepared.type)) {
    return { url: null, error: "Please choose a JPG, PNG or WebP photo." };
  }
  if (prepared.size > MAX_UPLOAD_BYTES) {
    return { url: null, error: "That photo is too large. Please choose one under 4 MB." };
  }

  const body = new FormData();
  body.append("file", prepared);
  body.append("kind", kind);

  let response: Response;
  try {
    response = await fetch("/api/uploads/photo", { method: "POST", body });
  } catch {
    return { url: null, error: "Network error while uploading your photo." };
  }

  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.url) {
    return { url: null, error: payload?.error ?? "Could not upload your photo." };
  }
  return { url: payload.url, error: null };
}
