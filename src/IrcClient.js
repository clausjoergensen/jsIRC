// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const events = require('events')
const log = require('electron-log')

const { EventEmitter } = events

const IrcUser = require('./IrcUser.js')
const IrcLocalUser = require('./IrcLocalUser.js')
const IrcServer = require('./IrcServer.js')
const IrcMessageProcessor = require('./IrcMessageProcessor.js')

const maxParamsCount = 15

/**
 * Represents a client that communicates with a server using the IRC (Internet Relay Chat) protocol.
 *
 * @public
 * @class
 * @extends EventEmitter
 *
 * @example
 *
 * let client = new IrcClient()
 * client.connect('irc.quakenet.org', 6667, {
 *   'nickName': 'Ridcully',
 *   'userName': 'archchancellor@unseen-university.edu',
 *   'realName': 'Mustrum Ridcully'
 * })
 *
 * client.on('registered', () => {
 *    client.localUser.on('joinedChannel', (channel) => {
 *       channel.sendMessage("What's for lunch?")
 *    })
 *    client.joinChannel('#greathall')
 * })
 *
 */
class IrcClient extends EventEmitter {
  /**
   * Initializes a new instance of the IrcClient class.
   *
   * @constructor
   */
  constructor () {
    super()

    this._messageProcessor = new IrcMessageProcessor(this)
    this._sendTimer = null
    this._floodPreventer = null
  }

  /**
   * Connects to the specified server.
   *
   * @public
   * @fires IrcClient#connecting
   * @param {string} hostName The name of the remote host.
   * @param {number} port The port number of the remote host.
   * @param {Object} registrationInfo The information used for registering the client.
   */
  connect (hostName, port, registrationInfo) {
    this.hostName = hostName
    this.port = port
    this.registrationInfo = registrationInfo

    this.resetState()

    /**
     * @event IrcClient#connecting
     * @property {string} hostName
     * @property {number} port
     */
    this.emit('connecting', hostName, port)

    this._socket.connect(port, hostName)
  }

  /**
   * Gets an object that limits the rate of outgoing messages in order to prevent flooding the server.
   *
   * The value is null by default, which indicates that no flood prevention should be performed.
   *
   * @public
   * @return {IrcFloodPreventer} A flood preventer object.
   */
  get floodPreventer () {
    return this._floodPreventer
  }

  /**
   * Sets an object that limits the rate of outgoing messages in order to prevent flooding the server.
   *
   * @public
   * @param {IrcFloodPreventer} value A flood preventer object.
   */
  set floodPreventer (value) {
    this._floodPreventer = value
  }

  /**
   * Requests a list of information about the specified (or all) channels on the network.
   *
   * @public
   * @param {string[]} [channelNames=null] The names of the channels to list, or null to list all channels
   */
  listChannels (channelNames = null) {
    this.sendMessageList(channelNames)
  }

  /**
   * Requests the Message of the Day (MOTD) from the specified server.
   *
   * @public
   * @param {string} [targetServer=null] The name of the server from which to request the MOTD,
   * or null for the current server.
   */
  getMessageOfTheDay (targetServer = null) {
    this.sendMessageMotd(targetServer)
  }

  /**
   * Requests statistics about the connected IRC network.
   *
   * If the serverMask is specified, then the server only returns information about the part of
   * the network formed by the servers whose names match the mask; otherwise, the information concerns the whole
   * network
   *
   * @public
   * @param {string} [serverMask=null] A wildcard expression for matching against server names,
   * or null to match the entire network.
   * @param {string} [targetServer=null] The name of the server to which to forward the message,
   * or null for the current server.
   */
  getNetworkInfo (serverMask = null, targetServer = null) {
    this.sendMessageLUsers(serverMask, targetServer)
  }

  /**
   * Requests the version of the specified server.
   *
   * @public
   * @param {string} [targetServer=null] The name of the server whose version to request,
   * or null for the current server.
   */
  getServerVersion (targetServer = null) {
    this.sendMessageVersion(targetServer)
  }

  /**
   * Requests statistics about the specified server.
   *
   * @public
   * @param {string} [query=null] The query character that indicates which server statistics to return.
   * @param {string} [targetServer=null] The name of the server whose statistics to request,
   * or null for the current server.
   */
  getServerStatistics (query = null, targetServer = null) {
    this.sendMessageStats(query == null ? null : query, targetServer)
  }

  /**
   * Requests a list of all servers known by the target server.
   *
   * If serverMask is specified, then the server only returns information about the part of the network
   * formed by the servers whose names match the mask; otherwise, the information concerns the whole network.
   *
   * @public
   * @param {string} [serverMask=null] A wildcard expression for matching against server names,
   * or null to match the entire network.
   * @param {string} [targetServer=null] The name of the server to which to forward the request,
   * or null for the current server.
   */
  getServerLinks (serverMask = null, targetServer = null) {
    this.sendMessageLinks(serverMask, targetServer)
  }

  /**
   * Requests the local time on the specified server.
   *
   * @public
   * @param {string} [targetServer=null] The name of the server whose local time to request,
   * or null for the current server.
   */
  getServerTime (targetServer = null) {
    this.sendMessageTime(targetServer)
  }

  /**
   * Sends a ping to the specified server.
   *
   * @public
   * @param {string} [targetServer=null] The name of the server to ping, or null for the current server.
   */
  ping (targetServer = null) {
    this.sendMessagePing(this.localUser.nickName, targetServer)
  }

  /**
   * Sends a Who query to the server targeting the specified channel or user masks.
   *
   * @public
   * @param {string} [mask=null] A wildcard expression for matching against channel names.
   * If the value is null, all users are matched.
   * @param {boolean} [onlyOperators=true] true to match only server operators, to match all users.
   */
  queryWho (mask = null, onlyOperators = false) {
    this.sendMessageWho(mask, onlyOperators)
  }

  /**
   * Sends a Who Is query to server targeting the specified nick name masks.
   *
   * @public
   * @param {string[]} nickNameMasks A array of wildcard expressions for matching against nick names of users.
   */
  queryWhoIs (nickNameMasks) {
    this.sendMessageWhoIs(nickNameMasks)
  }

  /**
   * Sends a Who Was query to server targeting the specified nick names.
   *
   * @public
   * @param {string} nickNames The nick names of the users to query.
   * @param {number} [entriesCount=-1] The maximum number of entries to return from the query.
   * A negative value specifies to return an unlimited number of entries.
   */
  queryWhoWas (nickNames, entriesCount = -1) {
    this.sendMessageWhoWas(nickNames, entriesCount)
  }

  /**
   * Quits the server, giving the specified comment.
   *
   * @public
   * @param {string} [comment] The comment to send to the server.
   */
  quit (comment = null) {
    this.sendMessageQuit(comment)
  }

  /**
   * Attempts to authenticate as a IRC network operator.
   *
   * @public
   * @param {string} userName The username.
   * @param {string} userName The password.
   */
  oper (userName, password) {
    this.sendMessageOper(userName, password)
  }

  /**
   * Sends the specified raw message to the server.
   *
   * @public
   * @param {string} message The text (single line) of the message to send the server.
   */
  sendRawMessage (message) {
    this._messageSendQueue.push(message + '\r\n')
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {string} A string that represents this instance.
   */
  toString () {
    return `(${this.registrationInfo.nickName}, ${this.hostName}:${this.port})`
  }

  // - Proxy Methods

  joinChannel (channelName) {
    this.sendMessageJoin([channelName])
  }

  leaveChannel (channelName, comment) {
    this.sendMessagePart([channelName], comment)
  }

  setNickName (nickName) {
    this.sendMessageNick(nickName)
  }

  setTopic (channelName, topic) {
    this.sendMessageTopic(channelName, topic)
  }

  kick (channel, usersNickNames, reason) {
    this.sendMessageKick(channel.name, usersNickNames, reason)
  }

  invite (channel, nickName) {
    this.sendMessageInvite(channel.name, nickName)
  }

  getChannelModes (channel, modes = null) {
    this.sendMessageChannelMode(channel.name, modes)
  }

  setChannelModes (channel, modes, modeParameters) {
    this.sendMessageChannelMode(channel.name, modes, modeParameters)
  }

  sendMessage (targets, messageText) {
    this.sendMessagePrivateMessage(targets, messageText)
  }

  sendNotice (targets, noticeText) {
    this.sendMessagePrivateMessage(targets, noticeText)
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

    let localUser = new IrcLocalUser(this)
    localUser.isOnline = true
    localUser.nickName = this.registrationInfo.nickName
    localUser.userName = this.registrationInfo.userName
    localUser.realName = this.registrationInfo.userName
    localUser.userModes = this.registrationInfo.userModes

    this.localUser = localUser
    this.users.push(localUser)

    this._sendTimer = setInterval(() => this.writePendingMessages(), 0)

    /**
     * @event IrcClient#connected
     */
    this.emit('connected')
  }

  connectionError (error) {
    if (this._sendTimer != null) {
      clearInterval(this._sendTimer)
    }
    /**
     * @event IrcClient#connectionError
     * @param {Object} error
     */
    this.emit('connectionError', error)
  }

  connectionClosed (hadError) {
    if (this._sendTimer != null) {
      clearInterval(this._sendTimer)
    }
    /**
     * @event IrcClient#connectionClosed
     * @param {boolean} hadError
     */
    this.emit('connectionClosed', hadError)
  }

  disconnected (reason) {
    if (this._sendTimer != null) {
      clearInterval(this._sendTimer)
    }
    /**
     * @event IrcClient#disconnected
     * @param {string} reason
     */
    this.emit('disconnected', reason)
  }

  resetState () {
    this._messageSendQueue = []
    this._socket = new net.Socket()
    this._socket.setKeepAlive(true, 5000)
    this._socket.setEncoding('utf8')
    this._socket.on('data', this.dataReceived.bind(this))
    this._socket.on('error', this.connectionError.bind(this))
    this._socket.on('connect', this.connected.bind(this))
    this._socket.on('disconnect', this.disconnected.bind(this))
    this._socket.on('close', this.connectionClosed.bind(this))
    this.localUser = null
    this.messageOfTheDay = null
    this.yourHostMessage = null
    this.serverCreatedMessage = null
    this.serverName = null
    this.serverVersion = null
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
  }

  dataReceived (data) {
    let str = data.toString()
    if (str == null) {
      return
    }

    let lines = str.split('\r\n')
    lines.forEach(line => {
      if (line.length === 0) {
        return
      }
      this.parseMessage(line)
    })
  }

  // - Data Parsing

  parseMessage (line) {
    let prefix = null
    let lineAfterPrefix = null

    if (line[0] === ':') {
      let firstSpaceIndex = line.indexOf(' ')
      prefix = line.substr(1, firstSpaceIndex - 1)
      lineAfterPrefix = line.substr(firstSpaceIndex + 1)
    } else {
      lineAfterPrefix = line
    }

    let spaceIndex = lineAfterPrefix.indexOf(' ')
    let command = lineAfterPrefix.substr(0, spaceIndex)
    let paramsLine = lineAfterPrefix.substr(command.length + 1)

    let parameters = []
    let paramStartIndex = -1
    let paramEndIndex = -1

    let lineColonIndex = paramsLine.indexOf(' :')
    if (lineColonIndex === -1 && !paramsLine.startsWith(':')) {
      lineColonIndex = paramsLine.length
    }

    for (let i = 0; i < maxParamsCount; i++) {
      paramStartIndex = paramEndIndex + 1
      paramEndIndex = paramsLine.indexOf(' ', paramStartIndex)

      if (paramEndIndex === -1) {
        paramEndIndex = paramsLine.length
      }

      if (paramEndIndex > lineColonIndex) {
        paramStartIndex++
        paramEndIndex = paramsLine.length
      }

      parameters[i] = paramsLine.substr(paramStartIndex, paramEndIndex - paramStartIndex)

      if (paramEndIndex === paramsLine.length) {
        break
      }
    }

    log.verbose('<- ' + line)

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

  writePendingMessages () {
    let sendDelay = 0

    while (this._messageSendQueue.length > 0) {
      if (this.floodPreventer) {
        sendDelay = this.floodPreventer.getSendDelay()
        if (sendDelay > 0) {
          break
        }
      }

      let message = this._messageSendQueue.shift()
      log.verbose('-> ' + message)
      this._socket.write(message)

      if (this.floodPreventer) {
        this.floodPreventer.messageSent()
      }
    }

    if (this._sendTimer) {
      clearInterval(this._sendTimer)
      this._sendTimer = null
    }

    this._sendTimer = setInterval(() => this.writePendingMessages(), Math.max(sendDelay, 50))
  }

  writeMessage (prefix, command, parameters = []) {
    if (command == null) {
      throw new Error('Invalid Command.')
    }
    if (parameters.length > maxParamsCount) {
      throw new Error('Too many parameters.')
    }

    let message = ''
    if (prefix) {
      message += ':' + prefix + ' '
    }

    message += command.toUpperCase()
    for (let i = 0; i < parameters.length - 1; i++) {
      if (parameters[i] != null) {
        message += ' ' + parameters[i]
      }
    }

    if (parameters.length > 0) {
      let lastParameter = parameters[parameters.length - 1]
      if (lastParameter != null) {
        message += ' :' + lastParameter
      }
    }

    this._messageSendQueue.push(message + '\r\n')
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
    let value = 0
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

    let dotIdx = prefix.indexOf('.') + 1
    let bangIdx = prefix.indexOf('!') + 1
    let atIdx = prefix.indexOf('@', bangIdx) + 1

    if (bangIdx > 0) {
      let nickName = prefix.slice(0, bangIdx - 1)
      let user = this.getUserFromNickName(nickName, true)
      if (atIdx > 0) {
        user.userName = prefix.slice(bangIdx, atIdx - 1)
        user.hostName = prefix.slice(atIdx)
      } else {
        user.userName = prefix.slice(bangIdx)
      }
      return user
    } else if (atIdx > 0) {
      let nickName = prefix.slice(0, atIdx - 1)
      let user = this.getUserFromNickName(nickName, true)
      user.hostName = prefix.slice(atIdx)
      return user
    } else if (dotIdx > 0) {
      return this.getServerFromHostName(prefix)
    } else {
      let user = this.getUserFromNickName(prefix, true)
      if (user != null) {
        return user
      }
    }

    throw new Error('The source of the message was not recognised as either a server or user.')
  }

  getServerFromHostName (hostName) {
    let existingServer = this.servers.find(s => s.hostName === hostName)
    if (existingServer != null) {
      return existingServer
    }
    let newServer = new IrcServer(hostName)
    this.servers.push(newServer)
    return newServer
  }

  getUserFromNickName (nickName, isOnline = true) {
    let existingUser = this.users.find(u => u.nickName === nickName)
    if (existingUser != null) {
      return existingUser
    }

    let newUser = new IrcUser(this)
    newUser.nickName = nickName
    newUser.isOnline = isOnline

    this.users.push(newUser)

    return newUser
  }
}

module.exports = IrcClient