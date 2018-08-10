// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcClient = require('./irc/IrcClient.js')
const CtcpClient = require('./irc/CtcpClient.js')
const ClientUI = require('./ClientUI.js')
const packageInfo = require('./package.json')

const client = new IrcClient()
client.loggingEnabled = false

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

  client.connect('127.0.0.1', 6667, {
    'nickName': 'Rincewind',
    'password': null,
    'userName': 'claus.joergensen@outlook.com',
    'realName': 'Claus Joergensen',
    'userModes': []
  })

  /*client.connect('irc.quakenet.org', 6667, {
    'nickName': 'Windcapes',
    'password': null,
    'userName': 'claus.joergensen@outlook.com',
    'realName': 'Claus Joergensen',
    'userModes': []
  })*/

  client.on('registered', () => {
    client.sendRawMessage('join :#wow')
  })
})
