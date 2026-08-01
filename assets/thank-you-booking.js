(() => {
  const THERAPY = {
    individual: { title: 'Индивидуальная консультация', duration: '50 минут', price: '4 500 ₽' },
    individual90: { title: 'Индивидуальная консультация', duration: '90 минут', price: '7 000 ₽' },
    individual_90: { title: 'Индивидуальная консультация', duration: '90 минут', price: '7 000 ₽' },
    family: { title: 'Семейная (парная) консультация', duration: '90 минут', price: '7 000 ₽' },
  };

  const CONTACT = {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    max: 'MAX',
    sms: 'SMS',
  };

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

  function resolveTherapy(payload) {
    let type = payload.therapyType || payload.therapy || 'individual';
    if (type === 'individual_90') type = 'individual90';
    if (THERAPY[type]) return THERAPY[type];
    if (payload.startIso && payload.endIso) {
      const mins = Math.round((new Date(payload.endIso) - new Date(payload.startIso)) / 60000);
      if (mins >= 80) return THERAPY.individual90;
    }
    return THERAPY.individual;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String((init && init.method) || 'GET').toUpperCase();
    const isBooking = /\/public\/bookings(?:\?|$)/.test(url) && method === 'POST';
    return originalFetch(input, init).then((res) => {
      if (!isBooking || !res.ok) return res;
      try {
        const payload = init && init.body ? JSON.parse(init.body) : {};
        let endIso = payload.endIso;
        if (payload.startIso && !endIso) {
          const d = new Date(payload.startIso);
          const therapy = resolveTherapy(payload);
          d.setMinutes(d.getMinutes() + (therapy.duration.indexOf('90') >= 0 ? 90 : 50));
          endIso = d.toISOString();
        }
        const therapy = resolveTherapy(Object.assign({}, payload, { endIso }));
        sessionStorage.setItem(
          'bookingThankYou',
          JSON.stringify({
            name: payload.name || '',
            therapy: therapy.title,
            duration: therapy.duration,
            price: therapy.price,
            datetime: formatWhen(payload.startIso, endIso, payload.clientTimezone),
            contact: formatContact(payload.contactMethods),
          })
        );
        window.location.assign('/thank-you-booking/');
      } catch (_) {}
      return res;
    });
  };
})();
