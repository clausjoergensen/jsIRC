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

const maxParamsCount = 15
const defaultPort = 6667

const regexNickName = new RegExp(/([^!@]+)/)
const regexUserName = new RegExp(/([^!@]+)/)
const regexHostName = new RegExp(/([^%@]+)/)
const regexChannelName = new RegExp(/([#+!&].+)/)
const regexTargetMask = new RegExp(/([$#].+)/)
const regexServerName = new RegExp(/([^%@]+?\.[^%@]*)/)
const regexNickNameId = new RegExp(/([^!@]+)(?:(?:!([^!@]+))?@([^%@]+))?/)
const regexUserNameId = new RegExp(/([^!@]+)(?:(?:%[^%@]+)?@([^%@]+?\.[^%@]*)|%([^!@]+))/)
const regexISupportPrefix = new RegExp(/\((.*)\)(.*)/)

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
    this.isRegistered = false
    this.yourHostMessage = null
    this.serverCreatedMessage = null
    this.serverName = null
    this.serverVersion = null
    this.serverAvailableUserModes = []
    this.serverAvailableChannelModes = []
    this.serverSupportedFeatures = {}
    this.channelUserModes = ['o', 'v']
    this.channelUserModesPrefixes = { '@': 'o', '+': 'v' }
    this.messageOfTheDay = null
    this.listedServerLinks = []
    this.listedChannels = []
    this.listedStatsEntries = []
    this._messageProcessors = {
      'NICK': this.processMessageNick.bind(this),
      'QUIT': this.processMessageQuit.bind(this),
      'JOIN': this.processMessageJoin.bind(this),
      'PART': this.processMessagePart.bind(this),
      'MODE': this.processMessageMode.bind(this),
      'TOPIC': this.processMessageTopic.bind(this),
      'KICK': this.processMessageKick.bind(this),
      'INVITE': this.processMessageInvite.bind(this),
      'PRIVMSG': this.processMessagePrivateMessage.bind(this),
      'NOTICE': this.processMessageNotice.bind(this),
      'PING': this.processMessagePing.bind(this),
      'PONG': this.processMessagePong.bind(this),
      'ERROR': this.processMessageError.bind(this),
      '001': this.processMessageReplyWelcome.bind(this),
      '002': this.processMessageReplyYourHost.bind(this),
      '003': this.processMessageReplyCreated.bind(this),
      '004': this.processMessageReplyMyInfo.bind(this),
      '005': this.processMessageReplyBounceOrISupport.bind(this),
      '211': this.processMessageStatsLinkInfo.bind(this),
      '212': this.processMessageStatsCommands.bind(this),
      '213': this.processMessageStatsCLine.bind(this),
      '214': this.processMessageStatsNLine.bind(this),
      '215': this.processMessageStatsILine.bind(this),
      '216': this.processMessageStatsKLine.bind(this),
      '218': this.processMessageStatsYLine.bind(this),
      '219': this.processMessageEndOfStats.bind(this),
      '241': this.processMessageStatsLLine.bind(this),
      '242': this.processMessageStatsUpTime.bind(this),
      '243': this.processMessageStatsOLine.bind(this),
      '244': this.processMessageStatsHLine.bind(this),
      '251': this.processMessageLUserClient.bind(this),
      '252': this.processMessageLUserOp.bind(this),
      '253': this.processMessageLUserUnknown.bind(this),
      '254': this.processMessageLUserChannels.bind(this),
      '255': this.processMessageLUserMe.bind(this),
      '301': this.processMessageReplyAway.bind(this),
      '303': this.processMessageReplyIsOn.bind(this),
      '305': this.processMessageReplyUnAway.bind(this),
      '306': this.processMessageReplyNowAway.bind(this),
      '311': this.processMessageReplyWhoIsUser.bind(this),
      '312': this.processMessageReplyWhoIsServer.bind(this),
      '313': this.processMessageReplyWhoIsOperator.bind(this),
      '314': this.processMessageReplyWhoWasUser.bind(this),
      '315': this.processMessageReplyEndOfWho.bind(this),
      '317': this.processMessageReplyWhoIsIdle.bind(this),
      '318': this.processMessageReplyEndOfWhoIs.bind(this),
      '319': this.processMessageReplyWhoIsChannels.bind(this),
      '322': this.processMessageReplyList.bind(this),
      '323': this.processMessageReplyListEnd.bind(this),
      '331': this.processMessageReplyNoTopic.bind(this),
      '332': this.processMessageReplyTopic.bind(this),
      '341': this.processMessageReplyInviting.bind(this),
      '351': this.processMessageReplyVersion.bind(this),
      '352': this.processMessageReplyWhoReply.bind(this),
      '353': this.processMessageReplyNameReply.bind(this),
      '364': this.processMessageReplyLinks.bind(this),
      '365': this.processMessageReplyEndOfLinks.bind(this),
      '366': this.processMessageReplyEndOfNames.bind(this),
      '369': this.processMessageReplyEndOfWhoWas.bind(this),
      '372': this.processMessageReplyMotd.bind(this),
      '375': this.processMessageReplyMotdStart.bind(this),
      '376': this.processMessageReplyMotdEnd.bind(this),
      '383': this.processMessageReplyYouAreService.bind(this),
      '391': this.processMessageReplyTime.bind(this)
    }
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
    var messageProcessor = this._messageProcessors[message.command]
    if (messageProcessor != null) {
      messageProcessor(message)
    } else {
      var numericCommand = parseInt(message.command)
      if (numericCommand >= 400 && numericCommand <= 599) {
        this.processMessageNumericError(message)
      } else {
        if (this.loggingEnabled) {
          console.log(`Unsupported command '${message.command}'`)
        }
      }
    }
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

  // - Message Receiving

  messageReceived (source, targets, noticeText) {
    this.emit('message', source, messageText)
  }

  noticeReceived (source, targets, noticeText) {
    this.emit('notice', source, noticeText)
  }

  // Process NICK messages received from the server.
  processMessageNick (message) {
    var sourceUser = message.source
    var newNickName = message.parameters[0]
    sourceUser.nickName = newNickName
    sourceUser.emit('nickName', newNickName)
  }

  // Process QUIT messages received from the server.
  processMessageQuit (message) {
    var sourceUser = message.source
    var comment = message.parameters[0]
    
    sourceUser.quit(comment)
    
    let idx = this.users.indexOf(sourceUser)
    if (idx != -1) {
      this.users.splice(idx)
    }
  }

  // Process JOIN messages received from the server.
  processMessageJoin (message) {
    var sourceUser = message.source
    var channelList = message.parameters[0].split(',')

    channelList.forEach(channelName => {
      var channel = this.getChannelFromName(channelName)
      if (sourceUser == this.localUser) {
        this.localUser.joinChannel(channel)
      } else {
        channel.userJoined(new IrcChannelUser(sourceUser))
      }    
    })
  }

  // Process PART messages received from the server.
  processMessagePart (message) {
    var sourceUser = message.source
    var channelList = message.parameters[0].split(',')
    var comment = message.parameters[1]

    channelList.forEach(channelName => {
      var channel = this.getChannelFromName(channelName)
      if (sourceUser == this.localUser) {
        this.localUser.partChannel(channel)
        this.channels.splice(this.channels.indexOf(channel))
      } else {
        channel.userParted(channel.getChannelUser(sourceUser), comment)
      }
    })
  }

  // Process MODE messages received from the server.
  processMessageMode (message) {
    function getModeAndParameters(messageParameters) {
      var modes = ''
      var modeParameters = []
      messageParameters.forEach(p => {
        if (p == null) { return }
        if (p.length != 0) {
          if (p[0] == '+' || p[0] == '-') {
              modes += p
          } else {
              modeParameters.push(p)
          }
        }
      })
      return { 'modes': modes.split(''), 'parameters': modeParameters}
    }

    function isChannelName (channelName) {
      return channelName.match(regexChannelName) != null
    }

    var newModes = message.parameters[1]
    if (this.isChannelName(message.parameters[0])) {
      var channel = this.getChannelFromName(message.parameters[0])
      var modesAndParameters = getModeAndParameters(message.parameters.slice(1))
      channel.modesChanged(message.source, modesAndParameters.modes, modesAndParameters.parameters)
      this.emit('channelMode', channel, message.source, modesAndParameters.modes, modesAndParameters.parameters)
    } else if (message.parameters[0] == this.localUser.nickName) {
      this.localUser.modesChanged(message.parameters[1])
    } else {
      throw 'Cannot set User Mode.'
    }
  }

  // Process TOPIC messages received from the server.
  processMessageTopic (message) {
    var channel = this.getChannelFromName(message.parameters[0])
    channel.topicChanged(message.source, message.parameters[1])
  }

  // Process KICK messages received from the server.
  processMessageKick (message) {
    var channelList = message.parameters[0].split(',')
    var userList = message.parameters[1]
    var comment = message.parameters[2]
    
    var channelUsers = channels
      .map((channel, i) => [channel, users[i]])
      .map((channel, user) => channel.getChannelUser(user))

    channelUsers.forEach(channelUser => {
        if (channelUser.user == this.localUser) {
            var channel = channelUser.channel
            this.channels.splice(this.channels.indexOf(channel))

            channelUser.channel.userKicked(channelUser, comment)
            this.localUser.partChannel(channel)
        } else {
          channelUser.channel.userKicked(channelUser, comment)
        }
    })
  }

  // Process INVITE messages received from the server.
  processMessageInvite (message) {
    var user = this.getUserFromNickName(message.parameters[0])
    var channel = this.getChannelFromName(message.parameters[1])
    user.inviteReceived(message.source, channel)
  }

  // Process PRIVMSG messages received from the server.
  processMessagePrivateMessage (message) {
    var targetNames = message.parameters[0].split(',')
    var messageText = message.parameters[1]

    var targets = targetNames.map(x => this.getMessageTarget(x))
    targets.forEach(t => t.messageReceived(message.source, targets, messageText))
  }

  // Process NOTICE messages received from the server.
  processMessageNotice (message) {
    var targetNames = message.parameters[0].split(',')
    var noticeText = message.parameters[1]

    if (targetNames[0] == 'AUTH') {
      this.emit('notice', message.source, noticeText)
    } else {
      var targets = targetNames.map(x => this.getMessageTarget(x))
      targets.forEach(t => t.noticeReceived(message.source, targets, noticeText))
    }
  }

  // Process PING messages received from the server.
  processMessagePing (message) {
    var server = message.parameters[0]
    var targetServer = message.parameters[1]
    
    try {
      this.emit('ping', server)    
    } finally {
      this.sendMessagePong(server, targetServer)
    }
  } 

  // Process PONG messages received from the server.
  processMessagePong (message) {
    var server = message.parameters[0]
    
    try {
      this.emit('pong', server)    
    } finally {
      this.sendMessagePong(server, targetServer)
    }
  }

  // Process ERROR messages received from the server.
  processMessageError (message) {
    var errorMessage = message.parameters[0]
    this.emit('error', errorMessage)
  }

  // - Message Responding

  // Process RPL_WELCOME responses from the server.
  processMessageReplyWelcome (message) {
    var welcomeMessage = message.parameters[1].split(' ')
    var hostMask = welcomeMessage[welcomeMessage.length - 1]
    
    var nickNameMatch = hostMask.match(regexNickNameId)
    this.localUser.nickName = nickNameMatch[1] || this.localUser.nickName
    this.localUser.userName = nickNameMatch[2] || this.localUser.userName
    this.localUser.hostName = nickNameMatch[3] || this.localUser.hostName
    
    this.isRegistered = true

    this.emit('registered')
  }

  // Process RPL_YOURHOST responses from the server.
  processMessageReplyYourHost (message) {
    this.yourHostMessage = message.parameters[1]

  }

  // Process RPL_CREATED responses from the server.
  processMessageReplyCreated (message) {
    this.serverCreatedMessage = message.parameters[1]
  }

  // Process RPL_MYINFO responses from the server.
  processMessageReplyMyInfo (message) {
    this.serverName = message.parameters[1]
    this.serverVersion = message.parameters[2]
    this.serverAvailableUserModes = message.parameters[3].split('')
    this.serverAvailableChannelModes = message.parameters[4].split('')

    this.emit('clientInfo')
  }

  // Process RPL_BOUNCE and RPL_ISUPPORT responses from the server.
  processMessageReplyBounceOrISupport (message) {
    if (message.parameters[1].startsWith('Try Server')) { 
      // RPL_BOUNCE
      var textParts = message.parameters[0].split(' ', ',')
      var serverAddress = textParts[2]
      var serverPort = int.Parse(textParts[6])

      this.emit('bounce', serverAddress, serverPort)
    } else {
      // RPL_ISUPPORT
      for (var i = 1; i < message.parameters.length - 1; i++) {
        if (message.parameters[i + 1] == null) {
          break
        }
        var paramParts = message.parameters[i].split('=')
        var paramName = paramParts[0]
        var paramValue = paramParts.length == 1 ? null : paramParts[1]
        
        if (paramName.toLowerCase() == 'prefix') {
          var prefixValueMatch = paramValue.match(regexISupportPrefix)
          var prefixes = prefixValueMatch[2]
          var modes = prefixValueMatch[1]
          
          if (prefixes.length != modes.length) {
            throw 'Message ISupport Prefix is Invalid.'
          }

          this.channelUserModes = []
          this.channelUserModes = modes.split('')

          this.channelUserModesPrefixes = {}
          for (var i = 0; i < prefixes.length; i++) {
            this.channelUserModesPrefixes[prefixes[i]] = this.channelUserModes[i]
          }
        }

        this.serverSupportedFeatures[paramName] = paramValue
      }
      
      this.emit('serverSupportedFeaturesReceived')
    }
  }

  // Process RPL_STATSLINKINFO responses from the server.
  processMessageStatsLinkInfo (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.connection,
      'message': message
    })
  }

  // Process RPL_STATSCOMMANDS responses from the server.
  processMessageStatsCommands (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.command,
      'message': message
    })
  }

  // Process RPL_STATSCLINE responses from the server.
  processMessageStatsCLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedServerConnect,
      'message': message
    })
  }

  // Process RPL_STATSNLINE responses from the server.
  processMessageStatsNLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedServerAccept,
      'message': message
    })
  }

  // Process RPL_STATSILINE responses from the server.
  processMessageStatsILine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedClient,
      'message': message
    })
  }

  // Process RPL_STATSKLINE responses from the server.
  processMessageStatsKLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.bannedClient,
      'message': message
    })
  }

  // Process RPL_STATSYLINE responses from the server.
  processMessageStatsYLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.connectionClass,
      'message': message
    })
  }

  // Process RPL_ENDOFSTATS responses from the server.
  processMessageEndOfStats (message) {
    this.emit('serverStatsReceived', this.listedStatsEntries)
    this.listedStatsEntries = []
  }

  // Process RPL_STATSLLINE responses from the server.
  processMessageStatsLLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.leafDepth,
      'message': message
    })
  }

  // Process RPL_STATSUPTIME responses from the server.
  processMessageStatsUpTime (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.uptime,
      'message': message
    })
  }

  // Process RPL_STATSOLINE responses from the server.
  processMessageStatsOLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedOperator,
      'message': message
    })
  }

  // Process RPL_STATSHLINE responses from the server.
  processMessageStatsHLine (message) {
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.hubServer,
      'message': message
    })
  }

  // Process RPL_LUSERCLIENT responses from the server.
  processMessageLUserClient (message) {
    var info = message.parameters[1]
    var infoParts = info.split(' ')
    var networkInfo = {
      'visibleUsersCount': parseInt(infoParts[2]),
      'invisibleUsersCount': parseInt(infoParts[5]),
      'serversCount': parseInt(infoParts[8])
    }

    this.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSEROP responses from the server.
  processMessageLUserOp (message) {
    var networkInfo = { 'operatorsCount': parseInt(message.parameters[1]) }
    this.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSERUNKNOWN responses from the server.
  processMessageLUserUnknown (message) {
    var networkInfo = { 'unknownConnectionsCount': parseInt(message.parameters[1]) }
    this.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSERCHANNELS responses from the server.
  processMessageLUserChannels (message) {
    var networkInfo = { 'channelsCount': parseInt(message.parameters[1]) }
    this.emit('networkInformation', networkInfo)
  }

  // Process RPL_LUSERME responses from the server.
  processMessageLUserMe (message) {
    var networkInfo = {}
    var info = message.parameters[1]
    var infoParts = info.split(' ')
    
    for (var i = 0; i < infoParts.length; i++) {
      switch (infoParts[i].toLowerCase()) {
        case 'user':
        case 'users':
          networkInfo['serverClientsCount'] = parseInt(infoParts[i - 1])
          break
        case 'server':
        case 'servers':
          networkInfo['serverServersCount'] = parseInt(infoParts[i - 1])
          break
        case 'service':
        case 'services':
          networkInfo['serverClientsCount'] = parseInt(infoParts[i - 1])
          break
      }
    }

    this.emit('networkInformation', networkInfo)
  }

  // Process RPL_AWAY responses from the server.
  processMessageReplyAway (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    user.awayMessage = message.parameters[2]
    user.isAway = true
  }

  // Process RPL_ISON responses from the server.
  processMessageReplyIsOn (message) {
    var onlineUsers = []
    var onlineUserNames = message.parameters[1].split(' ')
    onlineUserNames.forEach(name => {
      var onlineUser = this.getUserFromNickName(name)
      onlineUser.isOnline = true    
    })
  }

  // Process RPL_UNAWAY responses from the server.
  processMessageReplyUnAway (message) {
    this.localUser.isAway = false
  }

  // Process RPL_NOWAWAY responses from the server.
  processMessageReplyNowAway (message) {
    this.localUser.isAway = true
  }

  // Process RPL_WHOISUSER responses from the server.
  processMessageReplyWhoIsUser (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    user.userName = message.parameters[2]
    user.hostName = message.parameters[3]
    user.realName = message.parameters[5]
  }

  // Process RPL_WHOISSERVER responses from the server.
  processMessageReplyWhoIsServer (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    user.serverName = message.parameters[2]
    user.serverInfo = message.parameters[3]
  }

  // Process RPL_WHOISOPERATOR responses from the server.
  processMessageReplyWhoIsOperator (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    user.isOperator = true
  }

  // Process RPL_WHOWASUSER responses from the server.
  processMessageReplyWhoWasUser (message) {
    var user = this.getUserFromNickName(message.parameters[1], false)
    user.userName = message.parameters[2]
    user.hostName = message.parameters[3]
    user.realName = message.parameters[5]
  }

  // Process RPL_ENDOFWHO responses from the server.
  processMessageReplyEndOfWho (message) {
    var mask = message.parameters[1]
    this.emit('whoReply', mask)
  }

  // Process RPL_WHOISIDLE responses from the server.
  processMessageReplyWhoIsIdle (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    user.idleDuration = intParse(message.parameters[2])
  }

  // Process RPL_ENDOFWHOIS responses from the server.
  processMessageReplyEndOfWhoIs (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    this.emit('whoIsReply', user)
  }

  // Process RPL_WHOISCHANNELS responses from the server.
  processMessageReplyWhoIsChannels (message) {
    var user = this.getUserFromNickName(message.parameters[1])
    var channelIds = message.parameters[2].split(' ')
    channelIds.forEach(channelId => {
      if (channelId.length == 0) {
        return
      }
      var lookup = this.getUserModeAndIdentifier(channelId)
      var channel = GetChannelFromName(lookup.identifier)
      if (channel.getChannelUser(user) == null) {
        channel.userJoined(new IrcChannelUser(user, lookup.mode.split('')))
      }    
    })
  }

  // Process RPL_LIST responses from the server.
  processMessageReplyList (message) {
    var channelName = message.parameters[1]
    var visibleUsersCount = parseInt(message.parameters[2])
    var topic = message.parameters[3]

    this.listedChannels.push({ 'channelName': channelName, 'visibleUsersCount': visibleUsersCount, 'topic': topic })
  }

  // Process RPL_LISTEND responses from the server.
  processMessageReplyListEnd (message) {
    this.emit('channelList', listedChannels)
    this.listedChannels = []
  }

  // Process RPL_NOTOPIC responses from the server.
  processMessageReplyNoTopic (message) {
    var channel = this.getChannelFromName(message.parameters[1])
    channel.topicChanged(null, null)
  }

  // Process RPL_TOPIC responses from the server.
  processMessageReplyTopic (message) {
    var channel = this.getChannelFromName(message.parameters[1])
    channel.topicChanged(null, message.parameters[2])
  }

  // Process RPL_INVITING responses from the server.
  processMessageReplyInviting (message) {
    var invitedUser = this.getUserFromNickName(message.parameters[1])
    var channel = this.getChannelFromName(message.parameters[2])
    channel.userInvited(invitedUser)
  }

  // Process RPL_VERSION responses from the server.
  processMessageReplyVersion (message) {
    var versionInfo = message.parameters[1]
    var versionSplitIndex = versionInfo.lastIndexOf('.')
    var version = versionInfo.substr(0, versionSplitIndex)
    var debugLevel = versionInfo.substr(versionSplitIndex + 1)
    var server = message.parameters[2]
    var comments = message.parameters[3]

    this.emit('serverVersionInfo', { 
      'version': version, 
      'debugLevel': debugLevel, 
      'server': server, 
      'comments': comments 
    })
  }

  // Process RPL_WHOREPLY responses from the server.
  processMessageReplyWhoReply (message) {
    var channel = message.parameters[1] == '*' ? null : this.getChannelFromName(message.parameters[1])
    var user = this.getUserFromNickName(message.parameters[5])

    var userName = message.parameters[2]
    user.hostName = message.parameters[3]
    user.serverName = message.parameters[4]

    var userModeFlags = message.parameters[6]
    if (userModeFlags.includes('H')) {
      user.IsAway = false;
    }
    else if (userModeFlags.includes('G')) {
      user.IsAway = true;
    }
    
    user.IsOperator = userModeFlags.includes('*')
    
    if (channel != null)
    {
        var channelUser = channel.getChannelUser(user)
        if (channelUser == null)
        {
            channelUser = new IrcChannelUser(user)
            channel.userJoined(channelUser)
        }

        userModeFlags.forEach(c => {
            var mode = channelUserModesPrefixes[c]
            if (mode != null) {
              channelUser.modeChanged(true, mode)
            } else {
              return
            }
        })
    }

    var lastParamParts = message.parameters[7].split(' ')
    user.HopCount = parseInt(lastParamParts[0])
    if (lastParamParts.length > 1) {
      user.realName = lastParamParts[1]
    }
  }

  // Process RPL_NAMEREPLY responses from the server.
  processMessageReplyNameReply (message) {
    function getChannelType (type) {
      switch (type) {
        case '=':
          return IrcChannelType.public
          break
        case '*':
          return IrcChannelType.private
          break
        case '@':
          return IrcChannelType.secret
          break
        default:
          throw 'Invalid Channel Type'
      }
    }

    var channel = this.getChannelFromName(message.parameters[2])
    if (channel != null) {
      channel.typeChanged(getChannelType(message.parameters[1][0]))

      var userIds = message.parameters[3].split(' ')
      userIds.forEach(userId => {
          if (userId.length == 0) {
            return
          }

          var userNickNameAndMode = this.getUserModeAndIdentifier(userId)
          var user = this.getUserFromNickName(userNickNameAndMode.identifier)
          channel.userNameReply(new IrcChannelUser(user, userNickNameAndMode.mode.split('')))
      })
    }
  }

  // Process RPL_LINKS responses from the server.
  processMessageReplyLinks (message) {
    var hostName = message.parameters[1]
    var infoParts = message.parameters[3].split(' ')
    var hopCount = parseInt(infoParts[0])
    var info = infoParts[1]

    this.listedServerLinks.Add({ 'hostName': hostName, 'hopCount': hopCount, 'info': info });
  }

  // Process RPL_ENDOFLINKS responses from the server.
  processMessageReplyEndOfLinks (message) {
    this.emit('serverLinksList', this.listedServerLinks)
    this.listedServerLinks = []
  }

  // Process RPL_ENDOFNAMES responses from the server.
  processMessageReplyEndOfNames (message) {
    var channel = this.getChannelFromName(message.parameters[1])
    channel.usersListReceived()
  }

  // Process RPL_ENDOFWHOWAS responses from the server.
  processMessageReplyEndOfWhoWas (message) {
    this.emit('whoWasReply', this.getUserFromNickName(message.parameters[1], false))
  }

  // Process RPL_MOTD responses from the server.
  processMessageReplyMotd (message) {
    this.messageOfTheDay += message.parameters[1] + '\r\n'
  }

  // Process RPL_MOTDSTART responses from the server.
  processMessageReplyMotdStart (message) {
    this.messageOfTheDay = ''
  }

  // Process RPL_ENDOFMOTD responses from the server.
  processMessageReplyMotdEnd (message) {
    this.messageOfTheDay += message.parameters[1]
    this.emit('motd', this.messageOfTheDay)
  }

  //  Process RPL_YOURESERVICE responses from the server.
  processMessageReplyYouAreService (message) {
    // TODO
  }

  // Process RPL_TIME responses from the server.
  processMessageReplyTime (message) {
    // TODO
  }

  processMessageNumericError (message) {
    var errorParameters = []
    var errorMessage = null;
    for (var i = 1; i < message.parameters.length; i++) {
        if (i + 1 == message.parameters.length || message.parameters[i + 1] == null) {
            errorMessage = message.parameters[i]
            break
        }
        errorParameters.push(message.parameters[i])
    }

    this.emit('protocolError', parseInt(message.command), errorParameters, errorMessage)
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

  getMessageTarget (targetName) {
    if (targetName == null) {
      throw 'targetName is null.'
    }

    if (targetName.length == 0) {
      throw 'targetName cannot be empty string.'
    }

    if (targetName == '*') {
      return this
    }

    var channelName = null
    var channelNameMatch = targetName.match(regexChannelName)
    if (channelNameMatch != null) {
      channelName = channelNameMatch[1]
    }

    var nickName = null
    var nickNameMatch = targetName.match(regexNickNameId)
    if (nickNameMatch != null) {
      nickName = nickNameMatch[1]
    }

    var userName = null
    var userNameMatch = targetName.match(regexUserNameId)
    if (userNameMatch != null) {
      userName = userNameMatch[1]
    }

    var hostName = null
    var hostNameMatch = targetName.match(regexHostName)
    if (hostNameMatch != null) {
      hostName = hostNameMatch[1]
    }

    var serverName = null
    var serverNameMatch = targetName.match(regexServerName)
    if (serverNameMatch != null) {
      serverName = serverNameMatch[1]
    }

    var targetMask = null
    var targetMaskMatch = targetName.match(regexTargetMask)
    if (targetMaskMatch != null) {
      targetMask = targetMaskMatch[1]
    }
    
    if (channelName != null) {
      return this.getChannelFromName(channelName)
    }

    if (nickName != null) {
      var user = this.getUserFromNickName(nickName, true)
      if (user.userName == null) {
        user.userName = userName
      }
      if (user.hostName == null) {
        user.hostName = hostName
      }
      return user
    }
    
    if (userName != null) {
      var user = this.getUserFromNickName(nickName, true)
      if (user.hostName == null) {
        user.hostName = hostName
      }
      return user
    }

    if (targetMask != null) {
      if (targetMask == '$') {
        return '$' // Server Mask
      } else if (targetMask == '#') {
        return '#' // Host Mask
      } else {
        throw 'Invalid targetMask.'
      }
    }

    throw `Invalid targetName.`
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

  getChannelFromName (channelName) {
    var existingChannel = this.channels.find(c => c.name == channelName)
    if (existingChannel != null) {
      return existingChannel
    }
    var newChannel = new IrcChannel(this, channelName)
    this.channels.push(newChannel)
    return newChannel
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

  getUserModeAndIdentifier (identifier) {
    var mode = identifier[0]
    let channelUserMode = this.channelUserModesPrefixes[mode]
    if (channelUserMode != null) {
      return { 'mode': channelUserMode, 'identifier': identifier.substring(1) }
    }
    return { 'mode': '', 'identifier': identifier }
  }
}
