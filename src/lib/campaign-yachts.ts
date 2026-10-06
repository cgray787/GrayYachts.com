export type CampaignYacht = {
 estimatedPrice: string; slug: string; name: string; year: string; location: string; title: string;
 intro: string; story: string; description: string; source: string;
 specs: { label: string; value: string }[];
 features: { title: string; text: string }[];
 video: { provider: "vimeo" | "youtube"; id: string; source: string };
 photos: { src: string; alt: string; caption: string }[];
};
export const campaignYachts: CampaignYacht[] = [
 {
  video: {provider:"vimeo",id:"1229950847",source:"https://vimeo.com/1229950847"},
  estimatedPrice: "$3.3–$3.8 million",
  slug: "pershing-6x", name: "Pershing 6X", year: "2027", location: "Fort Lauderdale, Florida",
  title: "Life’s too short.\nBuy the yacht.",
  intro: "Italian design. Open water. A very different kind of weekend.",
  story: "Make the journey the occasion.",
  description: "Explore the Pershing 6X with Connor Gray: performance, ownership considerations, current pricing and a personal discovery call.",
  source: "https://jeffbrownyachts.com/inventory/boat/2027-pershing-6x-10332235",
  specs: [{label:"Length overall",value:"62.2 ft"},{label:"Advertised top speed",value:"48 knots"},{label:"Beam",value:"15.8 ft"},{label:"Budget estimate · USD",value:"$3.3–$3.8M"}],
  features: [
   {title:"Performance with presence",text:"Twin MAN V12 engines and a low, sculpted profile make the 6X a distinctive choice for coastal escapes."},
   {title:"Room to slow down",text:"A full-beam master suite and an inviting salon give you a comfortable place to return after a day on the water."},
   {title:"Closer to the water",text:"The hydraulic swim platform makes the transition from cockpit to sea part of the experience."}
  ],
  photos: [
   {src:"/images/campaign-yachts/pershing-6x-1.jpg",alt:"Pershing 6X sistership cruising at sea",caption:"Italian performance, out on the open water."},
   {src:"/images/campaign-yachts/pershing-6x-running.jpg",alt:"Pershing 6X sistership underway, viewed from the bow",caption:"Underway"},
   {src:"/images/campaign-yachts/pershing-6x-2.jpg",alt:"Pershing 6X sistership salon and helm",caption:"A salon with the sea in every direction."},
   {src:"/images/campaign-yachts/pershing-6x-3.jpg",alt:"Pershing 6X sistership lower-deck interior",caption:"A quieter side of life aboard."}
  ]
 },
 {
  video: {provider:"youtube",id:"MQmlljWDDHk",source:"https://www.youtube.com/watch?v=MQmlljWDDHk"},
  estimatedPrice: "$1.9–$2.3 million",
  slug:"sirena-48",name:"Sirena 48",year:"2027",location:"San Diego, California",
  title:"More weekends.\nLess someday.",
  intro:"Bring your favorite people. Leave the everyday behind.",
  story:"Stay a little longer.",
  description:"Discover the Sirena 48 with Connor Gray: three guest cabins, flybridge living, ownership guidance and a personal discovery call.",
  source:"https://jeffbrownyachts.com/inventory/boat/2027-sirena-48-48-46",
  specs:[{label:"Length overall",value:"52.76 ft"},{label:"Guest cabins",value:"3"},{label:"Guest heads",value:"2"},{label:"Budget estimate · USD",value:"$1.9–$2.3M"}],
  features:[
   {title:"Space for your people",text:"Three guest cabins create room for family and friends to turn a day on the water into a longer escape."},
   {title:"Life on the flybridge",text:"An elevated outdoor gathering space brings lunch, conversation and coastal views together."},
   {title:"Cruise your way",text:"Explore coastal stops or settle into a gentler pace. Start with the journeys you want to take, then plan ownership around them."}
  ],
  photos:[
   {src:"/images/campaign-yachts/sirena-48-aerial.jpg",alt:"Sirena 48 sistership on the water",caption:"A new perspective on your next weekend."},
   {src:"/images/campaign-yachts/sirena-48-1.jpg",alt:"Sirena 48 sistership cruising",caption:"On the water"},
   {src:"/images/campaign-yachts/sirena-48-3.jpg",alt:"Sirena 48 sistership covered flybridge dining area",caption:"A table with a view worth sharing."},
   {src:"/images/campaign-yachts/sirena-48-cabin.jpg",alt:"Sirena 48 sistership guest cabin",caption:"Thoughtful details, from deck to deck."}
  ]
 }
];
export function discoveryEmail(yacht: string) {
 const subject = encodeURIComponent("15-minute yacht discovery call — " + yacht);
 const body = encodeURIComponent("Hi Connor,\n\nI’d like to explore the " + yacht + ".\n\nMy preferred day/time and time zone:\nMy phone number:\nHow I’d like to use the yacht:\nPurchase timeline:\n\nThank you!");
 return "mailto:grayyachts@gmail.com?subject=" + subject + "&body=" + body;
}

