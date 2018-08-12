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

  let server = '127.0.0.1'

  client.connect(server, 6667, {
    'nickName': 'Archchancellor',
    'password': 'correcthorsebatterystaple',
    'userName': 'mustrum.ridcully@uu.edu',
    'realName': 'Mustrum Ridcully',
    'userModes': []
  })

  client.on('registered', () => {
    client.joinChannel('#AnkhMorpork')
    client.joinChannel('#UnseenUniversity')
    client.joinChannel('#MendedDrum')
    client.joinChannel('#OblongOffice')
    client.joinChannel('#RoyalMint')
    client.joinChannel('#TheShades')
    client.joinChannel('#ThievesGuild')
    client.joinChannel('#SmallGods')
    client.joinChannel('#WatchHouse')
    client.joinChannel('#BrassBridge')
  })
})
