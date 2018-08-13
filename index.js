// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcUser = require('./src/IrcUser.js')
const IrcLocalUser = require('./src/IrcLocalUser.js')
const IrcChannel = require('./src/IrcChannel.js')
const IrcServer = require('./src/IrcServer.js')
const IrcChannelUser = require('./src/IrcChannelUser.js')
const IrcChannelType = require('./src/IrcChannelType.js')
const IrcServerStatisticalEntry = require('./src/IrcServerStatisticalEntry.js')
const IrcClient = require('./src/IrcClient.js')
const IrcReply = require('./src/IrcReply.js')
const IrcError = require('./src/IrcError.js')
const IrcFloodPreventer = require('./src/IrcFloodPreventer.js')

const CtcpClient = require('./src/CtcpClient.js')

module.exports = {
  IrcUser: IrcUser,
  IrcLocalUser: IrcLocalUser,
  IrcChannel: IrcChannel,
  IrcServer: IrcServer,
  IrcChannelUser: IrcChannelUser,
  IrcChannelType: IrcChannelType,
  IrcServerStatisticalEntry: IrcServerStatisticalEntry,
  IrcClient: IrcClient,
  IrcReply: IrcReply,
  IrcError: IrcError,
  IrcFloodPreventer: IrcFloodPreventer,
  CtcpClient: CtcpClient
}
