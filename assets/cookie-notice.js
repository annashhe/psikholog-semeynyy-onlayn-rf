/**
 * Cookie-уведомление и выбор категорий (семейный сайт).
 * Статистика по умолчанию до явного отказа; отказ останавливает сбор и очищает cookie аналитики.
 */
(function (global) {
  var STORAGE_KEY = 'psiCookiePrefs';
  var BANNER_KEY = 'psiCookieBannerShown';
  var POLICY_HREF = '/privacy-policy/';

  function readPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writePrefs(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  global.psiGetCookiePrefs = function () {
    return readPrefs();
  };

  global.psiHasAnalyticsConsent = function () {
    var p = readPrefs();
    if (!p) return true;
    return p.analytics !== false;
  };

  function notifyAnalyticsGate() {
    var allowed = global.psiHasAnalyticsConsent();
    if (typeof global.psiOnAnalyticsConsentChange === 'function') {
      global.psiOnAnalyticsConsentChange(allowed);
    }
    if (allowed) {
      try {
        global.__psiAnalyticsDisabled = false;
      } catch (e) {}
      if (typeof global.gtag === 'function') {
        try {
          global.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied' });
        } catch (e2) {}
      }
      if (typeof global.psiLoadAnalytics === 'function') {
        global.psiLoadAnalytics();
      }
    } else if (typeof global.psiStopAnalytics === 'function') {
      global.psiStopAnalytics();
    }
  }

  function savePrefs(analytics, source) {
    writePrefs({
      analytics: !!analytics,
      essential: true,
      updated: new Date().toISOString(),
      source: source || 'banner',
    });
    notifyAnalyticsGate();
  }

  function bannerShownThisVisit() {
    try {
      return sessionStorage.getItem(BANNER_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markBannerShownThisVisit() {
    try {
      sessionStorage.setItem(BANNER_KEY, '1');
    } catch (e) {}
  }

  function hideBannerEl() {
    var el = document.getElementById('psiCookieNotice');
    if (el) {
      el.classList.remove('open');
      el.setAttribute('hidden', 'hidden');
    }
  }

  function ensureStyles() {
    if (document.getElementById('psi-cookie-notice-style')) return;
    var style = document.createElement('style');
    style.id = 'psi-cookie-notice-style';
    style.textContent =
      '.psi-cookie-notice{position:fixed;left:16px;right:16px;bottom:16px;z-index:10000050;max-width:560px;margin:0 auto;background:rgba(255,243,227,.97);border:1px solid rgba(255,255,255,.95);border-radius:18px;box-shadow:0 16px 40px rgba(160,120,140,.22);padding:1rem 1.2rem;display:none;align-items:flex-start;gap:1rem;flex-wrap:wrap;font-family:Nunito,system-ui,sans-serif;color:#4A3F45;backdrop-filter:blur(14px)}' +
      '.psi-cookie-notice.open{display:flex}' +
      '.psi-cookie-notice p{flex:1 1 240px;margin:0;font-size:.85rem;color:#7A6A70;line-height:1.5}' +
      '.psi-cookie-notice a{color:#9a6b7a;font-weight:700;text-decoration:none}' +
      '.psi-cookie-notice a:hover{text-decoration:underline}' +
      '.psi-cookie-notice-actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;flex-shrink:0}' +
      '.psi-cookie-notice .psi-cookie-ok{flex:0 0 auto;padding:.55rem 1.2rem;border-radius:999px;font-weight:800;font-size:.85rem;cursor:pointer;font-family:inherit;border:0;background:linear-gradient(90deg,#D4A5A5,#B8A9C9);color:#fff}' +
      '.psi-cookie-modal-overlay{position:fixed;inset:0;z-index:10000060;background:rgba(74,63,69,.45);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}' +
      '.psi-cookie-modal-overlay.open{display:flex}' +
      '.psi-cookie-modal{background:#FFF3E3;border-radius:20px;max-width:440px;width:100%;max-height:min(90vh,640px);overflow:auto;padding:1.25rem 1.35rem;box-shadow:0 20px 50px rgba(160,120,140,.25);font-family:Nunito,system-ui,sans-serif;box-sizing:border-box}' +
      '.psi-cookie-modal h2{font-family:Literata,Georgia,serif;font-size:1.15rem;margin:0 0 .75rem;color:#4A3F45;font-weight:600}' +
      '.psi-cookie-modal p{font-size:.85rem;color:#7A6A70;line-height:1.55;margin:0 0 1rem}' +
      '.psi-cookie-row{display:flex;gap:.75rem;align-items:flex-start;padding:.75rem 0;border-top:1px solid rgba(74,63,69,.1)}' +
      '.psi-cookie-row:first-of-type{border-top:0}' +
      '.psi-cookie-row label{flex:1;font-size:.85rem;color:#7A6A70;line-height:1.45;cursor:pointer}' +
      '.psi-cookie-row strong{display:block;color:#4A3F45;margin-bottom:.2rem}' +
      '.psi-cookie-row input{margin-top:.2rem;accent-color:#9a6b7a}' +
      '.psi-cookie-modal-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem;justify-content:flex-end}' +
      '.psi-cookie-modal-actions button{padding:.55rem 1rem;border-radius:999px;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit;border:1px solid rgba(74,63,69,.15);background:#fff;color:#4A3F45}' +
      '.psi-cookie-modal-actions .psi-cookie-save{background:linear-gradient(90deg,#D4A5A5,#B8A9C9);color:#fff;border:0}';
    document.head.appendChild(style);
  }

  function openSettingsModal() {
    ensureStyles();
    var existing = document.getElementById('psiCookieModal');
    if (existing) {
      existing.classList.add('open');
      return;
    }
    var prefs = readPrefs();
    var analyticsOn = prefs ? !!prefs.analytics : true;

    var overlay = document.createElement('div');
    overlay.id = 'psiCookieModal';
    overlay.className = 'psi-cookie-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Настройки cookie');
    overlay.innerHTML =
      '<div class="psi-cookie-modal">' +
      '<h2>Настройки cookie</h2>' +
      '<p>Выберите, что разрешить. Подробнее — в <a href="' + POLICY_HREF + '" target="_blank" rel="noopener">политике конфиденциальности</a>.</p>' +
      '<div class="psi-cookie-row">' +
      '<input type="checkbox" id="psiCookieEssential" checked disabled aria-disabled="true" />' +
      '<label for="psiCookieEssential"><strong>Необходимые</strong>Нужны для работы сайта (формы, запись). Отключить нельзя.</label>' +
      '</div>' +
      '<div class="psi-cookie-row">' +
      '<input type="checkbox" id="psiCookieAnalytics"' +
      (analyticsOn ? ' checked' : '') +
      ' />' +
      '<label for="psiCookieAnalytics"><strong>Статистика посещений</strong>Яндекс.Метрика (в т.ч. Вебвизор и карта кликов) и Google Tag (Google LLC). Можно отключить.</label>' +
      '</div>' +
      '<div class="psi-cookie-modal-actions">' +
      '<button type="button" class="psi-cookie-reject-analytics">Только необходимые</button>' +
      '<button type="button" class="psi-cookie-save">Сохранить</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    var analyticsEl = document.getElementById('psiCookieAnalytics');
    overlay.querySelector('.psi-cookie-save').addEventListener('click', function () {
      savePrefs(analyticsEl && analyticsEl.checked, 'settings');
      overlay.classList.remove('open');
      hideBannerEl();
    });
    overlay.querySelector('.psi-cookie-reject-analytics').addEventListener('click', function () {
      if (analyticsEl) analyticsEl.checked = false;
      savePrefs(false, 'reject-analytics');
      overlay.classList.remove('open');
      hideBannerEl();
    });
  }

  global.psiOpenCookieSettings = openSettingsModal;

  global.mountPsiCookieNotice = function () {
    notifyAnalyticsGate();

    var prefs = readPrefs();
    if (prefs) return;

    if (bannerShownThisVisit()) return;
    if (document.getElementById('psiCookieNotice')) return;

    ensureStyles();

    var el = document.createElement('div');
    el.id = 'psiCookieNotice';
    el.className = 'psi-cookie-notice open';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Уведомление о cookie');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<p>Мы используем cookie: необходимые — для работы сайта; сбор статистики можно <a href="#" class="psi-cookie-settings-link" role="button">настроить</a>. Подробнее — в <a href="' +
      POLICY_HREF +
      '" class="psi-cookie-policy-link" target="_blank" rel="noopener">политике конфиденциальности</a>.</p>' +
      '<div class="psi-cookie-notice-actions">' +
      '<button type="button" class="psi-cookie-ok" id="psiCookieNoticeOk">Ок</button>' +
      '</div>';

    document.body.appendChild(el);
    markBannerShownThisVisit();

    el.querySelector('.psi-cookie-settings-link').addEventListener('click', function (e) {
      e.preventDefault();
      openSettingsModal();
    });
    document.getElementById('psiCookieNoticeOk').addEventListener('click', function () {
      savePrefs(true, 'ok-all');
      hideBannerEl();
    });
  };

  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest && e.target.closest('.js-cookie-settings');
    if (!link) return;
    e.preventDefault();
    openSettingsModal();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', global.mountPsiCookieNotice);
  } else {
    global.mountPsiCookieNotice();
  }
})(window);
