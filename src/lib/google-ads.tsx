import Script from "next/script";

// Google Ads account tag (supplied by Connor, 2026-10-11). This loads gtag only; recording a
// lead also needs a conversion action (an AW-.../label send_to) fired on the valuation form.
export const GOOGLE_ADS_ID = "AW-18507545875";
// "Website phone tap" conversion (Phone call lead goal, Primary, count One, $1),
// created 2026-10-17. Fired when a visitor taps any tel: link on a Next.js page.
export const PHONE_TAP_SEND_TO = "AW-18507545875/2xJRCJOLpKAdEJP6ivlE";

export function GoogleAdsTag() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
// One delegated listener covers every tel: link, including ones rendered later.
// Reported once per page load; analytics errors never block the call itself.
(function(){
  var reported = false;
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if(!a || reported) return;
    try { gtag('event', 'conversion', {send_to: '${PHONE_TAP_SEND_TO}', value: 1.0, currency: 'USD'}); reported = true; } catch(err) {}
  }, true);
})();`}
      </Script>
    </>
  );
}
