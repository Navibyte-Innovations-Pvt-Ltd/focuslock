import type { ActivityData } from '@shared/types'

declare global {
  interface Window {
    api: {
      getActivity: () => Promise<ActivityData>
      onRefresh: (cb: (data: ActivityData) => void) => void
    }
  }
}

export {}
