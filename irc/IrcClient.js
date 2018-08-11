// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const events = require('events')

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
 */
class IrcClient extends EventEmitter {

  /**
   * Initializes a new instance of the IrcClient class.
   *
   * @constructor
   */
  constructor () {
    super()

    this.loggingEnabled = false
    
    this._socket = new net.Socket()
    this._socket.setEncoding('utf8')
    this._messageProcessor = new IrcMessageProcessor(this)

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
    this.registrationInfo = registrationInfo

    this._socket.on('data', this.dataReceived.bind(this))
    this._socket.on('close', this.connectionClosed.bind(this))
    this._socket.on('error', this.connectionError.bind(this))
    this._socket.on('disconnect', this.disconnected.bind(this))

    /**
     * @event IrcClient#connecting
     * @property {string} hostName
     * @property {number} port
     */      
    this.emit('connecting', hostName, port)

    this._socket.connect(port, hostName, this.connected.bind(this))
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
   * @param {string} [targetServer=null] The name of the server from which to request the MOTD, or null for the current server.
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
   * @param {string} [serverMask=null] A wildcard expression for matching against server names, or null to match the entire network.
   * @param {string} [targetServer=null] The name of the server to which to forward the message, or null for the current server.
   */
  getNetworkInfo (serverMask = null, targetServer = null) {
    this.sendMessageLUsers(serverMask, targetServer)
  }

  /**
   * Requests the version of the specified server.
   *
   * @public
   * @param {string} [targetServer=null] The name of the server whose version to request, or null for the current server.
   */
  getServerVersion (targetServer = null) {
    this.sendMessageVersion(targetServer)
  }

  /**
   * Requests statistics about the specified server.
   *
   * @public
   * @param {string} [query=null] The query character that indicates which server statistics to return.
   * @param {string} [targetServer=null] The name of the server whose statistics to request, or null for the current server.
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
   * @param {string} [serverMask=null] A wildcard expression for matching against server names, or null to match the entire network.
   * @param {string} [targetServer=null] The name of the server to which to forward the request, or null for the current server.
   */
  getServerLinks (serverMask = null, targetServer = null) {
    this.sendMessageLinks(serverMask, targetServer)
  }

  /**
   * Requests the local time on the specified server.
   * 
   * @public
   * @param {string} [targetServer=null] The name of the server whose local time to request, or null for the current server.
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
   * @param {string} [mask=null] A wildcard expression for matching against channel names. If the value is null, all users are matched.
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
   * @param {number} [entriesCount=-1] The maximum number of entries to return from the query. A negative value specifies to return an unlimited number of entries.
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
   * Sends the specified raw message to the server.
   *
   * @public
   * @param {string} message The text (single line) of the message to send the server.
   */
  sendRawMessage (message) {
    if (this.loggingEnabled) {
      console.log('-> ' + message)
    }

    this._socket.write(message + '\r\n')
  }

  // - Proxy Methods

  joinChannel(channelName) {
    this.sendMessageJoin([channelName])
  }

  leaveChannel(channelName, comment) {
    this.sendMessagePart([channelName], comment)
  }

  setNickName (nickName) {
    this.sendMessageNick(nickName)
  }

  setTopic (channelName, topic) {
    this.sendMessageTopic(channelName, topic)
  }

  kick(channel, usersNickNames, reason) {
    this.sendMessageKick(channel.name, usersNickNames, reason)    
  }

  invite(channel, nickName) {
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

    var localUser = new IrcLocalUser(this)
    localUser.isOnline = true
    localUser.nickName = this.registrationInfo.nickName
    localUser.userName = this.registrationInfo.userName
    localUser.realName = this.registrationInfo.userName
    localUser.userModes = this.registrationInfo.userModes

    this.localUser = localUser
    this.users.push(localUser)

    /**
     * @event IrcClient#connected
     */      
    this.emit('connected')
  }

  connectionClosed (reason) {
    this.localUser = null
  }

  connectionError (error) {
    /**
     * @event IrcClient#connectionError
     * @param {Object} error
     */      
    this.emit('connectionError', error)
  }

  disconnected (reason) {
    /**
     * @event IrcClient#disconnected
     * @param {string} reason
     */      
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

    this._socket.write(message + '\r\n')
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

module.exports = IrcClient
