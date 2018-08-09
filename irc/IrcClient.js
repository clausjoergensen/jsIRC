// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const util = require('util')
const events = require('events')

const { EventEmitter } = events

const IrcUser = require('./IrcUser.js')
const IrcChannel = require('./IrcChannel.js')
const IrcServer = require('./IrcServer.js')
const IrcChannelUser = require('./IrcChannelUser.js')

const maxParamsCount = 15
const defaultPort = 6667

const regexNickName = '([^!@]+)'
const regexUserName = '([^!@]+)'
const regexHostName = '([^%@]+)'
const regexChannelName = '([#+!&].+)'
const regexTargetMask = '([$#].+)'
const regexServerName = '([^%@]+?\.[^%@]*)'
const regexNickNameId = `${regexNickName}(?:(?:!${regexUserName})?@${regexHostName})?`
const regexUserNameId = `${regexUserName}(?:(?:%${regexHostName})?@${regexServerName}|%${regexUserName})`
const regexISupportPrefix = '\((.*)\)(.*)'

// ------------------- Public Functions  --------------------------------------

function IrcClient () {
  EventEmitter.call(this)
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
  this.channelUserModes = []
  this.channelUserModesPrefixes = {}
  this.messageOfTheDay = null
  this.listedServerLinks = []
  this.listedChannels = []
  this.listedStatsEntries = []
  this.messageProcessors = {
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

IrcClient.prototype.connect = function (hostName, port, registrationInfo) {
  this.registrationInfo = registrationInfo

  this.socket.on('data', this.dataReceived.bind(this))
  this.socket.on('close', this.connectionClosed.bind(this))
  this.socket.on('error', this.connectionError.bind(this))

  this.emit('connecting')
  this.socket.connect(port, hostName, this.connected.bind(this))
}

IrcClient.prototype.disconnect = function () {
  this.socket.disconnect()
}

IrcClient.prototype.listChannels = function (channelNames = null) {
  this.sendMessageList(channelNames)
}

IrcClient.prototype.getMessageOfTheDay = function (targetServer = null) {
  this.sendMessageMotd(targetServer)
}

IrcClient.prototype.getNetworkInfo = function (serverMask = null, targetServer = null) {
  this.sendMessageLUsers(serverMask, targetServer)
}

IrcClient.prototype.getServerVersion = function (targetServer = null) {
  this.sendMessageVersion(targetServer)
}

IrcClient.prototype.getServerStatistics = function (query = null, targetServer = null) {
  this.sendMessageStats(query == null ? null : query, targetServer)
}

IrcClient.prototype.getServerLinks = function (serverMask = null, targetServer = null) {
  this.sendMessageLinks(serverMask, targetServer)
}

IrcClient.prototype.getServerTime = function (targetServer = null) {
  this.sendMessageTime(targetServer)
}

IrcClient.prototype.ping = function (targetServer = null) {
  this.sendMessagePing(this.localUser.nickName, targetServer)
}

IrcClient.prototype.queryWho = function (mask = null, onlyOperators = false) {
  this.sendMessageWho(mask, onlyOperators)
}

IrcClient.prototype.queryWhoIs = function (nickNameMasks) {
  this.sendMessageWhoIs(nickNameMasks)
}

IrcClient.prototype.queryWhoWas = function (nickNames, entriesCount = -1) {
  this.sendMessageWhoWas(nickNames, entriesCount)
}

IrcClient.prototype.quit = function (comment = null) {
  this.sendMessageQuit(comment)
}

IrcClient.prototype.sendRawMessage = function (message) {
  if (this.loggingEnabled) {
    console.log('-> ' + message)
  }

  this.socket.write(message + '\r\n')
}

// ------------------- Socket Operations  -------------------------------------

IrcClient.prototype.connected = function () {
  if (this.registrationInfo.password != null) {
    this.sendMessagePassword(this.registrationInfo.password)
  }
  
  this.sendMessageNick(this.registrationInfo.nickName)
  this.sendMessageUser(this.registrationInfo.userName, 
                       this.getNumericUserMode(this.registrationInfo.userModes),
                       this.registrationInfo.realName)

  var localUser = new IrcUser(this)
  localUser.isLocalUser = true
  localUser.isOnline = true
  localUser.nickName = this.registrationInfo.nickName
  localUser.userName = this.registrationInfo.userName
  localUser.realName = this.registrationInfo.userName
  localUser.userModes = this.registrationInfo.userModes

  this.localUser = localUser
  this.users.push(localUser)

  this.emit('connected')
}

IrcClient.prototype.connectionClosed = function () {
  this.emit('disconnected')
  this.localUser = null
}

IrcClient.prototype.connectionError = function (error) {
  this.emit('connectionError', error)
}

IrcClient.prototype.dataReceived = function (data) {
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

// ------------------- Data Parsing  ------------------------------------------

IrcClient.prototype.parseMessage = function (line) {
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

IrcClient.prototype.readMessage = function (message, line) {
  var messageProcessor = this.messageProcessors[message.command]
  if (messageProcessor != null) {
    messageProcessor(message)
  }
}

IrcClient.prototype.writeMessage = function (prefix, command, parameters = []) {
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

// ------------------- Message Receiving --------------------------------------

// Process NICK messages received from the server.
IrcClient.prototype.processMessageNick = function (message) {
  var sourceUser = message.source
  var newNickName = message.parameters[0]
  sourceUser.nickName = newNickName
}

// Process QUIT messages received from the server.
IrcClient.prototype.processMessageQuit = function (message) {
  var sourceUser = message.source
  var comment = message.parameters[0]
  
  sourceUser.quit(comment)
  
  let idx = this.users.indexOf(sourceUser)
  if (idx != -1) {
    this.users.splice(idx)
  }
}

// Process JOIN messages received from the server.
IrcClient.prototype.processMessageJoin = function (message) {
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
IrcClient.prototype.processMessagePart = function (message) {
  var sourceUser = message.source
  var channelList = message.parameters[0].split(',')
  var comment = message.parameters[1]

  channelList.forEach(channelName => {
    var channel = this.getChannelFromName(channelName)
    if (sourceUser == this.localUser) {
      this.localUser.partChannel(channel)
    } else {
      channel.userParted(channel.getChannelUser(sourceUser), comment)
    }
  })
}

// Process MODE messages received from the server.
IrcClient.prototype.processMessageMode = function (message) {
  var newModes = message.parameters[1]
  if (this.isChannelName(message.parameters[0])) {
    //
  } else if (message.parameters[0] == this.localUser.nickName) {
    //
  } else {
    throw 'Cannot set User Mode.'
  }
}

// Process TOPIC messages received from the server.
IrcClient.prototype.processMessageTopic = function (message) {
  var channel = this.getChannelFromName(message.parameters[0])
  channel.topicChanged(message.source, message.parameters[1])
}

// Process KICK messages received from the server.
IrcClient.prototype.processMessageKick = function (message) {
  var channelList = message.parameters[0].split(',')
  var userList = message.parameters[1]
  var comment = message.parameters[2]
}

// Process INVITE messages received from the server.
IrcClient.prototype.processMessageInvite = function (message) {
  var user = this.getUserFromNickName(message.parameters[0])
  var channel = this.getChannelFromName(message.parameters[1])
  user.inviteReceived(message.source, channel)
}

// Process PRIVMSG messages received from the server.
IrcClient.prototype.processMessagePrivateMessage = function (message) {
  var targetNames = message.parameters[0].split(',')
  var messageText = message.parameters[1]

  var targets = targetNames.map(x => this.getMessageTarget(x))
  targets.forEach(t => t.messageReceived(message.source, targets, messageText))
}

IrcClient.prototype.messageReceived = function (source, targets, noticeText) {
  this.emit('message', source, messageText)
}

// Process NOTICE messages received from the server.
IrcClient.prototype.processMessageNotice = function (message) {
  var targetNames = message.parameters[0].split(',')
  var noticeText = message.parameters[1]

  var targets = targetNames.map(x => this.getMessageTarget(x))
  targets.forEach(t => t.noticeReceived(message.source, targets, noticeText))
}

IrcClient.prototype.noticeReceived = function (source, targets, noticeText) {
  this.emit('notice', source, noticeText)
}

// Process PING messages received from the server.
IrcClient.prototype.processMessagePing = function (message) {
  var server = message.parameters[0]
  var targetServer = message.parameters[1]
  
  try {
    this.emit('ping', server)    
  } finally {
    this.sendMessagePong(server, targetServer)
  }
} 

// Process PONG messages received from the server.
IrcClient.prototype.processMessagePong = function (message) {
  var server = message.parameters[0]
  
  try {
    this.emit('pong', server)    
  } finally {
    this.sendMessagePong(server, targetServer)
  }
}

// Process ERROR messages received from the server.
IrcClient.prototype.processMessageError = function (message) {
  var errorMessage = message.parameters[0]
  this.emit('error', errorMessage)
}

// ------------------- Message Responding -------------------------------------

// Process RPL_WELCOME responses from the server.
IrcClient.prototype.processMessageReplyWelcome = function (message) {
  var welcomeMessage = message.parameters[1].split(' ')
  var hostMask = welcomeMessage[welcomeMessage.length - 1]
  
  var nickNameMatch = hostMask.match(regexNickNameId)
  this.localUser.nickName = nickNameMatch[1] || localUser.nickName
  this.localUser.userName = nickNameMatch[2] || localUser.userName
  this.localUser.hostName = nickNameMatch[3] || localUser.hostName
  
  this.isRegistered = true

  this.emit('registered')
}

// Process RPL_YOURHOST responses from the server.
IrcClient.prototype.processMessageReplyYourHost = function (message) {
  this.yourHostMessage = message.parameters[1]

}

// Process RPL_CREATED responses from the server.
IrcClient.prototype.processMessageReplyCreated = function (message) {
  this.serverCreatedMessage = message.parameters[1]
}

// Process RPL_MYINFO responses from the server.
IrcClient.prototype.processMessageReplyMyInfo = function (message) {
  this.serverName = message.parameters[1]
  this.serverVersion = message.parameters[2]
  this.serverAvailableUserModes = message.parameters[3].split('')
  this.serverAvailableChannelModes = message.parameters[4].split('')

  this.emit('clientInfo')
}

// Process RPL_BOUNCE and RPL_ISUPPORT responses from the server.
IrcClient.prototype.processMessageReplyBounceOrISupport = function (message) {
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
      
      this.handleISupportParameter(paramName, paramValue)
      this.serverSupportedFeatures[paramName] = paramValue
    }
    
    this.emit('serverSupportedFeaturesReceived')
  }
}

// Process RPL_STATSLINKINFO responses from the server.
IrcClient.prototype.processMessageStatsLinkInfo = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.connection,
    'message': message
  })
}

// Process RPL_STATSCOMMANDS responses from the server.
IrcClient.prototype.processMessageStatsCommands = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.command,
    'message': message
  })
}

// Process RPL_STATSCLINE responses from the server.
IrcClient.prototype.processMessageStatsCLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.allowedServerConnect,
    'message': message
  })
}

// Process RPL_STATSNLINE responses from the server.
IrcClient.prototype.processMessageStatsNLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.allowedServerAccept,
    'message': message
  })
}

// Process RPL_STATSILINE responses from the server.
IrcClient.prototype.processMessageStatsILine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.allowedClient,
    'message': message
  })
}

// Process RPL_STATSKLINE responses from the server.
IrcClient.prototype.processMessageStatsKLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.bannedClient,
    'message': message
  })
}

// Process RPL_STATSYLINE responses from the server.
IrcClient.prototype.processMessageStatsYLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.connectionClass,
    'message': message
  })
}

// Process RPL_ENDOFSTATS responses from the server.
IrcClient.prototype.processMessageEndOfStats = function (message) {
  this.emit('serverStatsReceived', this.listedStatsEntries)
  this.listedStatsEntries = []
}

// Process RPL_STATSLLINE responses from the server.
IrcClient.prototype.processMessageStatsLLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.leafDepth,
    'message': message
  })
}

// Process RPL_STATSUPTIME responses from the server.
IrcClient.prototype.processMessageStatsUpTime = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.uptime,
    'message': message
  })
}

// Process RPL_STATSOLINE responses from the server.
IrcClient.prototype.processMessageStatsOLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.allowedOperator,
    'message': message
  })
}

// Process RPL_STATSHLINE responses from the server.
IrcClient.prototype.processMessageStatsHLine = function (message) {
  this.listedStatsEntries.push({
    'type': IrcServerStatisticalEntryCommonType.hubServer,
    'message': message
  })
}

// Process RPL_LUSERCLIENT responses from the server.
IrcClient.prototype.processMessageLUserClient = function (message) {
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
IrcClient.prototype.processMessageLUserOp = function (message) {
  var networkInfo = { 'operatorsCount': parseInt(message.parameters[1]) }
  this.emit('networkInformationReceived', networkInfo)
}

// Process RPL_LUSERUNKNOWN responses from the server.
IrcClient.prototype.processMessageLUserUnknown = function (message) {
  var networkInfo = { 'unknownConnectionsCount': parseInt(message.parameters[1]) }
  this.emit('networkInformationReceived', networkInfo)
}

// Process RPL_LUSERCHANNELS responses from the server.
IrcClient.prototype.processMessageLUserChannels = function (message) {
  var networkInfo = { 'channelsCount': parseInt(message.parameters[1]) }
  this.emit('networkInformation', networkInfo)
}

// Process RPL_LUSERME responses from the server.
IrcClient.prototype.processMessageLUserMe = function (message) {
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
IrcClient.prototype.processMessageReplyAway = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  user.awayMessage = message.parameters[2]
  user.isAway = true
}

// Process RPL_ISON responses from the server.
IrcClient.prototype.processMessageReplyIsOn = function (message) {
  var onlineUsers = []
  var onlineUserNames = message.parameters[1].split(' ')
  onlineUserNames.forEach(name => {
    var onlineUser = this.getUserFromNickName(name)
    onlineUser.isOnline = true    
  })
}

// Process RPL_UNAWAY responses from the server.
IrcClient.prototype.processMessageReplyUnAway = function (message) {
  this.localUser.isAway = false
}

// Process RPL_NOWAWAY responses from the server.
IrcClient.prototype.processMessageReplyNowAway = function (message) {
  this.localUser.isAway = true
}

// Process RPL_WHOISUSER responses from the server.
IrcClient.prototype.processMessageReplyWhoIsUser = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  user.userName = message.parameters[2]
  user.hostName = message.parameters[3]
  user.realName = message.parameters[5]
}

// Process RPL_WHOISSERVER responses from the server.
IrcClient.prototype.processMessageReplyWhoIsServer = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  user.serverName = message.parameters[2]
  user.serverInfo = message.parameters[3]
}

// Process RPL_WHOISOPERATOR responses from the server.
IrcClient.prototype.processMessageReplyWhoIsOperator = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  user.isOperator = true
}

// Process RPL_WHOWASUSER responses from the server.
IrcClient.prototype.processMessageReplyWhoWasUser = function (message) {
  var user = this.getUserFromNickName(message.parameters[1], false)
  user.userName = message.parameters[2]
  user.hostName = message.parameters[3]
  user.realName = message.parameters[5]
}

// Process RPL_ENDOFWHO responses from the server.
IrcClient.prototype.processMessageReplyEndOfWho = function (message) {
  var mask = message.parameters[1]
  this.emit('whoReply', mask)
}

// Process RPL_WHOISIDLE responses from the server.
IrcClient.prototype.processMessageReplyWhoIsIdle = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  user.idleDuration = intParse(message.parameters[2])
}

// Process RPL_ENDOFWHOIS responses from the server.
IrcClient.prototype.processMessageReplyEndOfWhoIs = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  this.emit('whoIsReply', user)
}

// Process RPL_WHOISCHANNELS responses from the server.
IrcClient.prototype.processMessageReplyWhoIsChannels = function (message) {
  var user = this.getUserFromNickName(message.parameters[1])
  var channelIds = message.parameters[2].split(' ')
  channelIds.forEach(channelId => {
    if (channelId.length == 0) {
      return
    }
    var lookup = this.getUserModeAndIdentifier(channelId)
    var channel = GetChannelFromName(lookup.identifier)
    if (channel.getChannelUser(user) == null) {
      channel.userJoined(new IrcChannelUser(user, lookup.mode))
    }    
  })
}

// Process RPL_LIST responses from the server.
IrcClient.prototype.processMessageReplyList = function (message) {
  var channelName = message.parameters[1]
  var visibleUsersCount = parseInt(message.parameters[2])
  var topic = message.parameters[3]

  this.listedChannels.push({ 'channelName': channelName, 'visibleUsersCount': visibleUsersCount, 'topic': topic })
}

// Process RPL_LISTEND responses from the server.
IrcClient.prototype.processMessageReplyListEnd = function (message) {
  this.emit('channelList', listedChannels)
  this.listedChannels = []
}

// Process RPL_NOTOPIC responses from the server.
IrcClient.prototype.processMessageReplyNoTopic = function (message) {
  var channel = this.getChannelFromName(message.parameters[1])
  channel.topicChanged(null, null)
}

// Process RPL_TOPIC responses from the server.
IrcClient.prototype.processMessageReplyTopic = function (message) {
  var channel = this.getChannelFromName(message.parameters[1])
  channel.topicChanged(null, message.parameters[2])
}

// Process RPL_INVITING responses from the server.
IrcClient.prototype.processMessageReplyInviting = function (message) {
  var invitedUser = this.getUserFromNickName(message.parameters[1])
  var channel = this.getChannelFromName(message.parameters[2])
  channel.userInvited(invitedUser)
}

// Process RPL_VERSION responses from the server.
IrcClient.prototype.processMessageReplyVersion = function (message) {
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
IrcClient.prototype.processMessageReplyWhoReply = function (message) {
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
IrcClient.prototype.processMessageReplyNameReply = function (message) {
  var channel = this.getChannelFromName(message.parameters[2])
  if (channel != null) {
    channel.typeChanged(this.getChannelType(message.parameters[1][0]))

    var userIds = message.parameters[3].split(' ')
    userIds.forEach(userId => {
        if (userId.length == 0) {
          return
        }

        var userNickNameAndMode = this.getUserModeAndIdentifier(userId)
        var user = this.getUserFromNickName(userNickNameAndMode.identifier)
        channel.userNameReply(new IrcChannelUser(user, userNickNameAndMode.mode))
    })
  }
}

// Process RPL_LINKS responses from the server.
IrcClient.prototype.processMessageReplyLinks = function (message) {
  var hostName = message.parameters[1]
  var infoParts = message.parameters[3].split(' ')
  var hopCount = parseInt(infoParts[0])
  var info = infoParts[1]

  this.listedServerLinks.Add({ 'hostName': hostName, 'hopCount': hopCount, 'info': info });
}

// Process RPL_ENDOFLINKS responses from the server.
IrcClient.prototype.processMessageReplyEndOfLinks = function (message) {
  this.emit('serverLinksList', this.listedServerLinks)
  this.listedServerLinks = []
}

// Process RPL_ENDOFNAMES responses from the server.
IrcClient.prototype.processMessageReplyEndOfNames = function (message) {
  var channel = this.getChannelFromName(message.parameters[1])
  channel.usersListReceived()
}

// Process RPL_ENDOFWHOWAS responses from the server.
IrcClient.prototype.processMessageReplyEndOfWhoWas = function (message) {
  this.emit('whoWasReply', this.getUserFromNickName(message.parameters[1], false))
}

// Process RPL_MOTD responses from the server.
IrcClient.prototype.processMessageReplyMotd = function (message) {
  this.messageOfTheDay += message.parameters[1] + '\r\n'
}

// Process RPL_MOTDSTART responses from the server.
IrcClient.prototype.processMessageReplyMotdStart = function (message) {
  this.messageOfTheDay = ''
}

// Process RPL_ENDOFMOTD responses from the server.
IrcClient.prototype.processMessageReplyMotdEnd = function (message) {
  this.messageOfTheDay += message.parameters[1]
  this.emit('motd', this.messageOfTheDay)
}

//  Process RPL_YOURESERVICE responses from the server.
IrcClient.prototype.processMessageReplyYouAreService = function (message) {
}

// Process RPL_TIME responses from the server.
IrcClient.prototype.processMessageReplyTime = function (message) {
}

// ------------------- Message Sending ----------------------------------------

IrcClient.prototype.sendMessagePassword =  function (password) {
  this.writeMessage(null, 'PASS', [password])
}

IrcClient.prototype.sendMessageNick =  function (nickName) {
  this.writeMessage(null, 'NICK', [nickName])
}

IrcClient.prototype.sendMessageUser =  function (userName, userMode, realName) {
  this.writeMessage(null, 'USER', [userName, userMode, '*', realName])
}

IrcClient.prototype.sendMessageService = function (nickName, distribution, description = '') {
  this.writeMessage(null, 'SERVICE', [nickName, distribution, '0', '0', description])
}

IrcClient.prototype.sendMessageOper = function (userName, password) {
  this.writeMessage(null, 'OPER', [userName, password])
}

IrcClient.prototype.sendMessageUserMode = function (nickName, modes = null) {
  this.writeMessage(null, 'MODE', [nickName, modes])
}

IrcClient.prototype.sendMessageQuit = function (comment) {
  this.writeMessage(null, 'QUIT', [comment])
}

IrcClient.prototype.sendMessageSQuit = function (targetServer, comment) {
  this.writeMessage(null, 'SQUIT', [targetServer, comment])
}

IrcClient.prototype.sendMessageLeaveAll = function () {
  this.writeMessage(null, 'JOIN', ['0'])
}

IrcClient.prototype.sendMessageJoin = function (channels, comment = null) {
  this.writeMessage(null, 'JOIN', [channels.join(','), comment])
}

IrcClient.prototype.sendMessagePart = function (channels, comment = null) {
  this.writeMessage(null, 'PART', [channels.join(','), comment])
}

IrcClient.prototype.sendMessageChannelMode = function (channel, modes = null, modeParameters = null) {
  this.writeMessage(null, 'MODE', [channel, modes, modeParameters == null ? null : modeParameters.join(',')])
}

IrcClient.prototype.sendMessageTopic = function (channel, topic = null) {
  this.writeMessage(null, 'TOPIC', [channel, topic])
}

IrcClient.prototype.sendMessageNames = function (channels = null, targetServer = null) {
  this.writeMessage(null, 'NAMES', [channels == null ? null : channels.join(','), targetServer])
}

IrcClient.prototype.sendMessageList = function (channels = null, targetServer = null) {
  this.writeMessage(null, 'LIST', [channels == null ? null : channels.join(','), targetServer])
}

IrcClient.prototype.sendMessageInvite = function (channel, nickName) {
  this.writeMessage(null, 'INVITE', [nickName, channel])
}

IrcClient.prototype.sendMessageKick = function (channelName, nickNames, comment = null) {
  this.writeMessage(null, 'KICK', [channelName, nickNames.join(','), comment])
}

IrcClient.prototype.sendMessagePrivateMessage = function (targets, text) {
  this.writeMessage(null, 'PRIVMSG', [targets.join(','), text])
}

IrcClient.prototype.sendMessageNotice = function (targets, text) {
  this.writeMessage(null, 'NOTICE', [targets.join(','), text])
}

IrcClient.prototype.sendMessageMotd = function (targetServer = null) {
  this.writeMessage(null, 'MOTD', [targetServer])
}

IrcClient.prototype.sendMessageLUsers = function (serverMask = null, targetServer = null) {
  this.writeMessage(null, 'LUSERS', [serverMask, targetServer])
}

IrcClient.prototype.sendMessageVersion = function (targetServer = null) {
  this.writeMessage(null, 'VERSION', [targetServer])
}

IrcClient.prototype.sendMessageStats = function (query = null, targetServer = null) {
  this.writeMessage(null, 'STATS', [query, targetServer])
}

IrcClient.prototype.sendMessageLinks = function (serverMask = null, targetServer = null) {
  this.writeMessage(null, 'LINKS', [serverMask, targetServer])
}

IrcClient.prototype.sendMessageTime = function (targetServer = null) {
  this.writeMessage(null, 'TIME', [targetServer])
}

IrcClient.prototype.sendMessageConnect = function (hostName, port, targetServer = null) {
  this.writeMessage(null, 'CONNECT', [hostName, port.toString(), targetServer])
}

IrcClient.prototype.sendMessageTrace = function (targetServer = null) {
  this.writeMessage(null, 'TRACE', [targetServer])
}

IrcClient.prototype.sendMessageAdmin = function (targetServer = null) {
  this.writeMessage(null, 'ADMIN', [targetServer])
}

IrcClient.prototype.sendMessageInfo = function (targetServer = null) {
  this.writeMessage(null, 'INFO', [targetServer])
}

IrcClient.prototype.sendMessageServiceList = function (mask = null, type = null) {
  this.writeMessage(null, 'SERVLIST', [mask, type])
}

IrcClient.prototype.sendMessageSQuery = function (serviceName, text) {
  this.writeMessage(null, 'SQUERY', [serviceName, text])
}

IrcClient.prototype.sendMessageKill =  function (nickName, comment) {
  this.writeMessage(null, 'KILL', [nickName, comment])
}

IrcClient.prototype.sendMessageWhoWas =  function (nickNames, entriesCount = -1, targetServer = null) {
  this.writeMessage(null, 'WHOWAS', [nickNames.join(','), entriesCount.toString(), targetServer])
}

IrcClient.prototype.sendMessageWhoIs = function (nickNameMasks, targetServer = null) {
  this.writeMessage(null, 'WHOIS', [targetServer, nickNameMasks.join(',')])
}

IrcClient.prototype.sendMessageWho = function (mask = null, onlyOperators = false) {
  this.writeMessage(null, 'WHO', [mask, onlyOperators ? 'o' : null])
}

IrcClient.prototype.sendMessageJoin = function (channelName) {
  this.writeMessage(null, 'JOIN', [channelName])
}

IrcClient.prototype.sendMessagePing = function (server, targetServer = null) {
  this.writeMessage(null, 'PING', [server, targetServer])
}

IrcClient.prototype.sendMessagePong = function (server, targetServer = null) {
  this.writeMessage(null, 'PONG', [server, targetServer])
}

IrcClient.prototype.sendMessageAway =  function (text = null) {
  this.writeMessage(null, 'AWAY', [text])
}

IrcClient.prototype.sendMessageRehash =  function () {
  this.writeMessage(null, 'REHASH')
}

IrcClient.prototype.sendMessageDie =  function () {
  this.writeMessage(null, 'DIE')
}

IrcClient.prototype.sendMessageRestart =  function () {
  this.writeMessage(null, 'RESTART')
}

IrcClient.prototype.sendMessageUsers =  function (targetServer = null) {
  this.writeMessage(null, 'USERS', [targetServer])
}

IrcClient.prototype.sendMessageWallops =  function (text) {
  this.writeMessage(null, 'WALLOPS', [text])
}

IrcClient.prototype.sendMessageUserHost =  function (nickNames) {
  this.writeMessage(null, 'USERHOST', nickNames)
}

IrcClient.prototype.sendMessageIsOn =  function (nickNames) {
  this.writeMessage(null, 'ISON', nickNames)
}


// ------------------- Utils  -------------------------------------------------

IrcClient.prototype.getNumericUserMode = function (modes) {
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

IrcClient.prototype.getMessageTarget = function (targetName) {
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

IrcClient.prototype.getSourceFromPrefix = function (prefix) {
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

IrcClient.prototype.getServerFromHostName = function (hostName) {
  var existingServer = this.servers.find(s => s.hostName == hostName)
  if (existingServer != null) {
    return existingServer
  }
  var newServer = new IrcServer(hostName)
  this.servers.push(newServer)
  return newServer
}

IrcClient.prototype.getChannelFromName = function (channelName) {
  var existingChannel = this.channels.find(c => c.name == channelName)
  if (existingChannel != null) {
    return existingChannel
  }
  var newChannel = new IrcChannel(this, channelName)
  this.channels.push(newChannel)
  return newChannel
}

IrcClient.prototype.getUserFromNickName = function (nickName, isOnline = true) {
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

IrcClient.prototype.handleISupportParameter = function (name, value) {
  if (name.toLowerCase() == 'prefix') {
    var prefixValueMatch = value.match(regexISupportPrefix)
    var prefixes = prefixValueMatch[2]
    var modes = prefixValueMatch[1]
    
    if (prefixes.length != modes.length) {
      throw 'Message ISupport Prefix is Invalid.'
    }

    this.channelUserModes = []
    this.channelUserModes = modes.split('')

    this.channelUserModesPrefixes = {}
    for (var i = 0; i < prefixes.length; i++) {
      this.channelUserModesPrefixes[prefixes[i]] = modes[i]
    }
  }
}

IrcClient.prototype.isChannelName = function (channelName) {
  return channelName.match(regexChannelName) != null
}

IrcClient.prototype.getUserModeAndIdentifier = function (identifier) {
  var mode = identifier[0]
  let channelUserMode = this.channelUserModesPrefixes[mode]
  if (channelUserMode != null) {
    return { 'mode': channelUserMode, 'identifier': identifier.substring(1) }
  }
  return { 'mode': null, 'identifier': identifier }
}

IrcClient.prototype.getChannelType = function (type) {
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


// These entry types correspond to the STATS replies described in the RFC for the IRC protocol.
var IrcServerStatisticalEntryCommonType = {
  // An active connection to the server.
  connection: 1,
  // A command supported by the server.
  command: 2,
  // A server to which the local server may connect.
  allowedServerConnect: 3,
  // A server from which the local server may accept connections.
  allowedServerAccept: 4,
  // A client that may connect to the server.
  allowedClient: 5,
  // A client that is banned from connecting to the server.
  bannedClient: 6,
  // A connection class defined by the server.
  connectionClass: 7,
  // The leaf depth of a server in the network.
  leafDepth: 8,
  // The uptime of the server.
  uptime: 9,
  // An operator on the server.
  allowedOperator: 10,
  // A hub server within the network.
  hubServer: 11
}

var IrcChannelType = {
  public: 1,
  private: 2,
  secret: 3
}

// ------------------- Module Configuration  ----------------------------------

util.inherits(IrcClient, EventEmitter)

module.exports = IrcClient
