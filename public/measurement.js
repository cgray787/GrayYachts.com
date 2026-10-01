/* Shared public-site measurement. No personal form values enter analytics. */
(function () {
  'use strict';
  if (window.GYMeasurement) return;
  var consentKey = 'gy_measurement_consent_v1', attrKey = 'gy_attribution_v1';
  var ttl = 30 * 86400000, config = null, loaded = false, queue = [], lastPage = '';
  var consent = read(consentKey), attribution = null, sent = new Set();
  var campaignKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'];
  var clickKeys = ['oppref','gclid','fbclid','ad_id','adset_id','campaign_id','placement'];
  var events = ['page_view','questionnaire_start','questionnaire_step_view','questionnaire_step_complete',
    'questionnaire_contact_view','form_validation_error','inquiry_submit','inquiry_submit_error','generate_lead',
    'contact_click','outbound_click','internal_click'];
  function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }
  function write(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch (_) {} }
  function allowed() {
    return !/^\/(portal|login|auth|api|marine-tech|newsletter\/review)(\/|$)/.test(location.pathname);
  }
  function granted() { return consent && consent.value === 'granted' && Date.now()-consent.at < ttl && navigator.globalPrivacyControl !== true; }
  function clean(v) { return typeof v === 'string' && /^[a-zA-Z0-9_ .~:/+-]{1,150}$/.test(v) ? v : ''; }
  function touch() {
    var q = new URLSearchParams(location.search), t = { landing_page: location.origin+location.pathname, at: new Date().toISOString(), referrer: '' };
    try { t.referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch (_) {}
    campaignKeys.forEach(function(k) { t[k] = clean(q.get(k)); });
    clickKeys.forEach(function(k) { t[k] = (q.get(k)||'').slice(0,1024); });
    return t;
  }
  function capture() {
    var fresh = touch(), saved = granted() ? read(attrKey) : attribution;
    var external = fresh.referrer && !/^https:\/\/(www\.)?grayyachts\.com$/.test(fresh.referrer);
    var tagged = campaignKeys.concat(clickKeys).some(function(k) { return !!fresh[k]; });
    if (!saved || Date.now()-saved.createdAt >= ttl) saved = { createdAt: Date.now(), first: fresh, last: fresh };
    else if (tagged || external && lastPage === '') saved.last = fresh;
    attribution = saved;
    if (granted()) write(attrKey,saved);
  }
  function context() { capture(); return Object.assign({}, attribution.last, {first_touch: attribution.first, last_touch: attribution.last, analytics_consent: !!granted()}); }
  function pageURL() {
    var u = new URL(location.origin+location.pathname), q = new URLSearchParams(location.search);
    campaignKeys.forEach(function(k) { var v=clean(q.get(k)); if(v) u.searchParams.set(k,v); });
    return u.href;
  }
  function event(name, params) {
    if (!allowed() || !granted() || events.indexOf(name)<0) return;
    var safe = {page_location: pageURL(), page_referrer: touch().referrer, page_title: 'Gray Yachts', form_id: 'seller_valuation'};
    ['step_name','step_number','error_type','link_type','link_domain','link_path','lead_id'].forEach(function(k) {
      var v=(params||{})[k]; if (typeof v === 'number' || clean(v)) safe[k]=v;
    });
    if (name==='generate_lead') {
      if (!safe.lead_id || sent.has(safe.lead_id)) return;
      sent.add(safe.lead_id);
    }
    if (!loaded) { if(queue.length<50) queue.push([name,safe]); return; }
    window.gtag('event',name,safe);
  }
  function page() {
    if(config && config.ga4MeasurementId) window['ga-disable-'+config.ga4MeasurementId] = !allowed() || !granted();
    if (!allowed()) { lastPage=''; return; }
    var path = location.pathname+location.search;
    if (path===lastPage) return;
    capture(); lastPage=path;
    if(loaded) window.gtag('set',{page_location:pageURL(),page_referrer:touch().referrer,page_title:'Gray Yachts'});
    event('page_view');
  }
  function start() {
    if (!allowed() || !granted() || loaded || !config || !/^G-[A-Z0-9]+$/.test(config.ga4MeasurementId||'')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('js',new Date());
    window.gtag('config',config.ga4MeasurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
      page_location:pageURL(),page_referrer:touch().referrer,page_title:'Gray Yachts'});
    var script=document.createElement('script'); script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.ga4MeasurementId);
    document.head.appendChild(script); loaded=true;
    queue.splice(0).forEach(function(e){window.gtag('event',e[0],e[1]);});
  }
  function choose(value) {
    consent={value:value,at:Date.now()};
    if(config && config.ga4MeasurementId) window['ga-disable-'+config.ga4MeasurementId] = !granted(); write(consentKey,consent);
    var box=document.getElementById('gy-measurement-choice'); if(box) box.remove();
    if(granted()) { capture(); start(); lastPage=''; page(); }
    else {
      queue=[]; attribution=null;
      try { localStorage.removeItem(attrKey); } catch (_) {}
      if(window.gtag) window.gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    }
  }
  function preferences() {
    if(document.getElementById('gy-measurement-choice')) return;
    var box=document.createElement('section'); box.id='gy-measurement-choice'; box.setAttribute('aria-label','Analytics preferences');
    box.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;max-width:540px;z-index:1000;background:#111827;color:#f1f5f9;padding:16px;border:1px solid #C9A96E;border-radius:8px;font:14px/1.5 system-ui;box-shadow:0 4px 24px #0006';
    box.innerHTML='<p style="margin:0 0 12px">Allow usage measurement to help us improve this website and understand which campaigns bring inquiries? Your contact details and questionnaire answers are excluded.</p>';
    [['Allow analytics','granted'],['Decline','denied']].forEach(function(option){
      var b=document.createElement('button'); b.textContent=option[0]; b.type='button';
      b.style.cssText='padding:8px 14px;margin-right:8px;background:#f1f5f9;color:#111827;border:0;border-radius:4px;cursor:pointer';
      b.onclick=function(){choose(option[1]);}; box.appendChild(b);
    });
    document.body.appendChild(box);
  }
  window.GYMeasurement={event:event,context:context,page:page,preferences:preferences};
  if(!allowed()) return;
  page();
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a[href]'); if(!a) return;
    var u; try{u=new URL(a.href,location.href);}catch(_){return;}
    if(u.protocol==='tel:' || u.protocol==='mailto:') event('contact_click',{link_type:u.protocol.slice(0,-1)});
    else if(/^https?:$/.test(u.protocol)) event(u.origin===location.origin?'internal_click':'outbound_click',
      {link_domain:u.hostname,link_path:u.origin===location.origin?u.pathname:'',link_type:u.origin===location.origin?'internal':'external'});
  });
  fetch('/api/measurement/config').then(function(r){return r.ok?r.json():null;}).then(function(c){
    config=c; if(!c || !c.ga4MeasurementId) return;
    var button=document.createElement('button'); button.type='button'; button.textContent='Analytics preferences';
    button.style.cssText='position:fixed;bottom:4px;left:8px;z-index:900;font:11px system-ui;padding:3px 6px;background:#111827;color:#f1f5f9;border:1px solid #334155;border-radius:4px';
    button.onclick=preferences; document.body.appendChild(button);
    if(!consent || Date.now()-consent.at>=ttl) { if(navigator.globalPrivacyControl!==true) preferences(); }
    start();
  }).catch(function(){});
})();
