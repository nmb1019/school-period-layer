(function (api) {
  'use strict'

  const ROOT_ID = 'school-period-layer-root'
  const state = {
    settings: api.normaliseSettings(null),
    temporaryExclusions: { dates: [], weeks: [] },
    root: null,
    renderTimer: null,
    lastUrl: location.href,
  }

  function rectIsUsable(rect) {
    return Boolean(rect && rect.width > 1 && rect.height > 1 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight)
  }

  function createRoot() {
    const root = document.createElement('div')
    root.id = ROOT_ID
    root.dataset.version = '0.1.3'
    root.hidden = true
    document.documentElement.appendChild(root)
    state.root = root
  }

  function parseDateFromText(value) {
    if (typeof value !== 'string') return null
    const direct = api.parseDateKey(value)
    if (direct) return direct

    const japanese = value.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/) || value.match(/(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/)
    if (japanese) return api.parseDateKey(`${japanese[1]}-${japanese[2].padStart(2, '0')}-${japanese[3].padStart(2, '0')}`)

    const western = value.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Z][a-z]+)\s+(\d{1,2}),?\s+(20\d{2})/)
    if (western) {
      const parsed = new Date(`${western[1]} ${western[2]}, ${western[3]} UTC`)
      if (!Number.isNaN(parsed.getTime())) return api.parseDateKey(parsed)
    }
    return null
  }

  function expandColumnRect(element) {
    let node = element
    let best = element.getBoundingClientRect()
    for (let depth = 0; depth < 6 && node; depth += 1) {
      const rect = node.getBoundingClientRect()
      const usefulWidth = rect.width >= 50 && rect.width <= 360
      const usefulPosition = rect.right > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight
      if (usefulWidth && usefulPosition && rect.height >= best.height) best = rect
      node = node.parentElement
    }
    return best
  }

  function dateColumnsFor(weekStart) {
    const visibleHeaders = [...document.querySelectorAll('[role="columnheader"]')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width >= 100 && rect.width <= 360 && rect.right > 0 && rect.left < window.innerWidth && rect.top < 220)
      .sort((left, right) => left.rect.left - right.rect.left)

    if (visibleHeaders.length >= 5) {
      return visibleHeaders.slice(0, 7).map(({ rect }, index) => ({
        dateKey: api.addDays(weekStart, index),
        rect,
        score: rect.height,
      }))
    }

    const byDate = new Map()
    const candidates = [
      ...document.querySelectorAll('[data-date]'),
      ...document.querySelectorAll('[role="columnheader"]'),
    ]

    candidates.forEach((element) => {
      const dataDate = element.getAttribute('data-date')
      const label = element.getAttribute('aria-label') || element.textContent || ''
      const dateKey = parseDateFromText(dataDate) || parseDateFromText(label)
      if (!dateKey) return
      const first = api.dateFromKey(weekStart)
      const current = api.dateFromKey(dateKey)
      if (!first || !current) return
      const distance = Math.round((current - first) / 86400000)
      if (distance < 0 || distance > 6) return

      const rect = element.getBoundingClientRect()
      if (!rectIsUsable(rect) || rect.width < 35) return
      const score = rect.height + Math.min(rect.width, 300) / 10
      const previous = byDate.get(dateKey)
      if (!previous || score > previous.score) byDate.set(dateKey, { dateKey, rect, score })
    })

    if (byDate.size < 2) {
      const headers = [...document.querySelectorAll('[role="columnheader"]')]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width >= 50 && rect.width <= 360 && rect.left > 120 && rect.right < window.innerWidth && rect.top < 260)
        .sort((left, right) => left.rect.left - right.rect.left)
      headers.slice(0, 7).forEach(({ rect }, index) => {
        const dateKey = api.addDays(weekStart, index)
        if (!byDate.has(dateKey)) byDate.set(dateKey, { dateKey, rect, score: rect.height })
      })
    }

    return [...byDate.values()].sort((left, right) => left.rect.left - right.rect.left)
  }

  function isWeekView() {
    if (location.pathname.includes('/week')) return true
    const visibleDayHeaders = [...document.querySelectorAll('[role="columnheader"]')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width >= 100 && rect.width <= 360 && rect.right > 0 && rect.left < window.innerWidth && rect.top < 220)
    if (visibleDayHeaders.length < 5) return false

    return [...document.querySelectorAll('[role="grid"] [role="row"]')]
      .some((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width >= Math.max(700, window.innerWidth * 0.5) && rect.height >= 1200 && rect.height <= 6000
      })
  }

  function parseTimeText(value, allowNumeric = false) {
    if (typeof value !== 'string') return null
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (allowNumeric && /^\d{1,4}$/.test(normalized)) {
      const numeric = Number(normalized)
      if (numeric >= 0 && numeric <= 1440) return numeric
    }

    const match = normalized.match(/(午前|午後|AM|PM)?\s*(\d{1,2})(?::|時)(\d{2})?\s*(?:分)?/i)
    if (!match) return null
    let hour = Number(match[2])
    const minute = Number(match[3] || 0)
    const meridiem = (match[1] || '').toUpperCase()
    if (minute > 59) return null
    if (meridiem === '午後' || meridiem === 'PM') {
      if (hour < 12) hour += 12
    } else if ((meridiem === '午前' || meridiem === 'AM') && hour === 12) {
      hour = 0
    }
    if (hour > 23) return null
    return hour * 60 + minute
  }

  function findTimeMarkers(columns) {
    const leftLimit = Math.min(...columns.map(({ rect }) => rect.left)) - 4
    const elements = new Set([
      ...document.querySelectorAll('[data-time]'),
      ...document.querySelectorAll('[aria-label]'),
      ...document.querySelectorAll('[role="grid"] div, [role="grid"] span'),
    ])
    const markers = []

    elements.forEach((element) => {
      if (element.id === ROOT_ID || element.closest(`#${ROOT_ID}`)) return
      const rect = element.getBoundingClientRect()
      if (!rectIsUsable(rect) || rect.width > 170 || rect.height > 36 || rect.right > leftLimit || rect.top < 70) return
      const dataTime = element.getAttribute('data-time')
      const label = element.getAttribute('aria-label') || element.textContent || ''
      const minutes = parseTimeText(dataTime, true) ?? parseTimeText(label)
      if (minutes === null) return
      markers.push({ minutes, y: rect.top + rect.height / 2 })
    })

    const byMinute = new Map()
    markers.forEach((marker) => {
      const previous = byMinute.get(marker.minutes)
      if (!previous || marker.y < previous.y) byMinute.set(marker.minutes, marker)
    })
    return [...byMinute.values()].sort((left, right) => left.minutes - right.minutes)
  }

  function createTimeMap(columns) {
    const minimumGridWidth = Math.max(700, window.innerWidth * 0.5)
    const timedRows = [...document.querySelectorAll('[role="grid"] [role="row"]')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width >= minimumGridWidth && rect.height >= 1200 && rect.height <= 6000 && rect.bottom > 0 && rect.top < window.innerHeight)
      .sort((left, right) => right.rect.height - left.rect.height)

    if (timedRows.length) {
      const timedGridRect = timedRows[0].rect
      const pixelsPerMinute = timedGridRect.height / (24 * 60)
      if (pixelsPerMinute >= 0.5 && pixelsPerMinute <= 4) {
        return (minutes) => timedGridRect.top + pixelsPerMinute * minutes
      }
    }

    const markers = findTimeMarkers(columns)
    if (markers.length < 2) return null

    const meanX = markers.reduce((sum, marker) => sum + marker.minutes, 0) / markers.length
    const meanY = markers.reduce((sum, marker) => sum + marker.y, 0) / markers.length
    const denominator = markers.reduce((sum, marker) => sum + ((marker.minutes - meanX) ** 2), 0)
    if (!denominator) return null
    const slope = markers.reduce((sum, marker) => sum + ((marker.minutes - meanX) * (marker.y - meanY)), 0) / denominator
    if (!Number.isFinite(slope) || slope <= 0.05 || slope > 10) return null
    const intercept = meanY - slope * meanX
    return (minutes) => intercept + slope * minutes
  }

  function clearRoot() {
    if (!state.root) return
    state.root.replaceChildren()
    state.root.hidden = true
  }

  function render() {
    if (!state.root) return
    clearRoot()
    if (!state.settings.enabled || !isWeekView()) return

    const titleDate = parseDateFromText(document.title)
    const weekStart = api.parseWeekStartFromUrl(location.href) || api.weekStartKey(titleDate) || api.weekStartKey(api.todayKey())
    if (!weekStart) return
    const columns = dateColumnsFor(weekStart)
    if (columns.length < 2) return
    const timeToY = createTimeMap(columns)
    if (!timeToY) return

    const periods = api.getPeriods(state.settings).filter((period) => {
      const start = api.parseTime(period.start)
      const end = api.parseTime(period.end)
      return period.enabled && start !== null && end !== null && end > start
    })
    if (!periods.length) return

    const fragment = document.createDocumentFragment()
    columns.forEach(({ dateKey, rect }) => {
      const date = api.dateFromKey(dateKey)
      if (!date || !state.settings.activeWeekdays.includes(date.getUTCDay())) return
      if (api.getExclusionReason(dateKey, state.settings, state.temporaryExclusions)) return

      periods.forEach((period) => {
        const start = api.parseTime(period.start)
        const end = api.parseTime(period.end)
        const top = timeToY(start)
        const bottom = timeToY(end)
        if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return
        if (bottom < 0 || top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return

        const block = document.createElement('div')
        block.className = `spl-period spl-density-${state.settings.display.density}`
        block.style.left = `${Math.max(0, rect.left)}px`
        block.style.top = `${Math.max(0, top)}px`
        block.style.width = `${Math.max(36, rect.width)}px`
        block.style.height = `${Math.max(18, bottom - top)}px`
        block.dataset.autoTheme = String(state.settings.display.autoTheme)
        block.dataset.showTime = String(state.settings.display.showTimeOnHover)

        const trigger = document.createElement('a')
        const labelStyle = state.settings.display.density === 'strong' ? 'period' : state.settings.display.labelStyle
        const label = api.formatLabel(period, labelStyle)
        const time = `${period.start}–${period.end}`
        trigger.className = 'spl-period-trigger'
        trigger.href = api.getEventUrl(dateKey, period.start, period.end, state.settings.timezone)
        trigger.textContent = label
        trigger.setAttribute('aria-label', `${api.formatJapaneseDate(dateKey, { weekday: 'long' })}${label} ${time}に予定を追加`)
        trigger.dataset.tooltip = `${api.formatJapaneseDate(dateKey, { weekday: 'long' })}${label} ${time}に予定を追加`
        trigger.title = trigger.dataset.tooltip
        trigger.dataset.time = time
        trigger.addEventListener('click', (event) => {
          event.stopPropagation()
        })

        block.appendChild(trigger)
        fragment.appendChild(block)
      })
    })

    state.root.appendChild(fragment)
    state.root.hidden = state.root.childElementCount === 0
  }

  function scheduleRender(delay = 120) {
    window.clearTimeout(state.renderTimer)
    state.renderTimer = window.setTimeout(render, delay)
  }

  function scheduleNavigationRender() {
    state.lastUrl = location.href
    scheduleRender(40)
    window.setTimeout(() => scheduleRender(0), 350)
  }

  async function loadState() {
    const stored = await chrome.storage.local.get(['settings', 'temporaryExclusions'])
    state.settings = api.normaliseSettings(stored.settings)
    state.temporaryExclusions = {
      dates: Array.isArray(stored.temporaryExclusions?.dates) ? stored.temporaryExclusions.dates : [],
      weeks: Array.isArray(stored.temporaryExclusions?.weeks) ? stored.temporaryExclusions.weeks : [],
    }
  }

  async function boot() {
    createRoot()
    await loadState()
    window.addEventListener('resize', () => scheduleRender(80), { passive: true })
    window.addEventListener('popstate', scheduleNavigationRender)
    window.addEventListener('pageshow', scheduleNavigationRender)
    document.addEventListener('scroll', () => scheduleRender(80), { capture: true, passive: true })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleNavigationRender()
    })
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) state.settings = api.normaliseSettings(changes.settings.newValue)
      if (changes.temporaryExclusions) {
        state.temporaryExclusions = changes.temporaryExclusions.newValue || { dates: [], weeks: [] }
      }
      scheduleRender(30)
    })

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !mutation.target.closest?.(`#${ROOT_ID}`))) scheduleRender()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'class', 'style'],
    })
    scheduleRender(250)
    window.setTimeout(() => scheduleRender(0), 1000)
    window.setInterval(() => {
      if (location.href !== state.lastUrl) scheduleNavigationRender()
    }, 500)
  }

  void boot()
}(window.SchoolPeriodLayer))
