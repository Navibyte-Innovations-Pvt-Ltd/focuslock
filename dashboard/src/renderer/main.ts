import './style.css'
import type { ActivityData, HourData } from '@shared/types'

const DISPLAY_HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function fmtMins(m: number): string {
  if (m === 0) return '0m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

function cellClass(hd: HourData, hour: number, isToday: boolean): string {
  const isFuture = isToday && hour > new Date().getHours()
  if (isFuture) return 'future'
  const hasCode = hd.commits > 0
  const hasDistr = hd.distrMins > 0
  if (hasCode && hasDistr) return 'both'
  if (hasCode) return hd.commits >= 5 ? 'code-heavy' : 'code-light'
  if (hasDistr) return 'distr'
  return ''
}

function renderTodayHeatmap(data: ActivityData): void {
  const todayHourly = data.last7[data.last7.length - 1].hourly
  const container = document.getElementById('today-heatmap')!
  container.innerHTML = ''
  const currentHour = new Date().getHours()

  for (const h of DISPLAY_HOURS) {
    const hd = todayHourly[h]
    const cls = cellClass(hd, h, true)
    const isNow = h === currentHour
    const tip = h > currentHour ? '' :
      `${hourLabel(h)}: ${hd.commits} commits${hd.distrMins ? `, ${hd.distrMins}m distracted` : ''}`

    const col = document.createElement('div')
    col.className = 'hm-col'

    const cell = document.createElement('div')
    cell.className = ['hm-cell', cls, isNow ? 'now' : ''].filter(Boolean).join(' ')
    if (tip) cell.title = tip

    const lbl = document.createElement('div')
    lbl.className = 'hm-label'
    lbl.textContent = hourLabel(h)

    col.append(cell, lbl)
    container.appendChild(col)
  }
}

function renderWeekGrid(data: ActivityData): void {
  const container = document.getElementById('week-grid')!
  container.innerHTML = ''

  data.last7.forEach((day, idx) => {
    const isToday = idx === data.last7.length - 1
    const d = new Date(`${day.date}T12:00:00`)

    const col = document.createElement('div')
    col.className = 'day-col'

    for (const h of DISPLAY_HOURS) {
      const cell = document.createElement('div')
      const cls = cellClass(day.hourly[h], h, isToday)
      cell.className = ['hm-cell', cls].filter(Boolean).join(' ')
      col.appendChild(cell)
    }

    const lbl = document.createElement('div')
    lbl.className = 'day-label' + (isToday ? ' today' : '')
    lbl.textContent = isToday ? 'Today' : DAYS_SHORT[d.getDay()]
    col.appendChild(lbl)

    container.appendChild(col)
  })
}

function renderInsights(data: ActivityData): void {
  const container = document.getElementById('insights')!
  container.innerHTML = ''

  const add = (dotCls: string, html: string): void => {
    const row = document.createElement('div')
    row.className = 'insight'
    row.innerHTML = `<div class="insight-dot ${dotCls}"></div><div class="insight-text">${html}</div>`
    container.appendChild(row)
  }

  if (data.hotZones.length > 0) {
    const hrs = data.hotZones.map(hourLabel).join(', ')
    add('dot-hot', `Most productive hours: <strong>${hrs}</strong>`)
  }

  if (data.deadZones.length > 0) {
    const hrs = data.deadZones.map(hourLabel).join(', ')
    add('dot-dead', `Usually idle: <strong>${hrs}</strong> — good for breaks`)
  }

  if (data.todayDistrMins >= 120) {
    add('dot-alert', `${fmtMins(data.todayDistrMins)} distracted today`)
  } else if (data.todayDistrMins === 0 && data.todayCommits > 0) {
    add('dot-hot', `Zero distraction today`)
  }
}

function render(data: ActivityData): void {
  const now = new Date()

  document.getElementById('date-label')!.textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  document.getElementById('commits-today')!.textContent = String(data.todayCommits)
  document.getElementById('distr-today')!.textContent = fmtMins(data.todayDistrMins)
  document.getElementById('distr-count')!.textContent = `${data.todayDistrCount}×`

  renderTodayHeatmap(data)
  renderWeekGrid(data)
  renderInsights(data)

  document.getElementById('loading')!.style.display = 'none'
  document.getElementById('app')!.style.display = 'block'
}

window.api.getActivity().then(render)
window.api.onRefresh(render)
