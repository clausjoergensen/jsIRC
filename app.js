// Copyright (c) 2018 Claus Jørgensen
'use strict'

const electron = require('electron')
const app = (process.type === 'renderer') ? electron.remote.app : electron.app
const  BrowserWindow = require('browser-window')

var mainWindow = null

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit()
  }
})

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden'
  })

  mainWindow.loadUrl('file://' + __dirname + '/index.html')

  mainWindow.on('closed', function() {
    mainWindow = null
  })
})
