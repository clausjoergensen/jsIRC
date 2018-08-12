// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { IrcClient, IrcFloodPreventer, CtcpClient } = require('./../irc/index.js')

const ClientUI = require('./client-ui.js')
const packageInfo = require('./../package.json')

// const maxListenersExceededWarning = require('max-listeners-exceeded-warning')
// maxListenersExceededWarning()

const floodPreventer = new IrcFloodPreventer(4, 2000)

const client = new IrcClient()
client.floodPreventer = floodPreventer

const ctcpClient = new CtcpClient(client)
ctcpClient.clientName = packageInfo.name
ctcpClient.clientVersion = packageInfo.version

// eslint-disable-next-line no-unused-vars
function cmd (message) {
  client.sendRawMessage(message)
  return true
}

// eslint-disable-next-line no-unused-vars
let clientUI = null

document.addEventListener('DOMContentLoaded', function (event) {
  clientUI = new ClientUI(client, ctcpClient)

  var server = '127.0.0.1'
  // var server = 'irc.quakenet.org'

  client.connect(server, 6667, {
    'nickName': 'Windcapes',
    'password': null,
    'userName': 'claus.joergensen@outlook.com',
    'realName': 'Claus Joergensen',
    'userModes': []
  })

  client.on('registered', () => {
    client.oper('Windcapes', 'correcthorsebatterystaple')
    client.joinChannel('#c#')
    client.joinChannel('#hearthstone')
    client.joinChannel('#wow')
  })
})