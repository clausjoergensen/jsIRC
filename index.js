// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcClient = require('./src/IrcClient.js')
const IrcFloodPreventer = require('./src/IrcFloodPreventer.js')
const CtcpClient = require('./src/CtcpClient.js')

module.exports = {
  IrcClient: IrcClient,
  IrcFloodPreventer: IrcFloodPreventer,
  CtcpClient: CtcpClient
}
