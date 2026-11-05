/* Google Analytics 4 for www.omfinitive.net, privacy first.
 * Nothing loads until the visitor clicks Accept (Consent Mode "basic"); Reject
 * keeps Google out entirely. "Cookie settings" in the footer reopens the
 * choice. GA_MEASUREMENT_ID is a GA4 ID (G-…, gtag.js) or a Google Tag
 * Manager container (GTM-…, gtm.js); empty means off. */
(function () {
  var GA_MEASUREMENT_ID = 'GTM-K5J22DQM';
  var KEY = 'omf-analytics-consent';
  var IS_GTM = /^GTM-/i.test(GA_MEASUREMENT_ID);
  if (!/^(G|GTM)-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID)) {
    window.omfTrack = function () {};
    var link = document.getElementById('cookieSettings');
    if (link) link.hidden = true;
    return;
  }

  var loaded = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function getConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function load() {
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + GA_MEASUREMENT_ID] = false;
    gtag('js', new Date());
    gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    var settings = {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Page path only: never send query strings or fragments.
      page_location: location.origin + location.pathname
    };
    if (IS_GTM) {
      gtag('set', settings);
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    } else {
      gtag('config', GA_MEASUREMENT_ID, settings);
    }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/' + (IS_GTM ? 'gtm.js' : 'gtag/js') + '?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
  }
  function clearCookies() {
    window['ga-disable-' + GA_MEASUREMENT_ID] = true;
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        ['', location.hostname, '.' + location.hostname, '.' + location.hostname.split('.').slice(-2).join('.')].forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  var banner = document.getElementById('cookieBanner');
  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* this page only */ }
    banner.hidden = true;
    if (value === 'granted') load(); else clearCookies();
  }
  document.getElementById('cookieAccept').addEventListener('click', function () { choose('granted'); });
  document.getElementById('cookieReject').addEventListener('click', function () { choose('denied'); });
  var settings = document.getElementById('cookieSettings');
  if (settings) settings.addEventListener('click', function (e) { e.preventDefault(); banner.hidden = false; });

  var consent = getConsent();
  if (consent === 'granted') load();
  else if (consent !== 'denied') banner.hidden = false;

  /* Events. Never pass personal data (names, emails, message text). */
  window.omfTrack = function (name, params) {
    if (getConsent() === 'granted') { load(); gtag('event', name, params || {}); }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="app.omfinitive.net"]');
    if (!a) return;
    var href = a.getAttribute('href');
    window.omfTrack(href.indexOf('/careers') !== -1 ? 'care_jobs_click' : 'sign_in_click', { link_text: (a.textContent || '').trim().slice(0, 40) });
  });
})();
