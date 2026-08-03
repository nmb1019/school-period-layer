(function (api) {
  'use strict'

  const enabledToggle = document.getElementById('enabled-toggle')
  const weekHeading = document.getElementById('week-heading')
  const weekContext = document.getElementById('week-context')
  const temporaryState = document.getElementById('temporary-state')
  const hideTodayButton = document.getElementById('hide-today')
  const hideWeekButton = document.getElementById('hide-week')
  const showAgainButton = document.getElementById('show-again')
  const status = document.getElementById('status')
  const openSettingsButton = document.getElementById('open-settings')

  let activeWeek = api.weekStartKey(api.todayKey())
  let temporary = { dates: [], weeks: [] }

  function setStatus(message, error = false) {
    status.textContent = message
    status.classList.toggle('error', error)
  }

  function activeDateKey() {
    return api.todayKey()
  }

  function isTemporarilyHidden() {
    return temporary.dates.includes(activeDateKey()) || temporary.weeks.includes(activeWeek)
  }

  function updateTemporaryUi() {
    const hidden = isTemporarilyHidden()
    temporaryState.hidden = !hidden
    showAgainButton.hidden = !hidden
    hideTodayButton.disabled = temporary.dates.includes(activeDateKey())
    hideWeekButton.disabled = temporary.weeks.includes(activeWeek)
    if (!hidden) {
      hideTodayButton.removeAttribute('aria-disabled')
      hideWeekButton.removeAttribute('aria-disabled')
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    return tabs[0]
  }

  async function refresh() {
    const stored = await chrome.storage.local.get(['settings', 'temporaryExclusions'])
    const settings = api.normaliseSettings(stored.settings)
    temporary = {
      dates: Array.isArray(stored.temporaryExclusions?.dates) ? stored.temporaryExclusions.dates : [],
      weeks: Array.isArray(stored.temporaryExclusions?.weeks) ? stored.temporaryExclusions.weeks : [],
    }
    const tab = await getActiveTab()
    activeWeek = api.parseWeekStartFromUrl(tab?.url) || api.weekStartKey(api.todayKey())
    enabledToggle.checked = settings.enabled
    weekHeading.textContent = api.formatWeekRange(activeWeek)
    weekContext.textContent = tab?.url?.includes('/week')
      ? '校時ラベルをクリックすると、日時入りの予定作成画面を開きます。'
      : 'Googleカレンダーの週表示を開くと、ここに校時が重なります。'
    updateTemporaryUi()
    setStatus(settings.enabled ? '校時レイヤーは有効です。' : '校時レイヤーは全体OFFです。')
  }

  enabledToggle.addEventListener('change', async () => {
    const stored = await chrome.storage.local.get('settings')
    const settings = api.normaliseSettings(stored.settings)
    settings.enabled = enabledToggle.checked
    await chrome.storage.local.set({ settings })
    setStatus(settings.enabled ? '校時を表示します。' : 'すべての週で校時を隠します。')
  })

  hideTodayButton.addEventListener('click', async () => {
    const next = new Set(temporary.dates)
    next.add(activeDateKey())
    temporary.dates = [...next]
    await chrome.storage.local.set({ temporaryExclusions: temporary })
    setStatus('今日は校時を隠します。')
    updateTemporaryUi()
  })

  hideWeekButton.addEventListener('click', async () => {
    const next = new Set(temporary.weeks)
    next.add(activeWeek)
    temporary.weeks = [...next]
    await chrome.storage.local.set({ temporaryExclusions: temporary })
    setStatus('表示中の週は校時を隠します。')
    updateTemporaryUi()
  })

  showAgainButton.addEventListener('click', async () => {
    temporary.dates = temporary.dates.filter((date) => date !== activeDateKey())
    temporary.weeks = temporary.weeks.filter((week) => week !== activeWeek)
    await chrome.storage.local.set({ temporaryExclusions: temporary })
    setStatus('一時非表示を解除しました。')
    updateTemporaryUi()
  })

  openSettingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })

  void refresh().catch((error) => setStatus(error instanceof Error ? error.message : String(error), true))
}(window.SchoolPeriodLayer))
