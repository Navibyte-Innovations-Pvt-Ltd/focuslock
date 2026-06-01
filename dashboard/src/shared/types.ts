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

export interface DistrSite {
  site: string
  mins: number
  sessions: number
}

export interface ActivityData {
  today: string
  todayCommits: number
  todayDistrMins: number
  todayDistrCount: number
  last7: DayActivity[]
  last30: DayActivity[]
  deadZones: number[]
  hotZones: number[]
  todayProjects: ProjectCommits[]
  weekProjects: ProjectCommits[]
  monthProjects: ProjectCommits[]
  todayDistrSites: DistrSite[]
  focuslockLog: string
}

export interface FocuslockEvent {
  date: string
  hour: number
  durationMins: number
  sites: string[]
}
