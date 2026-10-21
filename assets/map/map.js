// Level-1 national city map for Just Wander China.
// Renders a prefecture-level ECharts map with 5-level heat coloring,
// hover labels, hover card, hot cities bar, and zoom controls.

const chartDom = document.getElementById('chinaMap')
const myChart = echarts.init(chartDom, null, { renderer: 'canvas' })

const hoverCard = document.getElementById('hoverCard')
const cardCityName = document.getElementById('cardCityName')
const cardImageImg = document.getElementById('cardImageImg')
const cardImagePlaceholder = document.getElementById('cardImagePlaceholder')
const cardProvince = document.getElementById('cardProvince')
const cardBestSeason = document.getElementById('cardBestSeason')
const cardScenery = document.getElementById('cardScenery')
const cardFood = document.getElementById('cardFood')
const cardRating = document.getElementById('cardRating')
const siteData = window.SITE_DATA || { cities: {}, byName: {}, hotspots: {} }
function cityKeyForName(name) { return siteData.byName[name] || null }
function cityForName(name) { var key = cityKeyForName(name); return key ? siteData.cities[key] : null }

// ---- heat coloring (5 levels) --------------------------------------------
function heatColor(heat) {
  if (heat >= 90) return '#e53935'       // red
  if (heat >= 80) return '#fb8c00'       // orange
  if (heat >= 70) return '#fdd835'       // yellow
  if (heat >= 60) return '#43a068'       // green
  return '#1e88e5'                      // blue
}

function heatBadgeClass(heat) {
  if (heat >= 90) return 'heat-badge-high'
  if (heat >= 70) return 'heat-badge-mid'
  return 'heat-badge-low'
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  })
}

function labelSeparator() {
  return window.getLang() === 'zh' ? '：' : ': '
}

const GRAY = '#c8cfd8'
const GRAY_BORDER = '#aab2bf'
const GRAY_HOVER = '#b6bdc8'

function isHasData(geoName) {
  return !!cityKeyForName(geoName)
}

function displayName(geoName) {
  const city = cityForName(geoName)
  if (city) {
    const lang = window.getLang()
    if (city.mapLabel && city.mapLabel[lang]) return city.mapLabel[lang]
    return city.name[lang] || city.name.en || city.name.zh
  }
  return geoName
}

function fullName(geoName) {
  const city = cityForName(geoName)
  if (city) return city.name[window.getLang()] || city.name.en || city.name.zh
  return geoName
}

function getHeat(geoName) {
  var key = cityKeyForName(geoName)
  return siteData.hotspots && key && siteData.hotspots[key] != null ? siteData.hotspots[key] : null
}

// ---- build ECharts option ------------------------------------------------
var currentZoom = 1.5
var labelMode = 0 // 0 = all, 1 = hot, 2 = off
var LABEL_MODES = [
  { label: 'labelsAll', short: 'labelsAllShort' },
  { label: 'labelsHot', short: 'labelsHotShort' },
  { label: 'labelsOff', short: 'labelsOffShort' }
]

function updateLabelButton() {
  var button = document.getElementById('labelToggle')
  if (!button) return
  var mode = LABEL_MODES[labelMode]
  var text = window.t(mode.label)
  button.textContent = window.t(mode.short)
  button.title = text
  button.setAttribute('aria-label', text)
}

function buildOption() {
  var heat = siteData.hotspots || {}
  var labelKeys = {}
  Object.keys(siteData.cities)
    .sort(function (a, b) { return (heat[b] || 0) - (heat[a] || 0) })
    .slice(0, 30)
    .forEach(function (key) { labelKeys[key] = true })

  var data = (window.CHINA_CITIES_GEO.features || []).map(function (f) {
    var name = f.properties.name
    var has = isHasData(name)
    var h = getHeat(name)
    if (has && h != null) {
      var key = cityKeyForName(name)
      var showLabel = labelMode === 0 ? true : (labelMode === 1 ? !!labelKeys[key] : false)
      return {
        name: name,
        value: h,
        itemStyle: { areaColor: heatColor(h), borderColor: '#ffffff', borderWidth: 0.6 },
        // Short labels (酒泉 instead of 酒泉市) keep all 85 city names readable;
        // the hover card still shows the full administrative name.
        label: {
          show: showLabel,
          fontSize: 10,
          fontWeight: 'bold',
          color: '#1a2b22',
          textBorderColor: 'rgba(255,255,255,0.85)',
          textBorderWidth: 2,
          formatter: displayName(name)
        }
      }
    }
    return { name: name, value: 0, emphasis: { disabled: true } }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [
      {
        name: 'city',
        type: 'map',
        map: 'chinaCities',
        roam: true,
        zoom: currentZoom,
        layoutCenter: ['45%', '65%'],
        layoutSize: '110%',
        scaleLimit: { min: 1, max: 12 },
        itemStyle: { areaColor: GRAY, borderColor: GRAY_BORDER, borderWidth: 0.5 },
        label: { show: false },
        // Shift overlapping labels vertically instead of hiding them, so every
        // destination keeps a visible name at the default zoom.
        labelLayout: { moveOverlap: 'shiftY' },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: '#1a2b22',
          },
          itemStyle: { areaColor: '#3aa15a' },
        },
        selectedMode: false,
        data: data,
      },
    ],
  }
}

function renderMap() {
  echarts.registerMap('chinaCities', window.CHINA_CITIES_GEO)
  myChart.setOption(buildOption())
}

// ---- hover card ----------------------------------------------------------
function renderHoverCard(geoName) {
  var key = cityKeyForName(geoName)
  var lang = window.getLang()

  // City name
  cardCityName.textContent = fullName(geoName)

  // Heat value for rating
  var h = getHeat(geoName)

  // Province
  if (key) {
    cardProvince.textContent = '(' + siteData.cities[key].province[lang] + ')'
  } else {
    cardProvince.textContent = ''
  }

  // City image: only request a file when the build resolved a real cover.
  var cover = key && siteData.cities[key] ? siteData.cities[key].cover : ''
  if (cover) {
    cardImageImg.onerror = function () {
      cardImageImg.style.display = 'none'
      cardImagePlaceholder.style.display = 'inline'
    }
    cardImageImg.src = cover
    cardImageImg.alt = displayName(geoName)
    cardImageImg.style.display = 'block'
    cardImagePlaceholder.style.display = 'none'
  } else {
    cardImageImg.removeAttribute('src')
    cardImageImg.style.display = 'none'
    cardImagePlaceholder.style.display = 'inline'
  }

  // City info: bestSeason, scenery, food
  if (key && siteData.cities[key]) {
    var page = siteData.cities[key]

    // Best season
    var bestSeason = page.bestSeason && page.bestSeason[lang] ? page.bestSeason[lang] : '—'
    cardBestSeason.textContent = bestSeason

    // Scenery (top 3 attractions)
    var scenery = (page.attractions || []).slice(0, 3).map(function (a) {
      return a.name[lang]
    }).join('、')
    cardScenery.textContent = scenery || '—'

    // Food (top 3 foods)
    var food = (page.foods || []).slice(0, 3).map(function (f) {
      return f.name[lang]
    }).join('、')
    cardFood.textContent = food || '—'

    // Rating stars based on heat
    var stars = h >= 90 ? 5 : h >= 80 ? 4 : h >= 70 ? 3 : h >= 60 ? 2 : 1
    var starHtml = ''
    for (var i = 0; i < 5; i++) {
      starHtml += '<span class="star' + (i < stars ? ' active' : '') + '">★</span>'
    }
    cardRating.innerHTML = '<span class="rating-label">' + window.t('recommendIndex') + '</span><span class="rating-stars">' + starHtml + '</span>'
  } else {
    cardBestSeason.textContent = '—'
    cardScenery.textContent = window.t('noData')
    cardFood.textContent = ''
    cardRating.innerHTML = ''
  }
}

function positionHoverCard(x, y) {
  var w = hoverCard.offsetWidth || 280
  var h = hoverCard.offsetHeight || 300
  var px = x + 16
  var py = y + 16
  if (px + w > window.innerWidth) px = x - w - 16
  if (py + h > window.innerHeight) py = y - h - 16
  px = Math.max(8, px); py = Math.max(8, py)
  hoverCard.style.left = px + 'px'
  hoverCard.style.top = py + 'px'
}
function showHoverCard() { hoverCard.classList.add('visible') }
function hideHoverCard() { hoverCard.classList.remove('visible') }

// ---- events --------------------------------------------------------------
myChart.on('mouseover', function (p) {
  if (p.componentType !== 'series') return
  var h = getHeat(p.name)
  if (h == null) return
  renderHoverCard(p.name)
  showHoverCard()
})
myChart.on('mouseout', function (p) {
  if (p.componentType !== 'series') return
  hideHoverCard()
})
myChart.on('click', function (p) {
  if (p.componentType !== 'series') return
  var key = cityKeyForName(p.name)
  if (key) window.location.href = 'cities/' + encodeURIComponent(key) + '/index.html'
})
chartDom.addEventListener('mousemove', function (e) {
  if (hoverCard.classList.contains('visible')) positionHoverCard(e.clientX, e.clientY)
})

// ---- zoom controls -------------------------------------------------------
document.getElementById('zoomIn').addEventListener('click', function () {
  currentZoom = Math.min(12, currentZoom * 1.3)
  myChart.setOption({ series: [{ zoom: currentZoom }] })
})
document.getElementById('zoomOut').addEventListener('click', function () {
  currentZoom = Math.max(1, currentZoom / 1.3)
  myChart.setOption({ series: [{ zoom: currentZoom }] })
})

var labelToggle = document.getElementById('labelToggle')
if (labelToggle) {
  labelToggle.addEventListener('click', function () {
    labelMode = (labelMode + 1) % LABEL_MODES.length
    updateLabelButton()
    myChart.setOption(buildOption())
  })
}

// ---- resize --------------------------------------------------------------
window.addEventListener('resize', function () { myChart.resize() })
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(function () { myChart.resize() }).observe(chartDom)
}

// ---- hot cities section --------------------------------------------------
var hotCityOffset = 0
var HOT_CITIES_PER_PAGE = 6

function cityPlaceholder(name, hue) {
  var c1 = 'hsl(' + hue + ',55%,52%)'
  var c2 = 'hsl(' + ((hue + 35) % 360) + ',60%,36%)'
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="120" height="120" fill="url(#g)"/>' +
    '<text x="60" y="66" font-family="Microsoft YaHei,sans-serif" font-size="20" ' +
    'fill="rgba(255,255,255,0.9)" text-anchor="middle">' + escapeHtml(name) + '</text>' +
    '</svg>'
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function heatLevel(heat) {
  if (heat >= 90) return { text: 'heatVeryHigh', cls: 'heat-level-very-high' }
  if (heat >= 80) return { text: 'heatHigh', cls: 'heat-level-high' }
  if (heat >= 70) return { text: 'heatMidHigh', cls: 'heat-level-mid-high' }
  if (heat >= 60) return { text: 'heatMidLow', cls: 'heat-level-mid-low' }
  return { text: 'heatLow', cls: 'heat-level-low' }
}

function getAllCitiesSorted() {
  return Object.keys(siteData.cities).map(function (key) {
    var city = siteData.cities[key]
    var h = siteData.hotspots && siteData.hotspots[key] != null ? siteData.hotspots[key] : 0
    return { key: key, name: city.name.zh, names: city.name, en: city.name.en, heat: h, cover: city.cover || '' }
  }).sort(function (a, b) { return b.heat - a.heat })
}

function renderHotCities() {
  var grid = document.getElementById('hotCitiesGrid')
  if (!grid) return
  var lang = window.getLang()
  var all = getAllCitiesSorted()
  // Show 6 at a time, cycling through
  var visible = []
  for (var i = 0; i < HOT_CITIES_PER_PAGE; i++) {
    visible.push(all[(hotCityOffset + i) % all.length])
  }
  var html = visible.map(function (c, i) {
    var label = c.names[lang] || c.en || c.name
    var lvl = heatLevel(c.heat)
    var fallback = cityPlaceholder(label, (c.heat * 3 + i * 50) % 360)
    var media = c.cover
      ? '<img src="' + escapeHtml(c.cover) + '" alt="' + escapeHtml(label) + '" width="800" height="400" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : '') + ' style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null;this.src=\'' + fallback + '\'" />'
      : '<span class="ph-label">' + escapeHtml(label) + '</span>'
    return '<a class="hot-city-card" href="cities/' + encodeURIComponent(c.key) + '/index.html">' +
      '<div class="hot-city-card-img">' + media + '</div>' +
      '<div class="hot-city-card-body">' +
        '<div class="hot-city-card-name">' + escapeHtml(label) + '</div>' +
        '<div class="hot-city-card-heat ' + lvl.cls + '">' + escapeHtml(window.t('heat')) + escapeHtml(labelSeparator()) + escapeHtml(window.t(lvl.text)) + '</div>' +
      '</div>' +
    '</a>'
  }).join('')
  grid.innerHTML = html
}

document.getElementById('shuffleBtn').addEventListener('click', function () {
  var all = getAllCitiesSorted()
  hotCityOffset = (hotCityOffset + HOT_CITIES_PER_PAGE) % all.length
  renderHotCities()
})

// ---- search --------------------------------------------------------------
var searchStatusEl = document.getElementById('searchStatus')
var searchStatusTimer = null

function showSearchStatus(message) {
  if (!searchStatusEl) return
  searchStatusEl.textContent = message
  clearTimeout(searchStatusTimer)
  searchStatusTimer = setTimeout(function () { searchStatusEl.textContent = '' }, 3200)
}

function normalize(value) { return String(value == null ? '' : value).trim().toLowerCase() }

function goToCity(key) {
  window.location.href = 'cities/' + encodeURIComponent(key) + '/index.html'
}

function doSearch(q) {
  q = String(q || '').trim()
  if (!q) return
  var nq = normalize(q)
  var exact = null
  var partial = null
  Object.keys(siteData.cities).forEach(function (key) {
    var city = siteData.cities[key]
    var names = Object.keys(city.name).map(function (locale) { return city.name[locale] })
    // Scenic names such as 凤凰古城/平遥古城 now live in the attraction list,
    // so search should still find the parent city page.
    var attractions = (city.attractions || []).reduce(function (list, attraction) {
      return list.concat(Object.keys(attraction.name).map(function (locale) { return attraction.name[locale] }))
    }, [])
    var candidates = names.concat(attractions)
    if (candidates.some(function (name) { return normalize(name) === nq })) {
      exact = key
    } else if (!partial && candidates.some(function (name) { return normalize(name).indexOf(nq) >= 0 })) {
      partial = key
    }
  })
  if (exact || partial) {
    goToCity(exact || partial)
    return
  }
  var geoName = null
  ;(window.CHINA_CITIES_GEO.features || []).some(function (f) {
    var name = f.properties.name
    if (normalize(name).indexOf(nq) >= 0) {
      geoName = name
      return true
    }
    return false
  })
  if (geoName) {
    var key = cityKeyForName(geoName)
    if (key) {
      goToCity(key)
    } else {
      myChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: geoName })
      renderHoverCard(geoName)
      showHoverCard()
      setTimeout(hideHoverCard, 2000)
    }
    return
  }
  showSearchStatus(window.t('noResult'))
}
window.doSearch = doSearch

// ---- language ------------------------------------------------------------
function applyLang() {
  window.applyGlobalLang({
    after: function() {
      if (window.CHINA_CITIES_GEO) myChart.setOption(buildOption())
      updateLabelButton()
      renderHotCities()
    }
  })
}

document.getElementById('langToggle').addEventListener('click', function () {
  window.setLang(window.nextLang ? window.nextLang() : (window.getLang() === 'zh' ? 'en' : 'zh'))
})

// ---- init ----------------------------------------------------------------
function initMap() {
  if (typeof window.CHINA_CITIES_GEO === 'undefined') {
    chartDom.innerHTML = '<div class="map-error">' + escapeHtml(window.t('mapError')) + '</div>'
    return
  }
  renderMap()
  applyLang()
}
initMap()
