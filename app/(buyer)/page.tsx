import { fetchHomePageData } from "@/lib/data/listings";
import HomePageClient from "./HomePageClient";

export const revalidate = 60;

export default async function BuyerHomePage() {
  const data = await fetchHomePageData();
  return <HomePageClient {...data} />;
}
