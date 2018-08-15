// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcClient = require('./src/IrcClient.js')
const IrcFloodPreventer = require('./src/IrcFloodPreventer.js')
const IrcUser = require('./src/IrcUser.js')
const IrcLocalUser = require('./src/IrcLocalUser.js')
const IrcServer = require('./src/IrcServer.js')
const IrcChannel = require('./src/IrcChannel.js')
const IrcChannelUser = require('./src/IrcChannelUser.js')
const IrcChannelType = require('./src/IrcChannelType.js')

const CtcpClient = require('./src/CtcpClient.js')

module.exports = {
  IrcClient: IrcClient,
  IrcFloodPreventer: IrcFloodPreventer,
  IrcUser: IrcUser,
  IrcLocalUser: IrcLocalUser,
  IrcServer: IrcServer,
  IrcChannel: IrcChannel,
  IrcChannelUser: IrcChannelUser,
  IrcChannelType: IrcChannelType,
  CtcpClient: CtcpClient
}
