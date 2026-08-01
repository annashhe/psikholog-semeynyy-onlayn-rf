(function () {
  function isFormField(target) {
    return !!(
      target &&
      target.closest &&
      target.closest('input, textarea, select, option, button, a, [contenteditable="true"]')
    );
  }

  function protectedTarget(target) {
    return !!(target && target.closest && target.closest('.copy-protected'));
  }

  ['copy', 'cut', 'contextmenu'].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      if (protectedTarget(event.target) && !isFormField(event.target)) {
        event.preventDefault();
      }
    });
  });
})();
