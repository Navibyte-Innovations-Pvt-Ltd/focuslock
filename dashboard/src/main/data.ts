import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { spawnSync } from 'child_process'
import type { ActivityData, DayActivity, DistrSite, FocuslockEvent, HourData, ProjectCommits } from '@shared/types'

const HISTORY_LOG = '/var/db/focuslock/history.log'
const CODING_LINE = join(homedir(), 'coding-line')

function parseFocuslockHistory(): FocuslockEvent[] {
  try {
    const raw = readFileSync(HISTORY_LOG, 'utf8')
    const events: FocuslockEvent[] = []
    for (const line of raw.trim().split('\n')) {
      const m = line.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):\d{2}:\d{2} \| ALLOW (\d+)m: (.+)/)
      if (m) {
        events.push({
          date: m[1],
          hour: parseInt(m[2], 10),
          durationMins: parseInt(m[3], 10),
          sites: m[4].trim().split(/\s+/),
        })
      }
    }
    return events
  } catch {
    return []
  }
}

function readFocuslockLog(): string {
  try {
    const raw = readFileSync(HISTORY_LOG, 'utf8')
    return raw.trim().split('\n').filter(l => l.includes('ALLOW')).slice(-60).join('\n')
  } catch {
    return ''
  }
}

interface GitData {
  byDateHour: Record<string, number>
  byProjectDate: Record<string, Record<string, number>>
}

function getGitData(dayCount: number): GitData {
  const byDateHour: Record<string, number> = {}
  const byProjectDate: Record<string, Record<string, number>> = {}

  let dirs: string[]
  try { dirs = readdirSync(CODING_LINE) } catch { return { byDateHour, byProjectDate } }

  for (const dir of dirs) {
    const repoPath = join(CODING_LINE, dir)
    try { statSync(join(repoPath, '.git')) } catch { continue }

    const result = spawnSync(
      'git',
      ['log', '--format=%ad', `--date=format:%Y-%m-%d %H`, `--since=${dayCount} days ago`],
      { cwd: repoPath, encoding: 'utf8', timeout: 4000 }
    )
    if (result.status !== 0 || !result.stdout) continue

    for (const line of result.stdout.trim().split('\n')) {
      const key = line.trim()
      if (!key) continue
      byDateHour[key] = (byDateHour[key] ?? 0) + 1
      const date = key.slice(0, 10)
      if (!byProjectDate[dir]) byProjectDate[dir] = {}
      byProjectDate[dir][date] = (byProjectDate[dir][date] ?? 0) + 1
    }
  }

  return { byDateHour, byProjectDate }
}

function buildHourlyForDate(
  gitMap: Record<string, number>,
  focusEvents: FocuslockEvent[],
  dateStr: string
): HourData[] {
  const hourly: HourData[] = Array.from({ length: 24 }, () => ({ commits: 0, distrMins: 0 }))
  for (const [key, count] of Object.entries(gitMap)) {
    if (key.startsWith(dateStr)) {
      const h = parseInt(key.slice(11, 13), 10)
      if (h >= 0 && h < 24) hourly[h].commits += count
    }
  }
  for (const ev of focusEvents) {
    if (ev.date === dateStr) hourly[ev.hour].distrMins += ev.durationMins
  }
  return hourly
}

function computePatterns(gitMap: Record<string, number>, activeDays: string[]): { dead: number[]; hot: number[] } {
  const hitCount = new Array<number>(24).fill(0)
  for (const day of activeDays) {
    for (let h = 0; h < 24; h++) {
      if ((gitMap[`${day} ${String(h).padStart(2, '0')}`] ?? 0) > 0) hitCount[h]++
    }
  }
  const n = activeDays.length || 1
  const dead = hitCount.map((c, h) => ({ h, pct: Math.round(c / n * 100) }))
    .filter(x => x.h >= 6 && x.h <= 23 && x.pct < 20).map(x => x.h)
  const hot = hitCount.map((c, h) => ({ h, pct: Math.round(c / n * 100) }))
    .filter(x => x.h >= 6 && x.h <= 23 && x.pct >= 50)
    .sort((a, b) => b.pct - a.pct).slice(0, 5).map(x => x.h)
  return { dead, hot }
}

function projectsForDates(
  byProjectDate: Record<string, Record<string, number>>,
  dates: string[],
  limit = 8
): ProjectCommits[] {
  const totals: Record<string, number> = {}
  for (const [name, dateCounts] of Object.entries(byProjectDate)) {
    for (const date of dates) totals[name] = (totals[name] ?? 0) + (dateCounts[date] ?? 0)
  }
  return Object.entries(totals)
    .map(([name, commits]) => ({ name, commits }))
    .filter(p => p.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, limit)
}

function distrSitesForDate(events: FocuslockEvent[], dateStr: string): DistrSite[] {
  const map: Record<string, { mins: number; sessions: number }> = {}
  for (const ev of events) {
    if (ev.date !== dateStr) continue
    for (const site of ev.sites) {
      if (!map[site]) map[site] = { mins: 0, sessions: 0 }
      map[site].mins += ev.durationMins
      map[site].sessions += 1
    }
  }
  return Object.entries(map)
    .map(([site, v]) => ({ site, mins: v.mins, sessions: v.sessions }))
    .sort((a, b) => b.mins - a.mins)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function loadActivityData(): ActivityData {
  const now = new Date()
  const todayStr = toDateStr(now)

  const { byDateHour, byProjectDate } = getGitData(30)
  const focusEvents = parseFocuslockHistory()

  const last30Dates: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    last30Dates.push(toDateStr(d))
  }
  const last7Dates = last30Dates.slice(-7)

  const last30: DayActivity[] = last30Dates.map(date => ({
    date, hourly: buildHourlyForDate(byDateHour, focusEvents, date),
  }))
  const last7 = last30.slice(-7)

  const allDates = [...new Set(Object.keys(byDateHour).map(k => k.slice(0, 10)))]
  const activeDays = allDates.filter(d => {
    let t = 0
    for (let h = 0; h < 24; h++) t += byDateHour[`${d} ${String(h).padStart(2, '0')}`] ?? 0
    return t >= 3
  })

  const { dead, hot } = computePatterns(byDateHour, activeDays)
  const todayHourly = buildHourlyForDate(byDateHour, focusEvents, todayStr)
  const todayEvents = focusEvents.filter(e => e.date === todayStr)

  return {
    today: todayStr,
    todayCommits: todayHourly.reduce((s, h) => s + h.commits, 0),
    todayDistrMins: todayEvents.reduce((s, e) => s + e.durationMins, 0),
    todayDistrCount: todayEvents.length,
    last7,
    last30,
    deadZones: dead,
    hotZones: hot,
    todayProjects: projectsForDates(byProjectDate, [todayStr]),
    weekProjects: projectsForDates(byProjectDate, last7Dates),
    monthProjects: projectsForDates(byProjectDate, last30Dates),
    todayDistrSites: distrSitesForDate(focusEvents, todayStr),
    focuslockLog: readFocuslockLog(),
  }
}
