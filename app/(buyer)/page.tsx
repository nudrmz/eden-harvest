import { redirect } from "next/navigation";
import { fetchHomePageData } from "@/lib/data/listings";
import HomePageClient from "./HomePageClient";

export const revalidate = 60;

interface BuyerHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function BuyerHomePage({ searchParams = {} }: BuyerHomePageProps) {
  const code = typeof searchParams.code === "string" ? searchParams.code : null;
  if (code) {
    const type = typeof searchParams.type === "string" ? searchParams.type : "";
    const next = type === "recovery" ? "/reset-password" : "/login";
    const params = new URLSearchParams({ code, next });
    if (type) params.set("type", type);
    redirect(`/auth/callback?${params.toString()}`);
  }

  const data = await fetchHomePageData();
  return <HomePageClient {...data} />;
}
