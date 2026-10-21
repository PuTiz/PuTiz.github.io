// Lazy loader for the homepage map.
// Keeps the 1.2 MB GeoJSON and map runtime off the critical rendering path.
(function () {
  var chartEl = document.getElementById('chinaMap')
  if (!chartEl) return

  var started = false
  var langPath = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en'

  function ui(key, fallback) {
    return (window.t && window.t(key)) || fallback
  }

  function setBusy(value) {
    chartEl.setAttribute('aria-busy', value ? 'true' : 'false')
  }

  function showError() {
    setBusy(false)
    chartEl.innerHTML =
      '<div class="map-error">' + ui('mapError', 'Map data failed to load.') +
      ' · <a href="/' + langPath + '/cities/index.html">' +
      ui('browseCities', 'Browse all cities') + '</a></div>'
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = resolve
      script.onerror = function () { reject(new Error('Failed to load ' + src)) }
      document.body.appendChild(script)
    })
  }

  function loadMap() {
    if (started) return
    started = true
    setBusy(true)

    loadScript('/assets/map/echarts.custom.min.js')
      .then(function () {
        return Promise.all([
          fetch('/assets/map/china-cities.geo.json', { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) throw new Error('Failed to load map geometry')
            return response.json()
          }),
          loadScript('/assets/map/site-map-data.js')
        ])
      })
      .then(function (results) {
        window.CHINA_CITIES_GEO = results[0]
        chartEl.innerHTML = ''
        return loadScript('/assets/map/map.js')
      })
      .then(function () {
        setBusy(false)
      })
      .catch(showError)
  }

  function setLoadingMessage() {
    chartEl.innerHTML =
      '<span class="map-loading" data-i18n="mapLoading">' +
      ui('mapLoading', 'Loading interactive map…') + '</span>'
    if (window.applyGlobalLang) window.applyGlobalLang()
  }

  setLoadingMessage()

  var searchInput = document.getElementById('citySearch')
  if (searchInput) {
    searchInput.addEventListener('focus', loadMap, { once: true })
  }

  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  var slowConnection = connection && (
    connection.saveData ||
    /(^|-)2g$/.test(connection.effectiveType || '')
  )

  if (slowConnection) {
    chartEl.innerHTML =
      '<button type="button" class="map-load-button">' +
      ui('loadMap', 'Load interactive map') + '</button>'
    chartEl.querySelector('.map-load-button').addEventListener('click', loadMap)
  } else if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadMap, { timeout: 1500 })
  } else {
    window.setTimeout(loadMap, 700)
  }
})()
