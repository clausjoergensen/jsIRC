// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { BrowserWindow } = remote
const path = require('path')

module.exports = function (channelName) {
  let promptWindow = new BrowserWindow({
    width: 500,
    height: 300,
    resizable: false,
    parent: null,
    skipTaskbar: true,
    alwaysOnTop: false,
    useContentSize: false,
    modal: true,
    title: `${channelName} Channel Modes`
  })

  promptWindow.setMenu(null)
  promptWindow.loadURL(path.join('file://', __dirname, '/channel-prompt.html'))
}
