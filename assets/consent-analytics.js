/**
 * Яндекс.Метрика и Google Tag (семейный сайт).
 * Аналитика включена по умолчанию; загрузка отложена до после first paint
 * (interaction или ~3.5с после load), без отключения счётчиков.
 */
(function (global) {
  var METRIKA_ID = 111192861;
  var GTAG_ID = 'G-H1CJPPTM22';
  var started = false;
  var armed = false;

  function loadGtag() {
    if (global.__psiGtagLoaded) return;
    global.__psiGtagLoaded = true;
    global.dataLayer = global.dataLayer || [];
    global.gtag =
      global.gtag ||
      function () {
        global.dataLayer.push(arguments);
      };
    global.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      wait_for_update: 500,
    });
    global.gtag('js', new Date());
    global.gtag('config', GTAG_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GTAG_ID;
    document.head.appendChild(s);
  }

  function loadMetrika() {
    if (global.__psiMetrikaLoaded) return;
    global.__psiMetrikaLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym');

    global.ym(METRIKA_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }

  function deleteCookie(name, path, domain) {
    var expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = name + '=; expires=' + expires + '; path=' + (path || '/') + ';';
    if (domain) {
      document.cookie = name + '=; expires=' + expires + '; path=' + (path || '/') + '; domain=' + domain + ';';
    }
  }

  function clearAnalyticsCookies() {
    var host = global.location && global.location.hostname;
    var parts = host ? host.split('.') : [];
    var domains = [''];
    if (host) {
      domains.push(host);
      if (parts.length > 1) domains.push('.' + parts.slice(-2).join('.'));
    }
    var raw = document.cookie ? document.cookie.split(';') : [];
    var names = [];
    for (var i = 0; i < raw.length; i++) {
      var pair = raw[i].trim().split('=');
      var n = pair[0];
      if (/^(_ym|_ga|_gid|_gat)/.test(n)) names.push(n);
    }
    names.forEach(function (name) {
      domains.forEach(function (d) {
        deleteCookie(name, '/', d || undefined);
      });
    });
  }

  function consentOk() {
    if (global.__psiAnalyticsDisabled) return false;
    if (typeof global.psiHasAnalyticsConsent === 'function' && !global.psiHasAnalyticsConsent()) {
      return false;
    }
    return true;
  }

  var goalQueue = [];

  function flushGoal(name, params) {
    if (typeof global.ym === 'function') {
      try {
        global.ym(METRIKA_ID, 'reachGoal', name, params || {});
      } catch (e) {}
    }
    if (typeof global.gtag === 'function') {
      try {
        global.gtag('event', name, params || {});
      } catch (e2) {}
    }
  }

  function flushGoalQueue() {
    while (goalQueue.length) {
      var g = goalQueue.shift();
      flushGoal(g.name, g.params);
    }
  }

  function startAnalytics() {
    if (started || !consentOk()) return;
    started = true;
    loadGtag();
    loadMetrika();
    flushGoalQueue();
  }

  global.psiLoadAnalytics = function () {
    if (started || !consentOk()) return;
    if (armed) return;
    armed = true;

    function arm() {
      var fired = false;
      function fire() {
        if (fired) return;
        fired = true;
        startAnalytics();
      }
      // Thank-you: цели конверсии — сразу. Иначе: interaction или ~3.5с после load.
      if (/\/thank-you-booking\/?$/.test(location.pathname || '')) {
        fire();
        return;
      }
      setTimeout(fire, 3500);
      ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        global.addEventListener(ev, fire, { once: true, passive: true });
      });
    }

    if (document.readyState === 'complete') {
      arm();
    } else {
      global.addEventListener('load', arm, { once: true });
    }
  };

  global.psiStopAnalytics = function () {
    global.__psiAnalyticsDisabled = true;
    clearAnalyticsCookies();
    if (typeof global.gtag === 'function') {
      try {
        global.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
        });
      } catch (e) {}
    }
  };

  global.psiMetrikaGoal = function (name, params) {
    if (!global.psiHasAnalyticsConsent || !global.psiHasAnalyticsConsent()) return;
    if (!started) {
      goalQueue.push({ name: name, params: params || {} });
      tryLoadIfAllowed();
      return;
    }
    flushGoal(name, params);
  };

  function tryLoadIfAllowed() {
    if (!consentOk()) return;
    global.psiLoadAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryLoadIfAllowed);
  } else {
    tryLoadIfAllowed();
  }
})(window);
