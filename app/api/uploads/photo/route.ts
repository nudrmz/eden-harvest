import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_UPLOAD_BYTES,
  PHOTO_BUCKET,
  type PhotoKind
} from "@/lib/storage/photos";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

let bucketReady = false;

/**
 * Create the public bucket on first use. Done here with the service-role key
 * because it goes through the Storage API, not the SQL editor, so it doesn't
 * depend on SQL privileges on the Supabase account.
 */
async function ensureBucket(admin: SupabaseClient): Promise<string | null> {
  if (bucketReady) return null;

  const { data } = await admin.storage.getBucket(PHOTO_BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES,
      allowedMimeTypes: [...ALLOWED_PHOTO_TYPES]
    });
    // A concurrent request may have created it first.
    if (error && !/already exists/i.test(error.message)) return error.message;
  }

  bucketReady = true;
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind") as PhotoKind | null;

  if (!(file instanceof File) || (kind !== "farm" && kind !== "listing")) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Please choose a JPG, PNG or WebP photo." },
      { status: 415 }
    );
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That photo is too large. Please choose one under 4 MB." },
      { status: 413 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("photo upload: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json(
      { error: "Server is not configured for photo uploads." },
      { status: 500 }
    );
  }

  const bucketError = await ensureBucket(admin);
  if (bucketError) {
    console.error("photo upload: bucket setup failed:", bucketError);
    return NextResponse.json({ error: "Photo storage is unavailable." }, { status: 500 });
  }

  // The user id prefix is what the profile/listing writes check against, so a
  // user can only ever attach photos from their own folder.
  const path = `${user.id}/${kind}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

  if (uploadError) {
    console.error("photo upload:", uploadError.message);
    return NextResponse.json({ error: "Could not upload your photo." }, { status: 500 });
  }

  const {
    data: { publicUrl }
  } = admin.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
