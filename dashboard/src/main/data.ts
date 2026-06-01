import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { spawnSync } from 'child_process'
import type { ActivityData, DayActivity, FocuslockEvent, HourData, ProjectCommits } from '@shared/types'

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

interface GitData {
  byDateHour: Record<string, number>                    // "YYYY-MM-DD HH" → count
  byProjectDate: Record<string, Record<string, number>> // project → date → count
}

function getGitData(dayCount: number): GitData {
  const byDateHour: Record<string, number> = {}
  const byProjectDate: Record<string, Record<string, number>> = {}

  let dirs: string[]
  try {
    dirs = readdirSync(CODING_LINE)
  } catch {
    return { byDateHour, byProjectDate }
  }

  for (const dir of dirs) {
    const repoPath = join(CODING_LINE, dir)
    try {
      statSync(join(repoPath, '.git'))
    } catch {
      continue
    }

    const result = spawnSync(
      'git',
      ['log', '--format=%ad', `--date=format:%Y-%m-%d %H`, `--since=${dayCount} days ago`],
      { cwd: repoPath, encoding: 'utf8', timeout: 4000 }
    )

    if (result.status !== 0 || !result.stdout) continue

    for (const line of result.stdout.trim().split('\n')) {
      const key = line.trim()
      if (!key) continue

      // date-hour map (existing)
      byDateHour[key] = (byDateHour[key] ?? 0) + 1

      // project-date map (new)
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
    if (ev.date === dateStr) {
      hourly[ev.hour].distrMins += ev.durationMins
    }
  }

  return hourly
}

function computePatterns(
  gitMap: Record<string, number>,
  activeDays: string[]
): { dead: number[]; hot: number[] } {
  const hitCount = new Array<number>(24).fill(0)

  for (const day of activeDays) {
    for (let h = 0; h < 24; h++) {
      const key = `${day} ${String(h).padStart(2, '0')}`
      if ((gitMap[key] ?? 0) > 0) hitCount[h]++
    }
  }

  const n = activeDays.length || 1

  const dead = hitCount
    .map((c, h) => ({ h, pct: Math.round((c / n) * 100) }))
    .filter(x => x.h >= 6 && x.h <= 23 && x.pct < 20)
    .map(x => x.h)

  const hot = hitCount
    .map((c, h) => ({ h, pct: Math.round((c / n) * 100) }))
    .filter(x => x.h >= 6 && x.h <= 23 && x.pct >= 50)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map(x => x.h)

  return { dead, hot }
}

function projectsForDate(
  byProjectDate: Record<string, Record<string, number>>,
  dateStr: string
): ProjectCommits[] {
  return Object.entries(byProjectDate)
    .map(([name, dates]) => ({ name, commits: dates[dateStr] ?? 0 }))
    .filter(p => p.commits > 0)
    .sort((a, b) => b.commits - a.commits)
}

function projectsForDateRange(
  byProjectDate: Record<string, Record<string, number>>,
  dates: string[]
): ProjectCommits[] {
  const totals: Record<string, number> = {}
  for (const [name, dateCounts] of Object.entries(byProjectDate)) {
    for (const date of dates) {
      totals[name] = (totals[name] ?? 0) + (dateCounts[date] ?? 0)
    }
  }
  return Object.entries(totals)
    .map(([name, commits]) => ({ name, commits }))
    .filter(p => p.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 8)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function loadActivityData(): ActivityData {
  const now = new Date()
  const todayStr = toDateStr(now)

  const { byDateHour, byProjectDate } = getGitData(30)
  const focusEvents = parseFocuslockHistory()

  const last7Dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    last7Dates.push(toDateStr(d))
  }

  const last7: DayActivity[] = last7Dates.map(date => ({
    date,
    hourly: buildHourlyForDate(byDateHour, focusEvents, date),
  }))

  const allDates = [...new Set(Object.keys(byDateHour).map(k => k.slice(0, 10)))]
  const activeDays = allDates.filter(d => {
    let total = 0
    for (let h = 0; h < 24; h++) total += byDateHour[`${d} ${String(h).padStart(2, '0')}`] ?? 0
    return total >= 3
  })

  const { dead, hot } = computePatterns(byDateHour, activeDays)

  const todayHourly = buildHourlyForDate(byDateHour, focusEvents, todayStr)
  const todayCommits = todayHourly.reduce((s, h) => s + h.commits, 0)
  const todayEvents = focusEvents.filter(e => e.date === todayStr)

  return {
    today: todayStr,
    todayCommits,
    todayDistrMins: todayEvents.reduce((s, e) => s + e.durationMins, 0),
    todayDistrCount: todayEvents.length,
    last7,
    deadZones: dead,
    hotZones: hot,
    todayProjects: projectsForDate(byProjectDate, todayStr),
    weekProjects: projectsForDateRange(byProjectDate, last7Dates),
  }
}
