import { app, BrowserWindow, Tray, ipcMain, screen, clipboard } from 'electron'
import { join } from 'path'
import { loadActivityData } from './data'
import { createTrayIcon } from './icon'
import type { ActivityData } from '@shared/types'

// Single instance — if another instance is already running, focus it and quit
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.dock.hide()

let tray: Tray | null = null
let win: BrowserWindow | null = null
let cachedData: ActivityData | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 380,
    height: 700,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('blur', () => {
    if (win && !win.webContents.isDevToolsOpened()) win.hide()
  })
}

function positionWindow(): void {
  if (!tray || !win) return

  const trayBounds = tray.getBounds()
  const [winW, winH] = win.getSize()

  // Anchor to the display under the cursor (the screen the user is actually on),
  // falling back to the tray's own display. The menu-bar tray reports bounds on
  // the active-menu-bar display, which is often not where the user is working.
  const cursor = screen.getCursorScreenPoint()
  const cursorDisplay = screen.getDisplayNearestPoint(cursor)
  const trayDisplay = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
  const sameDisplay = cursorDisplay.id === trayDisplay.id
  const { workArea } = cursorDisplay

  // If the tray is on this display, drop the window under the tray icon;
  // otherwise center it near the cursor at the top of the current display.
  let x = sameDisplay
    ? Math.round(trayBounds.x + trayBounds.width / 2 - winW / 2)
    : Math.round(cursor.x - winW / 2)
  let y = sameDisplay
    ? Math.round(trayBounds.y + trayBounds.height + 4)
    : workArea.y + 4

  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winW))
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winH))

  win.setPosition(x, y, false)
}

function toggleWindow(): void {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    positionWindow()
    win.show()
    win.focus()
  }
}

ipcMain.handle('get-activity', (): ActivityData => {
  if (!cachedData) cachedData = loadActivityData()
  return cachedData
})

ipcMain.handle('refresh-activity', (): ActivityData => {
  cachedData = loadActivityData()
  return cachedData
})

ipcMain.handle('copy-report', (_event, text: string): void => {
  clipboard.writeText(text)
})

app.on('second-instance', () => {
  if (win) { positionWindow(); win.show(); win.focus() }
})

app.whenReady().then(() => {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('FocusLock Dashboard')
  tray.on('click', toggleWindow)
  tray.on('right-click', toggleWindow)

  createWindow()
  cachedData = loadActivityData()

  refreshTimer = setInterval(() => {
    cachedData = loadActivityData()
    if (win?.isVisible()) {
      win.webContents.send('data-refreshed', cachedData)
    }
  }, 5 * 60 * 1000)
})

app.on('window-all-closed', () => { /* menubar app — stay alive */ })
app.on('before-quit', () => {
  if (refreshTimer) clearInterval(refreshTimer)
})
