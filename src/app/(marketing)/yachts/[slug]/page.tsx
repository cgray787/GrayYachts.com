import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { campaignYachts } from "@/lib/campaign-yachts";
import CampaignYachtPage from "@/components/marketing/campaign-yacht-page";

export function generateStaticParams() { return campaignYachts.map(y => ({slug:y.slug})); }
export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
 const {slug} = await params;
 const yacht = campaignYachts.find(y => y.slug === slug);
 if (!yacht) return {};
 const title = yacht.name + " | Explore Yacht Ownership | Gray Yachts";
 const url = "https://grayyachts.com/yachts/" + slug;
 return { title, description:yacht.description, alternates:{canonical:url},
  openGraph:{title,description:yacht.description,url,type:"website",images:[{url:"https://grayyachts.com"+yacht.photos[0].src,alt:yacht.photos[0].alt}]},
  twitter:{card:"summary_large_image",title,description:yacht.description,images:["https://grayyachts.com"+yacht.photos[0].src]}
 };
}
export default async function Page({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const yacht=campaignYachts.find(y=>y.slug===slug);
 if(!yacht) notFound();
 return <CampaignYachtPage yacht={yacht}/>;
}

