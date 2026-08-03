(function () {
  'use strict'

  const defaultPeriods = [
    ['08:40', '09:30'],
    ['09:40', '10:30'],
    ['10:40', '11:30'],
    ['11:40', '12:30'],
    ['13:15', '14:05'],
    ['14:15', '15:05'],
    ['15:15', '16:05'],
  ].map(([start, end], index) => ({
    id: `period-${index + 1}`,
    label: `${index + 1}限`,
    enabled: true,
    start,
    end,
  }))

  const DEFAULT_SETTINGS = {
    version: 1,
    enabled: true,
    timezone: 'Asia/Tokyo',
    activeWeekdays: [1, 2, 3, 4, 5],
    defaultProfileId: 'normal',
    profiles: [{
      id: 'normal',
      name: '通常校時',
      periods: defaultPeriods,
    }],
    exclusionRanges: [],
    display: {
      density: 'standard',
      labelStyle: 'number',
      showTimeOnHover: true,
      autoTheme: true,
    },
  }

  const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function normalisePeriods(periods) {
    const source = Array.isArray(periods) && periods.length ? periods : defaultPeriods
    return source.slice(0, 7).map((period, index) => ({
      id: period.id || `period-${index + 1}`,
      label: period.label || `${index + 1}限`,
      enabled: period.enabled !== false,
      start: typeof period.start === 'string' ? period.start : '',
      end: typeof period.end === 'string' ? period.end : '',
    }))
  }

  function normaliseSettings(raw) {
    const value = raw && typeof raw === 'object' ? raw : {}
    const profile = Array.isArray(value.profiles)
      ? value.profiles.find((item) => item && item.id === (value.defaultProfileId || 'normal')) || value.profiles[0]
      : null
    const periods = normalisePeriods(profile && profile.periods)

    return {
      ...clone(DEFAULT_SETTINGS),
      ...value,
      version: 1,
      enabled: value.enabled !== false,
      timezone: typeof value.timezone === 'string' && value.timezone ? value.timezone : DEFAULT_SETTINGS.timezone,
      activeWeekdays: Array.isArray(value.activeWeekdays)
        ? value.activeWeekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : clone(DEFAULT_SETTINGS.activeWeekdays),
      defaultProfileId: 'normal',
      profiles: [{
        id: 'normal',
        name: '通常校時',
        periods,
      }],
      exclusionRanges: Array.isArray(value.exclusionRanges)
        ? value.exclusionRanges.filter((range) => range && range.startDate && range.endDate).map((range, index) => ({
          id: range.id || `range-${Date.now()}-${index}`,
          name: typeof range.name === 'string' && range.name.trim() ? range.name.trim() : '休業期間',
          startDate: range.startDate,
          endDate: range.endDate,
        }))
        : [],
      display: {
        ...clone(DEFAULT_SETTINGS.display),
        ...(value.display && typeof value.display === 'object' ? value.display : {}),
        density: ['subtle', 'standard', 'strong'].includes(value.display?.density)
          ? value.display.density
          : DEFAULT_SETTINGS.display.density,
        labelStyle: ['number', 'period'].includes(value.display?.labelStyle)
          ? value.display.labelStyle
          : DEFAULT_SETTINGS.display.labelStyle,
        showTimeOnHover: value.display?.showTimeOnHover !== false,
        autoTheme: value.display?.autoTheme !== false,
      },
    }
  }

  function getPeriods(settings) {
    const profile = settings.profiles?.find((item) => item.id === settings.defaultProfileId) || settings.profiles?.[0]
    return normalisePeriods(profile?.periods)
  }

  function parseTime(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null
    const [hours, minutes] = value.split(':').map(Number)
    if (hours > 23 || minutes > 59) return null
    return hours * 60 + minutes
  }

  function formatDuration(start, end) {
    const startMinutes = parseTime(start)
    const endMinutes = parseTime(end)
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return '—'
    return `${endMinutes - startMinutes}分`
  }

  function validatePeriods(periods) {
    const errors = {}
    const parsed = []

    periods.forEach((period) => {
      if (!period.enabled) return
      const start = parseTime(period.start)
      const end = parseTime(period.end)
      if (start === null || end === null) {
        errors[period.id] = '開始時刻と終了時刻を入力してください。'
        return
      }
      if (start === end) {
        errors[period.id] = '開始時刻と終了時刻を別にしてください。'
        return
      }
      if (end < start) {
        errors[period.id] = '終了時刻を開始時刻より後にしてください。'
        return
      }
      parsed.push({ period, start, end })
    })

    parsed.sort((left, right) => left.start - right.start)
    for (let index = 1; index < parsed.length; index += 1) {
      const previous = parsed[index - 1]
      const current = parsed[index]
      if (current.start < previous.end) {
        errors[current.period.id] = `${current.period.label}の時間が${previous.period.label}と重複しています。`
        if (!errors[previous.period.id]) {
          errors[previous.period.id] = `${previous.period.label}の時間が${current.period.label}と重複しています。`
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors }
  }

  function parseDateKey(value) {
    if (value instanceof Date) {
      return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
    }
    if (typeof value !== 'string') return null
    const match = value.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function dateFromKey(key) {
    const parsed = parseDateKey(key)
    if (!parsed) return null
    const [year, month, day] = parsed.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }

  function todayKey() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  function weekStartKey(value) {
    const date = dateFromKey(parseDateKey(value))
    if (!date) return null
    const day = date.getUTCDay()
    date.setUTCDate(date.getUTCDate() - day)
    return parseDateKey(date)
  }

  function addDays(key, amount) {
    const date = dateFromKey(key)
    if (!date) return null
    date.setUTCDate(date.getUTCDate() + amount)
    return parseDateKey(date)
  }

  function formatJapaneseDate(key, options = {}) {
    const date = dateFromKey(key)
    if (!date) return ''
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'UTC',
      month: options.month || 'numeric',
      day: options.day || 'numeric',
      weekday: options.weekday || undefined,
    }).format(date)
  }

  function formatWeekRange(startKey) {
    const endKey = addDays(startKey, 6)
    if (!startKey || !endKey) return ''
    return `${formatJapaneseDate(startKey)}〜${formatJapaneseDate(endKey)}`
  }

  function parseWeekStartFromUrl(url) {
    if (typeof url !== 'string') return null
    const match = url.match(/\/week\/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
    if (!match) return null
    return weekStartKey(`${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`)
  }

  function isDateInRange(key, startDate, endDate) {
    return Boolean(key && startDate && endDate && key >= startDate && key <= endDate)
  }

  function getExclusionReason(key, settings, temporary = {}) {
    const range = settings.exclusionRanges.find((item) => isDateInRange(key, item.startDate, item.endDate))
    if (range) return range.name
    if (temporary.dates?.includes(key)) return '一時非表示'
    if (temporary.weeks?.includes(weekStartKey(key))) return '今週だけ非表示'
    return null
  }

  function getEventUrl(key, start, end, timezone) {
    const compact = (time) => `${key.replaceAll('-', '')}T${time.replace(':', '')}00`
    const dates = `${compact(start)}/${compact(end)}`
    return `https://calendar.google.com/calendar/u/0/r/eventedit?dates=${dates}&ctz=${encodeURIComponent(timezone || 'Asia/Tokyo')}`
  }

  function formatLabel(period, labelStyle) {
    return labelStyle === 'period' ? period.label : period.label.replace(/限$/, '')
  }

  window.SchoolPeriodLayer = {
    DEFAULT_SETTINGS,
    WEEKDAY_LABELS,
    addDays,
    dateFromKey,
    formatDuration,
    formatJapaneseDate,
    formatLabel,
    formatWeekRange,
    getEventUrl,
    getExclusionReason,
    getPeriods,
    normaliseSettings,
    parseDateKey,
    parseTime,
    parseWeekStartFromUrl,
    todayKey,
    validatePeriods,
    weekStartKey,
  }
}())
