import { NextResponse } from "next/server";
import { Client } from "pg";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/admin";
import { SCHEMA_SQL, SCHEMA_VERSION } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function connectionString(): string | null {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const url = connectionString();
  if (!url) throw new Error("No direct database connection is configured (POSTGRES_URL).");
  // Supabase requires TLS; its certificate chain isn't in Node's default store.
  const db = new Client({
    connectionString: url.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
  });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end().catch(() => undefined);
  }
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user && isAdminUser(user) ? user : null;
}

/** Admin-only: is the database up to date? */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  if (!connectionString()) {
    return NextResponse.json({ configured: false, applied: false, version: SCHEMA_VERSION });
  }
  try {
    const applied = await withDb(async (db) => {
      const t = await db.query("select to_regclass('public.app_schema_versions') as t");
      if (!t.rows[0]?.t) return false;
      const r = await db.query("select 1 from app_schema_versions where version = $1", [SCHEMA_VERSION]);
      return r.rowCount === 1;
    });
    return NextResponse.json({ configured: true, applied, version: SCHEMA_VERSION });
  } catch (error) {
    return NextResponse.json(
      { configured: true, applied: false, version: SCHEMA_VERSION, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/** Admin-only: apply the schema (safe to run more than once). */
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    await withDb(async (db) => {
      await db.query("begin");
      try {
        await db.query(SCHEMA_SQL);
        await db.query("commit");
      } catch (error) {
        await db.query("rollback");
        throw error;
      }
    });
    return NextResponse.json({ ok: true, version: SCHEMA_VERSION });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
