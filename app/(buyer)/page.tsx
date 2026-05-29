import { fetchHomePageData } from "@/lib/data/listings";
import HomePageClient from "./HomePageClient";

export default async function BuyerHomePage() {
  const data = await fetchHomePageData();
  return <HomePageClient {...data} />;
}
