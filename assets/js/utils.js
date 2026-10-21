// Shared utilities for Just Wander China

/**
 * Apply language to DOM elements with data-i18n attributes.
 * Updates text content and placeholder attributes.
 * @param {Object} options - Optional callbacks for page-specific logic
 */
window.applyGlobalLang = function(options) {
  options = options || {}
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var k = el.getAttribute('data-i18n')
    if (k) el.textContent = window.t(k)
  })
  
  document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
    var k = el.getAttribute('data-i18n-ph')
    if (k) el.setAttribute('placeholder', window.t(k))
  })
  
  if (typeof options.after === 'function') {
    options.after(window.getLang())
  }
}
