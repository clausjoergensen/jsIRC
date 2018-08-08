// Copyright (c) 2018 Claus Jørgensen
'use strict'

const electron = require('electron')
const app = (process.type === 'renderer') ? electron.remote.app : electron.app

//require('electron-debug')()

let mainWindow

function onClosed() {
  mainWindow = null
}

function createMainWindow() {
  const browserWindow = new electron.BrowserWindow({
    width: 1024,
    height: 800
  })

  browserWindow.loadURL(`file://${__dirname}/index.html`)
  browserWindow.on('closed', onClosed)

  return browserWindow
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createMainWindow()
})
