(function (api) {
  'use strict'

  const form = document.getElementById('settings-form')
  const enabledInput = document.getElementById('enabled-input')
  const weekdayOptions = document.getElementById('weekday-options')
  const timezoneInput = document.getElementById('timezone-input')
  const periodRows = document.getElementById('period-rows')
  const rangeList = document.getElementById('range-list')
  const rangeEmpty = document.getElementById('range-empty')
  const saveStatusText = document.getElementById('save-status-text')
  const dialog = document.getElementById('range-dialog')
  const rangeForm = document.getElementById('range-form')
  const rangeNameInput = document.getElementById('range-name-input')
  const rangeStartInput = document.getElementById('range-start-input')
  const rangeEndInput = document.getElementById('range-end-input')
  const rangeFormError = document.getElementById('range-form-error')
  const addRangeButton = document.getElementById('add-range-button')
  const cancelRangeButton = document.getElementById('cancel-range-button')
  const resetButton = document.getElementById('reset-button')

  let settings = api.normaliseSettings(null)
  let editingRangeId = null
  let saveTimer = null

  function setSaveStatus(message, error = false) {
    saveStatusText.textContent = message
    saveStatusText.parentElement.classList.toggle('is-error', error)
  }

  function getPeriodsFromForm() {
    return [...periodRows.querySelectorAll('.period-row')].map((row) => ({
      id: row.dataset.periodId,
      label: row.querySelector('.period-name').textContent,
      enabled: row.querySelector('.period-enabled').checked,
      start: row.querySelector('.period-start').value,
      end: row.querySelector('.period-end').value,
    }))
  }

  function updateRowState(row) {
    const enabled = row.querySelector('.period-enabled').checked
    row.querySelector('.period-start').disabled = !enabled
    row.querySelector('.period-end').disabled = !enabled
  }

  function applyPeriodErrors(errors) {
    periodRows.querySelectorAll('.period-row').forEach((row) => {
      const error = errors[row.dataset.periodId] || ''
      row.classList.toggle('is-error', Boolean(error))
      row.querySelector('.row-error').textContent = error
      ;[row.querySelector('.period-start'), row.querySelector('.period-end')].forEach((field) => {
        if (error) field.setAttribute('aria-invalid', 'true')
        else field.removeAttribute('aria-invalid')
      })
    })
  }

  function renderWeekdays() {
    weekdayOptions.replaceChildren()
    api.WEEKDAY_LABELS.forEach((label, day) => {
      const wrapper = document.createElement('label')
      const input = document.createElement('input')
      const text = document.createElement('span')
      input.type = 'checkbox'
      input.value = String(day)
      input.checked = settings.activeWeekdays.includes(day)
      input.id = `weekday-${day}`
      input.setAttribute('aria-label', `${label}曜日`)
      text.textContent = label
      wrapper.title = `${label}曜日`
      wrapper.append(input, text)
      weekdayOptions.appendChild(wrapper)
    })
  }

  function renderPeriods() {
    periodRows.replaceChildren()
    api.getPeriods(settings).forEach((period) => {
      const row = document.createElement('tr')
      row.className = 'period-row'
      row.dataset.periodId = period.id
      row.innerHTML = `
        <td><input class="period-enabled" type="checkbox" aria-label="${period.label}を使用" ${period.enabled ? 'checked' : ''}></td>
        <td class="period-name">${period.label}</td>
        <td><label class="sr-only" for="${period.id}-start">${period.label}の開始時刻</label><input id="${period.id}-start" class="period-start" type="time" value="${period.start}" step="60"></td>
        <td><label class="sr-only" for="${period.id}-end">${period.label}の終了時刻</label><input id="${period.id}-end" class="period-end" type="time" value="${period.end}" step="60"></td>
        <td class="duration">${api.formatDuration(period.start, period.end)}</td>
        <td><span class="row-error" role="alert"></span></td>`
      periodRows.appendChild(row)
      updateRowState(row)
    })
  }

  function renderRanges() {
    rangeList.replaceChildren()
    const ranges = [...settings.exclusionRanges].sort((left, right) => left.startDate.localeCompare(right.startDate))
    rangeEmpty.hidden = ranges.length > 0
    ranges.forEach((range) => {
      const item = document.createElement('article')
      item.className = 'range-item'
      const body = document.createElement('div')
      const name = document.createElement('p')
      const date = document.createElement('p')
      name.className = 'range-name'
      name.textContent = range.name
      date.className = 'range-date'
      date.textContent = `${range.startDate.replaceAll('-', '/')} 〜 ${range.endDate.replaceAll('-', '/')}`
      body.append(name, date)
      const actions = document.createElement('div')
      actions.className = 'range-actions'
      const edit = document.createElement('button')
      edit.type = 'button'
      edit.textContent = '編集'
      edit.addEventListener('click', () => openRangeDialog(range))
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.textContent = '削除'
      remove.addEventListener('click', () => void removeRange(range.id))
      actions.append(edit, remove)
      item.append(body, actions)
      rangeList.appendChild(item)
    })
  }

  function render() {
    enabledInput.checked = settings.enabled
    timezoneInput.value = settings.timezone
    document.querySelectorAll('input[name="density"]').forEach((input) => { input.checked = input.value === settings.display.density })
    document.getElementById('show-time-input').checked = settings.display.showTimeOnHover
    document.getElementById('auto-theme-input').checked = settings.display.autoTheme
    document.getElementById('label-style-input').checked = settings.display.labelStyle === 'period'
    renderWeekdays()
    renderPeriods()
    renderRanges()
  }

  function draftFromForm() {
    const draft = api.normaliseSettings(settings)
    draft.enabled = enabledInput.checked
    draft.timezone = timezoneInput.value
    draft.activeWeekdays = [...weekdayOptions.querySelectorAll('input:checked')].map((input) => Number(input.value))
    draft.profiles[0].periods = getPeriodsFromForm()
    draft.display.density = document.querySelector('input[name="density"]:checked')?.value || 'standard'
    draft.display.showTimeOnHover = document.getElementById('show-time-input').checked
    draft.display.autoTheme = document.getElementById('auto-theme-input').checked
    draft.display.labelStyle = document.getElementById('label-style-input').checked ? 'period' : 'number'
    return draft
  }

  async function saveFromForm() {
    const draft = draftFromForm()
    const validation = api.validatePeriods(draft.profiles[0].periods)
    applyPeriodErrors(validation.errors)
    if (!validation.valid) {
      setSaveStatus('入力内容を確認してください。', true)
      return false
    }
    settings = draft
    await chrome.storage.local.set({ settings })
    setSaveStatus('保存しました。')
    return true
  }

  function queueSave() {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => { void saveFromForm() }, 220)
  }

  function openRangeDialog(range = null) {
    editingRangeId = range?.id || null
    rangeNameInput.value = range?.name || ''
    rangeStartInput.value = range?.startDate || ''
    rangeEndInput.value = range?.endDate || ''
    rangeFormError.textContent = ''
    dialog.showModal()
    window.setTimeout(() => rangeNameInput.focus(), 0)
  }

  function closeRangeDialog() {
    if (dialog.open) dialog.close()
    editingRangeId = null
  }

  async function saveRange(event) {
    event.preventDefault()
    const name = rangeNameInput.value.trim()
    const startDate = rangeStartInput.value
    const endDate = rangeEndInput.value
    if (!name || !startDate || !endDate) {
      rangeFormError.textContent = '名前・開始日・終了日を入力してください。'
      return
    }
    if (endDate < startDate) {
      rangeFormError.textContent = '終了日を開始日より後にしてください。'
      rangeEndInput.focus()
      return
    }
    const next = { id: editingRangeId || `range-${Date.now()}`, name, startDate, endDate }
    const ranges = settings.exclusionRanges.filter((range) => range.id !== editingRangeId)
    ranges.push(next)
    settings = api.normaliseSettings({ ...settings, exclusionRanges: ranges })
    await chrome.storage.local.set({ settings })
    renderRanges()
    setSaveStatus('保存しました。')
    closeRangeDialog()
  }

  async function removeRange(id) {
    const target = settings.exclusionRanges.find((range) => range.id === id)
    if (!target || !window.confirm(`「${target.name}」を削除しますか？`)) return
    settings = api.normaliseSettings({ ...settings, exclusionRanges: settings.exclusionRanges.filter((range) => range.id !== id) })
    await chrome.storage.local.set({ settings })
    renderRanges()
    setSaveStatus('削除しました。')
  }

  async function resetSettings() {
    if (!window.confirm('すべての設定を初期値へ戻しますか？')) return
    settings = api.normaliseSettings(null)
    await chrome.storage.local.set({ settings })
    render()
    setSaveStatus('初期設定に戻しました。')
  }

  form.addEventListener('input', (event) => {
    if (event.target.matches('.period-start, .period-end')) {
      const row = event.target.closest('.period-row')
      row.querySelector('.duration').textContent = api.formatDuration(row.querySelector('.period-start').value, row.querySelector('.period-end').value)
    }
    queueSave()
  })
  form.addEventListener('change', (event) => {
    if (event.target.matches('.period-enabled')) updateRowState(event.target.closest('.period-row'))
    queueSave()
  })
  addRangeButton.addEventListener('click', () => openRangeDialog())
  cancelRangeButton.addEventListener('click', closeRangeDialog)
  rangeForm.addEventListener('submit', (event) => { void saveRange(event) })
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeRangeDialog() })
  resetButton.addEventListener('click', () => { void resetSettings() })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && dialog.open) closeRangeDialog() })

  async function boot() {
    const stored = await chrome.storage.local.get('settings')
    settings = api.normaliseSettings(stored.settings)
    render()
    setSaveStatus('準備完了')
  }

  void boot().catch((error) => setSaveStatus(error instanceof Error ? error.message : String(error), true))
}(window.SchoolPeriodLayer))
