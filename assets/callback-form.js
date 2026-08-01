(function () {
  'use strict';

  function field(form, selector) {
    return form.querySelector(selector);
  }

  function setError(control, invalid) {
    if (!control) return;
    control.classList.toggle('is-error', !!invalid);
    control.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function phoneDigits(value) {
    return String(value || '').replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
  }

  function formatPhone(value) {
    var digits = phoneDigits(value);
    if (!digits) return '';
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    var out = '+7';
    if (digits.length > 1) out += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
    if (digits.length >= 7) out += '-' + digits.slice(7, 9);
    if (digits.length >= 9) out += '-' + digits.slice(9, 11);
    return out;
  }

  function initForm(form) {
    var name = field(form, '[name="name"]');
    var phone = field(form, '[name="phone"]');
    var consent = field(form, '[name="consent"]');
    var website = field(form, '[name="website"]');
    var comment = field(form, '[name="comment"]');
    var contacts = form.querySelectorAll('[name="contactMethods"], [name="contactMethod"]');
    var contactGroup = field(form, '[data-contact-methods]') || (contacts[0] && contacts[0].closest('fieldset'));
    var consentRow = consent && (consent.closest('.consent-row') || consent.parentElement);

    if (phone) {
      phone.addEventListener('input', function () {
        var caretAtEnd = phone.selectionStart === phone.value.length;
        phone.value = formatPhone(phone.value);
        if (caretAtEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
        setError(phone, false);
      });
      phone.addEventListener('focus', function () {
        if (!phone.value) phone.value = '+7';
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var selectedContacts = Array.prototype.filter.call(contacts, function (item) {
        return item.checked;
      }).map(function (item) {
        return item.value;
      });
      var invalidName = !name || !name.value.trim();
      var invalidPhone = !phone || phoneDigits(phone.value).length !== 11;
      var invalidContacts = !selectedContacts.length;
      var invalidConsent = !consent || !consent.checked;

      setError(name, invalidName);
      setError(phone, invalidPhone);
      setError(contactGroup, invalidContacts);
      setError(consentRow || consent, invalidConsent);
      if (invalidName || invalidPhone || invalidContacts || invalidConsent) return;

      var submit = field(form, '[type="submit"]');
      if (submit) submit.disabled = true;

      var phoneRaw = phoneDigits(phone.value);
      var payload = {
        source: 'callback',
        name: name.value.trim(),
        phone: phoneRaw,
        contactMethods: selectedContacts,
        comment: comment ? comment.value.trim() : '',
        website: website ? website.value.trim() : '',
      };
      if (typeof window.getLeadTrackingPayload === 'function') {
        Object.assign(payload, window.getLeadTrackingPayload());
      }

      fetch(window.PSI_LEADS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (response) {
        if (!response.ok) throw new Error('Lead API error');
        try {
          sessionStorage.setItem(
            'callbackThankYou',
            JSON.stringify({
              name: payload.name,
              phone: phone.value.trim(),
              contact: selectedContacts.join(', '),
              comment: payload.comment || '',
              format: 'Очная консультация в Калининграде',
            })
          );
        } catch (e) {}
        if (typeof window.psiMetrikaGoal === 'function') window.psiMetrikaGoal('lead_callback');
        window.location.assign('/thank-you-callback/');
      }).catch(function () {
        if (submit) submit.disabled = false;
        window.alert('Не удалось отправить форму. Напишите, пожалуйста, в Telegram: @annashhe');
      });
    });
  }

  function init() {
    document.querySelectorAll('form[data-callback-form], form#callbackForm').forEach(initForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
