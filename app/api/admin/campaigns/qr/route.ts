import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/admin";
import { CAMPAIGN_LINKS } from "@/lib/campaigns";
import { campaignQrSvg } from "@/lib/campaigns/qr";
import { siteUrl } from "@/lib/site";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const link = CAMPAIGN_LINKS.find((l) => l.slug === slug);
  if (!link) return NextResponse.json({ error: "Unknown link." }, { status: 404 });

  const svg = await campaignQrSvg(`${siteUrl()}/${link.slug}`);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=3600",
      ...(request.nextUrl.searchParams.get("download")
        ? { "Content-Disposition": `attachment; filename="eden-harvest-qr-${link.slug}.svg"` }
        : {})
    }
  });
}
