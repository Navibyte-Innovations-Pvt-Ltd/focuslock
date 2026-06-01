import './style.css'
import type { ActivityData, DistrSite, HourData, ProjectCommits } from '@shared/types'

type FilterPeriod = 'today' | 'week' | 'month'

const DISPLAY_HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

let currentFilter: FilterPeriod = 'today'

// ── Formatters ──────────────────────────────────────────────────────────────

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function fmtMins(m: number): string {
  if (m === 0) return '0m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

// ── Cell class ───────────────────────────────────────────────────────────────

function cellClass(hd: HourData, hour: number, isToday: boolean): string {
  const isFuture = isToday && hour > new Date().getHours()
  if (isFuture) return 'future'
  const { commits, distrMins } = hd
  if (commits > 0 && distrMins > 0) return 'both'
  if (commits >= 5) return 'code-heavy'
  if (commits > 0) return 'code-light'
  if (distrMins > 0) return 'distr'
  return ''
}

// ── Stats row ────────────────────────────────────────────────────────────────

function renderStats(data: ActivityData, filter: FilterPeriod): void {
  const days = filter === 'today' ? [data.last30[29]]
    : filter === 'week' ? data.last7
    : data.last30

  const commits = days.reduce((s, d) => s + d.hourly.reduce((hS, h) => hS + h.commits, 0), 0)
  const distrMins = days.reduce((s, d) => s + d.hourly.reduce((hS, h) => hS + h.distrMins, 0), 0)

  const focusEvents = (() => {
    if (filter === 'today') return data.todayDistrCount
    const cutoff = days[0].date
    return data.focuslockLog.split('\n').filter(l => l >= cutoff).length
  })()

  const labels = { today: 'Commits today', week: 'Commits this week', month: 'Commits this month' }
  document.getElementById('commits-label')!.textContent = labels[filter]
  document.getElementById('commits-val')!.textContent = String(filter === 'today' ? data.todayCommits : commits)
  document.getElementById('distr-val')!.textContent = fmtMins(filter === 'today' ? data.todayDistrMins : distrMins)
  document.getElementById('unlocks-val')!.textContent = `${filter === 'today' ? data.todayDistrCount : focusEvents}×`
}

// ── Today heatmap ────────────────────────────────────────────────────────────

function renderTodayHeatmap(data: ActivityData): void {
  const todayHourly = data.last30[29].hourly
  const container = document.getElementById('today-heatmap')!
  container.innerHTML = ''
  const now = new Date().getHours()

  for (const h of DISPLAY_HOURS) {
    const hd = todayHourly[h]
    const cls = cellClass(hd, h, true)
    const tip = h > now ? '' : `${hourLabel(h)}: ${hd.commits} commits${hd.distrMins ? `, ${hd.distrMins}m distr` : ''}`
    const col = document.createElement('div')
    col.className = 'hm-col'
    const cell = document.createElement('div')
    cell.className = ['hm-cell', cls, h === now ? 'now' : ''].filter(Boolean).join(' ')
    if (tip) cell.title = tip
    const lbl = document.createElement('div')
    lbl.className = 'hm-label'
    lbl.textContent = hourLabel(h)
    col.append(cell, lbl)
    container.appendChild(col)
  }
}

// ── 7-day grid ───────────────────────────────────────────────────────────────

function renderWeekGrid(data: ActivityData): void {
  const container = document.getElementById('week-grid')!
  container.innerHTML = ''
  const now = new Date().getHours()

  data.last7.forEach((day, idx) => {
    const isToday = idx === data.last7.length - 1
    const d = new Date(`${day.date}T12:00:00`)
    const col = document.createElement('div')
    col.className = 'day-col'

    for (const h of DISPLAY_HOURS) {
      const cell = document.createElement('div')
      const isFuture = isToday && h > now
      const hd = day.hourly[h]
      cell.className = ['hm-cell', isFuture ? 'future' : cellClass(hd, h, false)].filter(Boolean).join(' ')
      col.appendChild(cell)
    }

    const lbl = document.createElement('div')
    lbl.className = 'day-label' + (isToday ? ' today' : '')
    lbl.textContent = isToday ? 'Today' : DAYS_SHORT[d.getDay()]
    col.appendChild(lbl)
    container.appendChild(col)
  })
}

// ── 30-day bar chart ─────────────────────────────────────────────────────────

function renderMonthChart(data: ActivityData): void {
  const chart = document.getElementById('month-chart')!
  const labels = document.getElementById('month-labels')!
  chart.innerHTML = ''
  labels.innerHTML = ''

  const maxCommits = Math.max(1, ...data.last30.map(d => d.hourly.reduce((s, h) => s + h.commits, 0)))

  data.last30.forEach((day, idx) => {
    const commits = day.hourly.reduce((s, h) => s + h.commits, 0)
    const distr = day.hourly.reduce((s, h) => s + h.distrMins, 0)
    const pct = Math.max(3, Math.round((commits / maxCommits) * 100))

    const bar = document.createElement('div')
    bar.className = ['month-bar',
      commits === 0 ? '' : commits < 10 ? 'has-code' : commits < 30 ? 'code-mid' : 'code-heavy',
      distr > 0 ? 'has-distr' : '',
    ].filter(Boolean).join(' ')
    bar.style.height = `${pct}%`
    bar.title = `${fmtDate(day.date)}: ${commits} commits${distr ? `, ${fmtMins(distr)} distracted` : ''}`
    chart.appendChild(bar)

    // Label every 7 days
    if (idx % 7 === 0 || idx === 29) {
      const lbl = document.createElement('div')
      lbl.className = 'month-label'
      lbl.textContent = fmtDate(day.date)
      labels.appendChild(lbl)
    }
  })
}

// ── Distraction sites ────────────────────────────────────────────────────────

function renderDistrSites(sites: DistrSite[]): void {
  const container = document.getElementById('distr-sites')!
  container.innerHTML = ''

  if (sites.length === 0) {
    const el = document.createElement('div')
    el.className = 'project-empty'
    el.textContent = 'No distractions today 🎯'
    container.appendChild(el)
    return
  }

  const maxMins = sites[0].mins
  for (const s of sites) {
    const pct = Math.round((s.mins / maxMins) * 100)
    const row = document.createElement('div')
    row.className = 'project-row'
    row.title = `${s.sessions} session${s.sessions > 1 ? 's' : ''}`
    row.innerHTML = `
      <div class="project-name">${s.site}</div>
      <div class="project-bar-track">
        <div class="project-bar-fill red" style="width:${pct}%"></div>
      </div>
      <div class="project-count">${fmtMins(s.mins)}</div>
    `
    container.appendChild(row)
  }
}

// ── Project list ─────────────────────────────────────────────────────────────

function renderProjects(projects: ProjectCommits[], titleId: string, listId: string, title: string): void {
  document.getElementById(titleId)!.textContent = title
  const container = document.getElementById(listId)!
  container.innerHTML = ''

  if (projects.length === 0) {
    const el = document.createElement('div')
    el.className = 'project-empty'
    el.textContent = 'No commits in this period'
    container.appendChild(el)
    return
  }

  const max = projects[0].commits
  for (const p of projects) {
    const pct = Math.round((p.commits / max) * 100)
    const row = document.createElement('div')
    row.className = 'project-row'
    row.innerHTML = `
      <div class="project-name" title="${p.name}">${p.name}</div>
      <div class="project-bar-track"><div class="project-bar-fill" style="width:${pct}%"></div></div>
      <div class="project-count">${p.commits}</div>
    `
    container.appendChild(row)
  }
}

// ── Insights ─────────────────────────────────────────────────────────────────

function renderInsights(data: ActivityData): void {
  const container = document.getElementById('insights')!
  container.innerHTML = ''

  const add = (dot: string, html: string): void => {
    const el = document.createElement('div')
    el.className = 'insight'
    el.innerHTML = `<div class="insight-dot ${dot}"></div><div class="insight-text">${html}</div>`
    container.appendChild(el)
  }

  if (data.hotZones.length > 0) {
    add('dot-hot', `Peak hours: <strong>${data.hotZones.map(hourLabel).join(', ')}</strong>`)
  }
  if (data.deadZones.length > 0) {
    add('dot-dead', `Usually idle: <strong>${data.deadZones.map(hourLabel).join(', ')}</strong>`)
  }

  // Streak
  const streak = (() => {
    let s = 0
    for (let i = data.last30.length - 1; i >= 0; i--) {
      const commits = data.last30[i].hourly.reduce((acc, h) => acc + h.commits, 0)
      if (commits > 0) s++; else break
    }
    return s
  })()
  if (streak > 1) add('dot-info', `${streak}-day coding streak`)

  // Best day of week (from last 30 days)
  const dayTotals = new Array<number>(7).fill(0)
  const dayCounts = new Array<number>(7).fill(0)
  for (const day of data.last30) {
    const commits = day.hourly.reduce((s, h) => s + h.commits, 0)
    const dow = new Date(`${day.date}T12:00:00`).getDay()
    dayTotals[dow] += commits; dayCounts[dow]++
  }
  const dayAvg = dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0)
  const bestDow = dayAvg.indexOf(Math.max(...dayAvg))
  if (dayAvg[bestDow] > 0) {
    add('dot-hot', `Best day: <strong>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][bestDow]}</strong> (avg ${Math.round(dayAvg[bestDow])} commits)`)
  }

  if (data.todayDistrMins >= 120) {
    add('dot-alert', `${fmtMins(data.todayDistrMins)} distracted today — above average`)
  }
}

// ── Copy report ───────────────────────────────────────────────────────────────

function buildReport(data: ActivityData, filter: FilterPeriod): string {
  const days = filter === 'today' ? [data.last30[29]]
    : filter === 'week' ? data.last7
    : data.last30

  const projects = filter === 'today' ? data.todayProjects
    : filter === 'week' ? data.weekProjects
    : data.monthProjects

  const totalCommits = days.reduce((s, d) => s + d.hourly.reduce((hS, h) => hS + h.commits, 0), 0)
  const totalDistr = days.reduce((s, d) => s + d.hourly.reduce((hS, h) => hS + h.distrMins, 0), 0)
  const periodLabel = filter === 'today' ? `Today (${data.today})`
    : filter === 'week' ? `This Week (${days[0].date} – ${data.today})`
    : `This Month (${days[0].date} – ${data.today})`

  const lines: string[] = [
    '# FocusLock Activity Report',
    `Period: ${periodLabel}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '## Summary',
    `- Commits: ${filter === 'today' ? data.todayCommits : totalCommits}`,
    `- Distraction: ${fmtMins(filter === 'today' ? data.todayDistrMins : totalDistr)}`,
    `- Distraction sessions: ${filter === 'today' ? data.todayDistrCount : '(see log below)'}`,
    '',
    '## Projects',
    ...projects.map((p, i) => `${i + 1}. ${p.name.padEnd(24)} ${p.commits} commits`),
    '',
    '## Daily Breakdown',
    ...days.map(d => {
      const c = d.hourly.reduce((s, h) => s + h.commits, 0)
      const dm = d.hourly.reduce((s, h) => s + h.distrMins, 0)
      return `${d.date}  ${String(c).padStart(4)} commits  ${dm > 0 ? fmtMins(dm) + ' distracted' : 'clean'}`
    }),
    '',
    '## Habit Patterns',
    `Peak hours: ${data.hotZones.map(hourLabel).join(', ') || 'N/A'}`,
    `Dead zones: ${data.deadZones.map(hourLabel).join(', ') || 'N/A'}`,
    '',
    '## Distraction Log (last 60 events)',
    data.focuslockLog || '(no events)',
  ]

  return lines.join('\n')
}

async function handleCopy(data: ActivityData): Promise<void> {
  if (!window.api) return
  const btn = document.getElementById('copy-btn')!
  const text = buildReport(data, currentFilter)
  await window.api.copyReport(text)
  btn.classList.add('copied')
  const lbl = btn.querySelector('.copy-label')!
  lbl.textContent = 'Copied!'
  setTimeout(() => { btn.classList.remove('copied'); lbl.textContent = 'Copy' }, 2000)
}

// ── Filter switching ──────────────────────────────────────────────────────────

function showFilter(filter: FilterPeriod, data: ActivityData): void {
  currentFilter = filter

  // Toggle filter tab active state
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.filter === filter)
  })

  // Show/hide sections
  document.getElementById('section-today-heatmap')!.style.display = filter === 'today' ? '' : 'none'
  document.getElementById('section-week-grid')!.style.display = filter === 'week' ? '' : 'none'
  document.getElementById('section-month-chart')!.style.display = filter === 'month' ? '' : 'none'
  document.getElementById('section-distractions')!.style.display = filter === 'today' ? '' : 'none'

  // Update stats
  renderStats(data, filter)

  // Update projects
  const projects = filter === 'today' ? data.todayProjects
    : filter === 'week' ? data.weekProjects
    : data.monthProjects
  const title = filter === 'today' ? "Today's work"
    : filter === 'week' ? "This week"
    : "This month"
  renderProjects(projects, 'projects-title', 'projects-list', title)
}

// ── Main render ──────────────────────────────────────────────────────────────

function render(data: ActivityData): void {

  document.getElementById('date-label')!.textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  renderTodayHeatmap(data)
  renderWeekGrid(data)
  renderMonthChart(data)
  renderDistrSites(data.todayDistrSites)
  renderInsights(data)
  showFilter(currentFilter, data)

  // Filter buttons
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      showFilter((btn as HTMLElement).dataset.filter as FilterPeriod, data)
    })
  })

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn')!
  refreshBtn.addEventListener('click', async () => {
    if (!window.api) return
    refreshBtn.classList.add('spinning')
    const fresh = await window.api.refreshActivity()
    refreshBtn.classList.remove('spinning')
    render(fresh)
  })

  // Copy button
  document.getElementById('copy-btn')!.addEventListener('click', () => handleCopy(data))

  document.getElementById('loading')!.style.display = 'none'
  document.getElementById('app')!.style.display = 'block'
}

// ── Boot ─────────────────────────────────────────────────────────────────────

if (!window.api) {
  document.getElementById('loading')!.textContent = 'Open in Electron — not a browser app. Run: bun dev'
} else {
  window.api.getActivity().then(render)
  window.api.onRefresh(data => render(data))
}
