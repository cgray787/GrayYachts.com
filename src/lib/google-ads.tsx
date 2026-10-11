import Script from "next/script";

// Google Ads account tag (supplied by Connor, 2026-10-11). This loads gtag only; recording a
// lead also needs a conversion action (an AW-.../label send_to) fired on the valuation form.
export const GOOGLE_ADS_ID = "AW-18507545875";

export function GoogleAdsTag() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}
