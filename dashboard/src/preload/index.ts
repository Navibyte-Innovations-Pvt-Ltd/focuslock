import { contextBridge, ipcRenderer } from 'electron'
import type { ActivityData } from '@shared/types'

contextBridge.exposeInMainWorld('api', {
  getActivity: (): Promise<ActivityData> => ipcRenderer.invoke('get-activity'),
  onRefresh: (cb: (data: ActivityData) => void): void => {
    ipcRenderer.on('data-refreshed', (_event, data: ActivityData) => cb(data))
  },
})
