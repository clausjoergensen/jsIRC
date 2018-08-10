// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const util = require('util')
const events = require('events')

const { EventEmitter } = events

const IrcUser = require('./IrcUser.js')
const IrcLocalUser = require('./IrcLocalUser.js')
const IrcChannel = require('./IrcChannel.js')
const IrcServer = require('./IrcServer.js')
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcChannelType = require('./IrcChannelType.js')
const IrcServerStatisticalEntry = require('./IrcServerStatisticalEntry.js')
const IrcMessageProcessor = require('./IrcMessageProcessor.js')

const maxParamsCount = 15
const defaultPort = 6667

/**
 * @class IrcClient
 * @extends EventEmitter
 *
 * Represents a client that communicates with a server using the IRC (Internet Relay Chat) protocol.
 */
module.exports = class IrcClient extends EventEmitter {

  /*
   * Initializes a new instance of the IrcClient class.
   *
   * @access internal
   * @constructor
  */
  constructor () {
    super()

    this.loggingEnabled = false
    this.socket = new net.Socket()
    this.socket.setEncoding('utf8')
    this.users = []
    this.channels = []
    this.servers = []
    
    this.serverAvailableUserModes = []
    this.serverAvailableChannelModes = []
    this.serverSupportedFeatures = {}
    this.channelUserModes = ['o', 'v']
    this.channelUserModesPrefixes = { '@': 'o', '+': 'v' }
    this.listedServerLinks = []
    this.listedChannels = []
    this.listedStatsEntries = []

    this._messageProcessor = new IrcMessageProcessor(this)
  }

  /**
   * 
   *
   * @public
   */
  connect (hostName, port, registrationInfo) {
    this.registrationInfo = registrationInfo

    this.socket.on('data', this.dataReceived.bind(this))
    this.socket.on('close', this.connectionClosed.bind(this))
    this.socket.on('error', this.connectionError.bind(this))
    this.socket.on('disconnect', this.disconnected.bind(this))

    this.emit('connecting', hostName, port)
    this.socket.connect(port, hostName, this.connected.bind(this))
  }

  /**
   * 
   *
   * @public
   */
  disconnect () {
    this.socket.disconnect()
  }

  /**
   * 
   *
   * @public
   */
  listChannels (channelNames = null) {
    this.sendMessageList(channelNames)
  }

  /**
   * 
   *
   * @public
   */
  getMessageOfTheDay (targetServer = null) {
    this.sendMessageMotd(targetServer)
  }

  /**
   * 
   *
   * @public
   */
  getNetworkInfo (serverMask = null, targetServer = null) {
    this.sendMessageLUsers(serverMask, targetServer)
  }

  /**
   * 
   *
   * @public
   */
  getServerVersion (targetServer = null) {
    this.sendMessageVersion(targetServer)
  }

  /**
   * 
   *
   * @public
   */
  getServerStatistics (query = null, targetServer = null) {
    this.sendMessageStats(query == null ? null : query, targetServer)
  }

  /**
   * 
   *
   * @public
   */
  getServerLinks (serverMask = null, targetServer = null) {
    this.sendMessageLinks(serverMask, targetServer)
  }

  /**
   * 
   *
   * @public
   */
  getServerTime (targetServer = null) {
    this.sendMessageTime(targetServer)
  }

  /**
   * 
   *
   * @public
   */
  ping (targetServer = null) {
    this.sendMessagePing(this.localUser.nickName, targetServer)
  }

  /**
   * 
   *
   * @public
   */
  queryWho (mask = null, onlyOperators = false) {
    this.sendMessageWho(mask, onlyOperators)
  }

  /**
   * 
   *
   * @public
   */
  queryWhoIs (nickNameMasks) {
    this.sendMessageWhoIs(nickNameMasks)
  }

  /**
   * 
   *
   * @public
   */
  queryWhoWas (nickNames, entriesCount = -1) {
    this.sendMessageWhoWas(nickNames, entriesCount)
  }

  /**
   * 
   *
   * @public
   */
  quit (comment = null) {
    this.sendMessageQuit(comment)
  }

  /**
   * 
   *
   * @public
   */
  joinChannel(channelName) {
    this.sendMessageJoin([channelName])
  }

  /**
   * 
   *
   * @public
   */
  leaveChannel(channelName, comment) {
    this.sendMessagePart([channelName], comment)
  }

  /**
   * 
   *
   * @public
   */
  setNickName (nickName) {
    this.sendMessageNick(nickName)
  }

  /**
   * 
   *
   * @public
   */
  setTopic (channelName, topic) {
    this.sendMessageTopic(channelName, topic)
  }

  /**
   * 
   *
   * @public
   */
  setModes (channel, modes, modeParameters) {
    this.sendMessageChannelMode(channel.name, modes, modeParameters)
  } 
  /**
   * 
   *
   * @public
   */
  sendMessage (targets, messageText) {
    this.sendMessagePrivateMessage(targets, messageText)
  }

  /**
   * 
   *
   * @public
   */
  sendNotice (targets, noticeText) {
    this.sendMessagePrivateMessage(targets, noticeText)
  }

  /**
   * 
   *
   * @public
   */
  sendRawMessage (message) {
    if (this.loggingEnabled) {
      console.log('-> ' + message)
    }

    this.socket.write(message + '\r\n')
  }

  // - Socket Operations

  connected () {
    if (this.registrationInfo.password != null) {
      this.sendMessagePassword(this.registrationInfo.password)
    }
    
    this.sendMessageNick(this.registrationInfo.nickName)
    this.sendMessageUser(this.registrationInfo.userName, 
                         this.getNumericUserMode(this.registrationInfo.userModes),
                         this.registrationInfo.realName)

    var localUser = new IrcLocalUser(this)
    localUser.isOnline = true
    localUser.nickName = this.registrationInfo.nickName
    localUser.userName = this.registrationInfo.userName
    localUser.realName = this.registrationInfo.userName
    localUser.userModes = this.registrationInfo.userModes

    this.localUser = localUser
    this.users.push(localUser)

    this.emit('connected')
  }

  connectionClosed (reason) {
    this.emit('disconnected', 'Connection Closed')
    this.localUser = null
  }

  connectionError (error) {
    this.emit('connectionError', error)
  }

  disconnected (reason) {
    this.emit('disconnected', reason)
  }

  dataReceived (data) {
    var str = data.toString()
    if (str == null) {
      return
    }

    var lines = str.split('\r\n')
    lines.forEach(line => {
      if (line.length == 0) {
        return
      }
      this.parseMessage(line)    
    })
  }

  // - Data Parsing

  parseMessage (line) {
    var prefix = null
    var lineAfterPrefix = null

    if (line[0] == ':') {
      var firstSpaceIndex = line.indexOf(' ')
      prefix = line.substr(1, firstSpaceIndex - 1)
      lineAfterPrefix = line.substr(firstSpaceIndex + 1)
    } else {
      lineAfterPrefix = line
    }

    var spaceIndex = lineAfterPrefix.indexOf(' ')
    var command = lineAfterPrefix.substr(0, spaceIndex)
    var paramsLine = lineAfterPrefix.substr(command.length + 1)

    var parameters = []
    var paramStartIndex = -1
    var paramEndIndex = -1

    var lineColonIndex = paramsLine.indexOf(' :')
    if (lineColonIndex == -1 && !paramsLine.startsWith(':')) {
      lineColonIndex = paramsLine.length
    }

    for (var i = 0; i < maxParamsCount; i++)
    {
      paramStartIndex = paramEndIndex + 1
      paramEndIndex = paramsLine.indexOf(' ', paramStartIndex)
      
      if (paramEndIndex == -1) {
        paramEndIndex = paramsLine.length
      }

      if (paramEndIndex > lineColonIndex) {
          paramStartIndex++
          paramEndIndex = paramsLine.length
      }
      
      parameters[i] = paramsLine.substr(paramStartIndex, paramEndIndex - paramStartIndex)
      
      if (paramEndIndex == paramsLine.length) {
        break
      }
    }

    if (this.loggingEnabled) {
      console.log('<- ' + line)
    }

    this.readMessage({ 
      'client': this, 
      'prefix': prefix, 
      'command': command, 
      'parameters': parameters,
      'source': this.getSourceFromPrefix(prefix)
    }, line)
  }

  readMessage (message, line) {
    this._messageProcessor.processMessage(message)
  }

  writeMessage (prefix, command, parameters = []) {
    if (command == null) {
      throw 'Invalid Command.'
    }
    if (parameters.length > maxParamsCount) {
      throw 'Too many parameters.'
    }

    var message = ''
    if (prefix !== null) {
      message += ':' + prefix + ' '
    }

    message += command.toUpperCase()
    for (var i = 0; i < parameters.length - 1; i++) {
      if (parameters[i] != null) {
        message += ' ' + parameters[i]
      }
    }
    
    if (parameters.length > 0) {
      var lastParameter = parameters[parameters.length - 1]
      if (lastParameter != null) {
        message += ' :' + lastParameter
      }
    }

    if (this.loggingEnabled) {
      console.log('-> ' + message)
    }

    this.socket.write(message + '\r\n')
  }

  // - Message Sending

  sendMessagePassword (password) {
    this.writeMessage(null, 'PASS', [password])
  }

  sendMessageNick (nickName) {
    this.writeMessage(null, 'NICK', [nickName])
  }

  sendMessageUser (userName, userMode, realName) {
    this.writeMessage(null, 'USER', [userName, userMode, '*', realName])
  }

  sendMessageService (nickName, distribution, description = '') {
    this.writeMessage(null, 'SERVICE', [nickName, distribution, '0', '0', description])
  }

  sendMessageOper (userName, password) {
    this.writeMessage(null, 'OPER', [userName, password])
  }

  sendMessageUserMode (nickName, modes = null) {
    this.writeMessage(null, 'MODE', [nickName, modes])
  }

  sendMessageQuit (comment) {
    this.writeMessage(null, 'QUIT', [comment])
  }

  sendMessageSQuit (targetServer, comment) {
    this.writeMessage(null, 'SQUIT', [targetServer, comment])
  }

  sendMessageLeaveAll () {
    this.writeMessage(null, 'JOIN', ['0'])
  }

  sendMessageJoin (channels) {
    this.writeMessage(null, 'JOIN', [channels.join(',')])
  }

  sendMessagePart (channels, comment = null) {
    this.writeMessage(null, 'PART', [channels.join(','), comment])
  }

  sendMessageChannelMode (channel, modes = null, modeParameters = null) {
    this.writeMessage(null, 'MODE', [channel, modes, modeParameters == null ? null : modeParameters.join(',')])
  }

  sendMessageTopic (channel, topic = null) {
    this.writeMessage(null, 'TOPIC', [channel, topic])
  }

  sendMessageNames (channels = null, targetServer = null) {
    this.writeMessage(null, 'NAMES', [channels == null ? null : channels.join(','), targetServer])
  }

  sendMessageList (channels = null, targetServer = null) {
    this.writeMessage(null, 'LIST', [channels == null ? null : channels.join(','), targetServer])
  }

  sendMessageInvite (channel, nickName) {
    this.writeMessage(null, 'INVITE', [nickName, channel])
  }

  sendMessageKick (channelName, nickNames, comment = null) {
    this.writeMessage(null, 'KICK', [channelName, nickNames.join(','), comment])
  }

  sendMessagePrivateMessage (targets, text) {
    this.writeMessage(null, 'PRIVMSG', [targets.join(','), text])
  }

  sendMessageNotice (targets, text) {
    this.writeMessage(null, 'NOTICE', [targets.join(','), text])
  }

  sendMessageMotd (targetServer = null) {
    this.writeMessage(null, 'MOTD', [targetServer])
  }

  sendMessageLUsers (serverMask = null, targetServer = null) {
    this.writeMessage(null, 'LUSERS', [serverMask, targetServer])
  }

  sendMessageVersion (targetServer = null) {
    this.writeMessage(null, 'VERSION', [targetServer])
  }

  sendMessageStats (query = null, targetServer = null) {
    this.writeMessage(null, 'STATS', [query, targetServer])
  }

  sendMessageLinks (serverMask = null, targetServer = null) {
    this.writeMessage(null, 'LINKS', [serverMask, targetServer])
  }

  sendMessageTime (targetServer = null) {
    this.writeMessage(null, 'TIME', [targetServer])
  }

  sendMessageConnect (hostName, port, targetServer = null) {
    this.writeMessage(null, 'CONNECT', [hostName, port.toString(), targetServer])
  }

  sendMessageTrace (targetServer = null) {
    this.writeMessage(null, 'TRACE', [targetServer])
  }

  sendMessageAdmin (targetServer = null) {
    this.writeMessage(null, 'ADMIN', [targetServer])
  }

  sendMessageInfo (targetServer = null) {
    this.writeMessage(null, 'INFO', [targetServer])
  }

  sendMessageServiceList (mask = null, type = null) {
    this.writeMessage(null, 'SERVLIST', [mask, type])
  }

  sendMessageSQuery (serviceName, text) {
    this.writeMessage(null, 'SQUERY', [serviceName, text])
  }

  sendMessageKill (nickName, comment) {
    this.writeMessage(null, 'KILL', [nickName, comment])
  }

  sendMessageWhoWas (nickNames, entriesCount = -1, targetServer = null) {
    this.writeMessage(null, 'WHOWAS', [nickNames.join(','), entriesCount.toString(), targetServer])
  }

  sendMessageWhoIs (nickNameMasks, targetServer = null) {
    this.writeMessage(null, 'WHOIS', [targetServer, nickNameMasks.join(',')])
  }

  sendMessageWho (mask = null, onlyOperators = false) {
    this.writeMessage(null, 'WHO', [mask, onlyOperators ? 'o' : null])
  }

  sendMessageJoin (channelName) {
    this.writeMessage(null, 'JOIN', [channelName])
  }

  sendMessagePing (server, targetServer = null) {
    this.writeMessage(null, 'PING', [server, targetServer])
  }

  sendMessagePong (server, targetServer = null) {
    this.writeMessage(null, 'PONG', [server, targetServer])
  }

  sendMessageAway (text = null) {
    this.writeMessage(null, 'AWAY', [text])
  }

  sendMessageRehash () {
    this.writeMessage(null, 'REHASH')
  }

  sendMessageDie () {
    this.writeMessage(null, 'DIE')
  }

  sendMessageRestart () {
    this.writeMessage(null, 'RESTART')
  }

  sendMessageUsers (targetServer = null) {
    this.writeMessage(null, 'USERS', [targetServer])
  }

  sendMessageWallops (text) {
    this.writeMessage(null, 'WALLOPS', [text])
  }

  sendMessageUserHost (nickNames) {
    this.writeMessage(null, 'USERHOST', nickNames)
  }

  sendMessageIsOn (nickNames) {
    this.writeMessage(null, 'ISON', nickNames)
  }

  // -- Utils

  getNumericUserMode (modes) {
    var value = 0
    if (modes == null) {
      return value
    }
    if (modes.includes('w')) {
      value |= 0x02
    }
    if (modes.includes('i')) {
      value |= 0x04
    }
    return value
  }

  getSourceFromPrefix (prefix) {
    if (prefix == null) {
      return null
    }

    var dotIdx = prefix.indexOf('.') + 1
    var bangIdx = prefix.indexOf('!') + 1
    var atIdx = prefix.indexOf('@', bangIdx) + 1

    if (bangIdx > 0) {
        var nickName = prefix.slice(0, bangIdx - 1)
        var user = this.getUserFromNickName(nickName, true)
        if (atIdx > 0) {
            user.userName = prefix.slice(bangIdx, atIdx - 1)
            user.hostName = prefix.slice(atIdx)
        } else {
            user.userName = prefix.slice(bangIdx)
        }
        return user
    } else if (atIdx > 0) {
        var nickName = prefix.slice(0, atIdx - 1)
        var user = this.getUserFromNickName(nickName, true)
        user.hostName = prefix.slice(atIdx)
        return user
    } else if (dotIdx > 0) {
        return this.getServerFromHostName(prefix)
    } else {
        var user = this.getUserFromNickName(prefix, true)
        return user
    }

    throw 'The source of the message was not recognised as either a server or user.'
  }

  getServerFromHostName (hostName) {
    var existingServer = this.servers.find(s => s.hostName == hostName)
    if (existingServer != null) {
      return existingServer
    }
    var newServer = new IrcServer(hostName)
    this.servers.push(newServer)
    return newServer
  }

  getUserFromNickName (nickName, isOnline = true) {
    var existingUser = this.users.find(u => u.nickName == nickName)
    if (existingUser != null) {
      return existingUser
    }
    
    var newUser = new IrcUser(this)
    newUser.nickName = nickName
    newUser.isOnline = isOnline

    this.users.push(newUser)

    return newUser
  }
}
