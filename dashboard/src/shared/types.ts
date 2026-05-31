export interface HourData {
  commits: number
  distrMins: number
}

export interface DayActivity {
  date: string
  hourly: HourData[] // always length 24
}

export interface ActivityData {
  today: string
  todayCommits: number
  todayDistrMins: number
  todayDistrCount: number
  last7: DayActivity[]
  deadZones: number[] // hours (0-23) where coding rate < 20%
  hotZones: number[]  // hours (0-23) where coding rate >= 50%
}

export interface FocuslockEvent {
  date: string
  hour: number
  durationMins: number
  sites: string[]
}
