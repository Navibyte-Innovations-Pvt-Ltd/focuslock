export interface HourData {
  commits: number
  distrMins: number
}

export interface DayActivity {
  date: string
  hourly: HourData[]
}

export interface ProjectCommits {
  name: string
  commits: number
}

export interface ActivityData {
  today: string
  todayCommits: number
  todayDistrMins: number
  todayDistrCount: number
  last7: DayActivity[]
  deadZones: number[]
  hotZones: number[]
  todayProjects: ProjectCommits[]   // per-project commit count for today
  weekProjects: ProjectCommits[]    // per-project totals across last 7 days
}

export interface FocuslockEvent {
  date: string
  hour: number
  durationMins: number
  sites: string[]
}
