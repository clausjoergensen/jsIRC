// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { IrcClient, CtcpClient } = require('./irc/index.js')

const ClientUI = require('./ClientUI.js')
const packageInfo = require('./package.json')

const client = new IrcClient()
client.loggingEnabled = true

const ctcpClient = new CtcpClient(client)
ctcpClient.clientName = packageInfo.name
ctcpClient.clientVersion = packageInfo.version

var clientUI = null

function cmd(message) {
  client.sendRawMessage(message)
  return true
}

document.addEventListener('DOMContentLoaded', function (event) {
  clientUI = new ClientUI(client, ctcpClient)

  var server = '127.0.0.1'
  //var server = 'irc.quakenet.org' 

  client.connect(server, 6667, {
    'nickName': 'Windcapes',
    'password': null,
    'userName': 'claus.joergensen@outlook.com',
    'realName': 'Claus Joergensen',
    'userModes': []
  })

  client.on('registered', () => {
    client.sendRawMessage('join :#c#')
    client.sendRawMessage('join :#hearthstone')
    client.sendRawMessage('join :#wow')
    client.sendRawMessage('join :#php')
  })
})
