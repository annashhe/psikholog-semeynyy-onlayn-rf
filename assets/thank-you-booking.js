(() => {
  const LEADS_API =
    window.PSI_LEADS_API || 'https://psi-leads.anna-shhe-adwords.workers.dev';

  const THERAPY = {
    individual: { title: 'Индивидуальная консультация', duration: '50 минут', price: '4 500 ₽', type: 'individual' },
    individual90: { title: 'Индивидуальная консультация', duration: '90 минут', price: '7 000 ₽', type: 'individual90' },
    individual_90: { title: 'Индивидуальная консультация', duration: '90 минут', price: '7 000 ₽', type: 'individual90' },
    family: { title: 'Семейная (парная) консультация', duration: '90 минут', price: '7 000 ₽', type: 'family' },
  };

  const CONTACT = {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    max: 'MAX',
    sms: 'SMS',
  };

  let thankYouStarted = false;
  const originalFetch = window.fetch.bind(window);

  function formatContact(methods) {
    const list = (Array.isArray(methods) ? methods : [])
      .map((m) => CONTACT[String(m || '').toLowerCase()] || String(m || '').trim())
      .filter(Boolean);
    if (!list.length) return 'Telegram, WhatsApp или MAX';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' или ' + list[1];
    return list.slice(0, -1).join(', ') + ' или ' + list[list.length - 1];
  }

  function formatWhen(startIso, endIso, tz) {
    if (!startIso) return '';
    try {
      const start = new Date(startIso);
      const end = endIso ? new Date(endIso) : null;
      const zone = tz || 'Europe/Kaliningrad';
      const datePart = start.toLocaleDateString('ru-RU', {
        timeZone: zone,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const t0 = start.toLocaleTimeString('ru-RU', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
      });
      if (!end) return datePart + ', ' + t0 + ' (' + zone + ')';
      const t1 = end.toLocaleTimeString('ru-RU', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
      });
      return datePart + ', ' + t0 + ' – ' + t1 + ' (' + zone + ')';
    } catch (_) {
      return startIso;
    }
  }

  function sessionMinutes(therapyType, startIso, endIso) {
    if (startIso && endIso) {
      const diff = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
      if (diff > 0 && diff < 240) return diff;
    }
    if (therapyType === 'family' || therapyType === 'individual90' || therapyType === 'individual_90') {
      return 90;
    }
    return 50;
  }

  function resolveTherapy(payload) {
    let type = payload.therapyType || payload.therapy || 'individual';
    if (type === 'individual_90') type = 'individual90';
    const mins = sessionMinutes(type, payload.startIso, payload.endIso);
    if (type === 'individual' && mins >= 80) type = 'individual90';
    if (THERAPY[type]) return THERAPY[type];
    return THERAPY.individual;
  }

  function postBookingLead(body, attempt) {
    attempt = attempt || 0;
    return originalFetch(LEADS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).then(function (r) {
      if (!r.ok) throw new Error('lead status ' + r.status);
      return r;
    }).catch(function (err) {
      if (attempt < 2) {
        return new Promise(function (resolve) {
          setTimeout(resolve, 700 * (attempt + 1));
        }).then(function () {
          return postBookingLead(body, attempt + 1);
        });
      }
      throw err;
    });
  }

  function goThankYou(payload, therapy, endIso) {
    try {
      sessionStorage.setItem(
        'bookingThankYou',
        JSON.stringify({
          name: payload.name || '',
          therapy: therapy.title,
          duration: therapy.duration,
          price: therapy.price,
          datetime: formatWhen(payload.startIso, endIso, payload.clientTimezone),
          contact: formatContact(payload.contactMethods),
          leadGoal: 'pending',
        })
      );
    } catch (_) {}
    if (typeof window.psiMetrikaGoal === 'function') {
      window.psiMetrikaGoal('lead_booking');
    }
    try {
      sessionStorage.setItem('psiLeadGoalPending', '1');
    } catch (_) {}
    window.location.assign('/thank-you-booking/');
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String((init && init.method) || 'GET').toUpperCase();
    const isBooking = /\/public\/bookings(?:\?|$)/.test(url) && method === 'POST';
    return originalFetch(input, init).then((res) => {
      if (!isBooking || !res.ok || thankYouStarted) return res;
      try {
        const payload = init && init.body ? JSON.parse(init.body) : {};
        let endIso = payload.endIso;
        const therapy = resolveTherapy(payload);
        if (payload.startIso && !endIso) {
          const d = new Date(payload.startIso);
          d.setMinutes(d.getMinutes() + (therapy.duration.indexOf('90') >= 0 ? 90 : 50));
          endIso = d.toISOString();
        }
        const contactMethods = Array.isArray(payload.contactMethods)
          ? payload.contactMethods.slice()
          : [];
        const tracking =
          typeof getLeadTrackingPayload === 'function' ? getLeadTrackingPayload() : {};
        const leadBody = JSON.stringify(
          Object.assign(
            {
              source: 'booking',
              name: payload.name,
              phone: payload.phone,
              therapyType: therapy.type,
              contactMethods: contactMethods,
              startIso: payload.startIso,
              endIso: endIso,
              clientTimezone: payload.clientTimezone,
              comment: payload.comment || '',
              website: '',
            },
            tracking
          )
        );
        thankYouStarted = true;
        postBookingLead(leadBody)
          .then(function () {
            goThankYou(payload, therapy, endIso);
          })
          .catch(function () {
            thankYouStarted = false;
            alert(
              'Запись в календаре прошла, но уведомление мне не отправилось. Напишите в Telegram @annashhe или WhatsApp +7 913 755 62 84 — подтвердим слот.'
            );
            goThankYou(payload, therapy, endIso);
          });
      } catch (_) {
        thankYouStarted = false;
      }
      return res;
    });
  };
})();
