/** UTM и pageUrl для заявок в Telegram (семейный сайт) */
window.PSI_SITE_HOME = 'https://психолог-семейный-онлайн.рф/';
window.PSI_LEADS_API = 'https://psi-leads.anna-shhe-adwords.workers.dev';

(function () {
  function captureUtms() {
    try {
      var params = new URLSearchParams(window.location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      var utm = {};
      var has = false;
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) {
          utm[k] = String(v).slice(0, 200);
          has = true;
        }
      });
      if (has) {
        sessionStorage.setItem('psiUtms', JSON.stringify(utm));
        try {
          if (!localStorage.getItem('psiUtmsFirst')) {
            localStorage.setItem('psiUtmsFirst', JSON.stringify(utm));
          }
        } catch (e1) {}
      }
    } catch (e) {}
  }

  captureUtms();

  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || typeof window.psiMetrikaGoal !== 'function') return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('t.me/') !== -1 || href.indexOf('telegram') !== -1) {
        window.psiMetrikaGoal('click_telegram');
      } else if (href.indexOf('wa.me/') !== -1 || href.indexOf('whatsapp') !== -1) {
        window.psiMetrikaGoal('click_whatsapp');
      } else if (href.indexOf('max.ru/') !== -1) {
        window.psiMetrikaGoal('click_max');
      } else if (href.indexOf('tel:') === 0) {
        window.psiMetrikaGoal('click_phone');
      } else if (href === '#booking' || href.indexOf('#booking') !== -1) {
        window.psiMetrikaGoal('open_booking');
      }
    },
    true
  );
})();

function getLeadTrackingPayload() {
  var pageUrl = '';
  try {
    pageUrl = window.location.origin + (window.location.pathname || '/');
  } catch (e0) {
    pageUrl = (window.PSI_SITE_HOME || '').replace(/\/$/, '') || '';
  }

  var utm = {};
  try {
    utm = JSON.parse(
      sessionStorage.getItem('psiUtms') || localStorage.getItem('psiUtmsFirst') || '{}'
    );
  } catch (e2) {}

  return {
    pageUrl: pageUrl,
    utmSource: utm.utm_source || '',
    utmMedium: utm.utm_medium || '',
    utmCampaign: utm.utm_campaign || '',
    utmContent: utm.utm_content || '',
    utmTerm: utm.utm_term || '',
  };
}
