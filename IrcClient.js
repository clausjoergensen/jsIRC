var net = require('net')
var util = require('util')

var EventEmitter = require('events').EventEmitter

var IrcUser = require('./IrcUser.js')
var IrcChannel = require('./IrcChannel.js')
var IrcServer = require('./IrcServer.js')

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

var IrcTargetMaskType = {
  ServerMask: 0,
  HostMask: 1
}

// ------------------- Public Functions  --------------------------------------

function IrcClient () {
  EventEmitter.call(this)
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
  this.socket.connect(port, hostName, this.connected.bind(this))
  this.socket.on('data', this.dataReceived.bind(this))
  this.socket.on('close', this.connectionClosed.bind(this))
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

  this.localUser = new IrcUser(this)
  this.localUser.isOnline = true
  this.localUser.nickName = this.registrationInfo.nickName
  this.localUser.userName = this.registrationInfo.userName
  this.localUser.realName = this.registrationInfo.userName
  this.localUser.userModes = this.registrationInfo.userModes

  this.users.push(this.localUser)
}

IrcClient.prototype.connectionClosed = function () {
  console.log('Connection Closed')
}

IrcClient.prototype.dataReceived = function (data) {
  var str = data.toString()
  if (str == null) {
    return
  }

  var lines = str.split('\r\n')
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (line.length == 0) {
      return
    }
    this.parseMessage(line)
  }
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
  } else {
    console.log(line)
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

  //console.log('[DEBUG] ' + message)

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
  var channelList = message.parameters[0]

  for (var i = 0; i < channelList.length; i++) {
    var channel = getChannelFromName(channelList[i])
    if (sourceUser == this.localUser) {
      localUser.joinChannel(channel)
    } else {
      channel.userJoined(new IrcChannelUser(sourceUser))
    }
  }
}

// Process PART messages received from the server.
IrcClient.prototype.processMessagePart = function (message) {
  var sourceUser = message.source
  var comment = message.parameters[0]

  for (var i = 0; i < channelList.length; i++) {
    var channel = getChannelFromName(channelList[i])
    if (sourceUser == this.localUser) {
      localUser.partChannel(channel)
    } else {
      channel.userParted(channel.getChannelUser(sourceUser), comment)
    }
  }
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
  var channelName = getChannelFromName(message.parameters[0])
  channel.topicChanged(message.source, message.parameters[1])
}

// Process KICK messages received from the server.
IrcClient.prototype.processMessageKick = function (message) {
  var channelList = message.parameters[0]
  var userList = message.parameters[1]
  var comment = message.parameters[2]
}

// Process INVITE messages received from the server.
IrcClient.prototype.processMessageInvite = function (message) {
  var user = getUserFromNickName(message.parameters[0])
  var channel = getChannelFromName(message.parameters[1])
  user.inviteReceived(message.source, channel)
}

// Process PRIVMSG messages received from the server.
IrcClient.prototype.processMessagePrivateMessage = function (message) {
  var targets = []
  var targetNames = message.parameters[0].split(',')
  for (var i = 0; i < targetNames.length; i++) {
    targets.push(this.getMessageTarget(targetNames[i]))
  }

  var messageText = message.parameters[1]

  for (var i = 0; i < targets.length; i++) {
    targets[i].messageReceived(message.source, targets, messageText)
  }
}

// Process NOTICE messages received from the server.
IrcClient.prototype.processMessageNotice = function (message) {
  var targets = []
  var targetNames = message.parameters[0].split(',')
  for (var i = 0; i < targetNames.length; i++) {
    targets.push(this.getMessageTarget(targetNames[i]))
  }

  var noticeText = message.parameters[1]
  
  for (var i = 0; i < targets.length; i++) {
    targets[i].noticeReceived(message.source, targets, noticeText)
  }
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
  this.localUser.nickName = nickNameMatch[1] || localUser.NickName
  this.localUser.userName = nickNameMatch[2] || localUser.UserName
  this.localUser.hostName = nickNameMatch[3] || localUser.HostName
  
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
}

// Process RPL_STATSCOMMANDS responses from the server.
IrcClient.prototype.processMessageStatsCommands = function (message) {
}

// Process RPL_STATSCLINE responses from the server.
IrcClient.prototype.processMessageStatsCLine = function (message) {
}

// Process RPL_STATSNLINE responses from the server.
IrcClient.prototype.processMessageStatsNLine = function (message) {
}

// Process RPL_STATSILINE responses from the server.
IrcClient.prototype.processMessageStatsILine = function (message) {
}

// Process RPL_STATSKLINE responses from the server.
IrcClient.prototype.processMessageStatsKLine = function (message) {
}

// Process RPL_STATSYLINE responses from the server.
IrcClient.prototype.processMessageStatsYLine = function (message) {
}

// Process RPL_ENDOFSTATS responses from the server.
IrcClient.prototype.processMessageEndOfStats = function (message) {
}

// Process RPL_STATSLLINE responses from the server.
IrcClient.prototype.processMessageStatsLLine = function (message) {
}

// Process RPL_STATSUPTIME responses from the server.
IrcClient.prototype.processMessageStatsUpTime = function (message) {
}

// Process RPL_STATSOLINE responses from the server.
IrcClient.prototype.processMessageStatsOLine = function (message) {
}

// Process RPL_STATSHLINE responses from the server.
IrcClient.prototype.processMessageStatsHLine = function (message) {
}

// Process RPL_LUSERCLIENT responses from the server.
IrcClient.prototype.processMessageLUserClient = function (message) {
}

// Process RPL_LUSEROP responses from the server.
IrcClient.prototype.processMessageLUserOp = function (message) {
}

// Process RPL_LUSERUNKNOWN responses from the server.
IrcClient.prototype.processMessageLUserUnknown = function (message) {
}

// Process RPL_LUSERCHANNELS responses from the server.
IrcClient.prototype.processMessageLUserChannels = function (message) {
}

// Process RPL_LUSERME responses from the server.
IrcClient.prototype.processMessageLUserMe = function (message) {
}

// Process RPL_AWAY responses from the server.
IrcClient.prototype.processMessageReplyAway = function (message) {
}

// Process RPL_ISON responses from the server.
IrcClient.prototype.processMessageReplyIsOn = function (message) {
}

// Process RPL_UNAWAY responses from the server.
IrcClient.prototype.processMessageReplyUnAway = function (message) {
}

// Process RPL_NOWAWAY responses from the server.
IrcClient.prototype.processMessageReplyNowAway = function (message) {
}

// Process RPL_WHOISUSER responses from the server.
IrcClient.prototype.processMessageReplyWhoIsUser = function (message) {
}

// Process RPL_WHOISSERVER responses from the server.
IrcClient.prototype.processMessageReplyWhoIsServer = function (message) {
}

// Process RPL_WHOISOPERATOR responses from the server.
IrcClient.prototype.processMessageReplyWhoIsOperator = function (message) {
}

// Process RPL_WHOWASUSER responses from the server.
IrcClient.prototype.processMessageReplyWhoWasUser = function (message) {
}

// Process RPL_ENDOFWHO responses from the server.
IrcClient.prototype.processMessageReplyEndOfWho = function (message) {
}

// Process RPL_WHOISIDLE responses from the server.
IrcClient.prototype.processMessageReplyWhoIsIdle = function (message) {
}

// Process RPL_ENDOFWHOIS responses from the server.
IrcClient.prototype.processMessageReplyEndOfWhoIs = function (message) {
}

// Process RPL_WHOISCHANNELS responses from the server.
IrcClient.prototype.processMessageReplyWhoIsChannels = function (message) {
}

// Process RPL_LIST responses from the server.
IrcClient.prototype.processMessageReplyList = function (message) {
}

// Process RPL_LISTEND responses from the server.
IrcClient.prototype.processMessageReplyListEnd = function (message) {
}

// Process RPL_NOTOPIC responses from the server.
IrcClient.prototype.processMessageReplyNoTopic = function (message) {
}

// Process RPL_TOPIC responses from the server.
IrcClient.prototype.processMessageReplyTopic = function (message) {
}

// Process RPL_INVITING responses from the server.
IrcClient.prototype.processMessageReplyInviting = function (message) {
}

// Process RPL_VERSION responses from the server.
IrcClient.prototype.processMessageReplyVersion = function (message) {
}

// Process RPL_WHOREPLY responses from the server.
IrcClient.prototype.processMessageReplyWhoReply = function (message) {
}

// Process RPL_NAMEREPLY responses from the server.
IrcClient.prototype.processMessageReplyNameReply = function (message) {
}

// Process RPL_LINKS responses from the server.
IrcClient.prototype.processMessageReplyLinks = function (message) {
}

// Process RPL_ENDOFLINKS responses from the server.
IrcClient.prototype.processMessageReplyEndOfLinks = function (message) {
}

// Process RPL_ENDOFNAMES responses from the server.
IrcClient.prototype.processMessageReplyEndOfNames = function (message) {
}

// Process RPL_ENDOFWHOWAS responses from the server.
IrcClient.prototype.processMessageReplyEndOfWhoWas = function (message) {
}

// Process RPL_MOTD responses from the server.
IrcClient.prototype.processMessageReplyMotd = function (message) {
  this.messageOfTheDay += message.parameters[1] + '\r\n'
}

// Process RPL_MOTDSTART responses from the server.
IrcClient.prototype.processMessageReplyMotdStart = function (message) {
  this.messageOfTheDay = ""
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

IrcClient.prototype.sendMessageJoin = function (channelName) {
  this.writeMessage(null, 'JOIN', [channelName])
}

IrcClient.prototype.sendMessagePong = function (server, targetServer = null) {
  this.writeMessage(null, 'PONG', [server, targetServer])
}

IrcClient.prototype.sendMessageNick =  function (password) {
  this.writeMessage(null, 'PASS', [password])
}

IrcClient.prototype.sendMessageNick =  function (nickName) {
  this.writeMessage(null, 'NICK', [nickName])
}

IrcClient.prototype.sendMessageUser =  function (userName, userMode, realName) {
  this.writeMessage(null, 'USER', [userName, userMode, '*', realName])
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

  if (targetName.Length == 0) {
    throw 'targetName cannot be empty string.'
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
    if (user.UserName == null) {
      user.UserName = userName
    }
    if (user.HostName == null) {
      user.HostName = hostName
    }
    return user
  }
  
  if (userName != null) {
    var user = this.getUserFromNickName(nickName, true)
    if (user.HostName == null) {
      user.HostName = hostName
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
  var existingChannel = this.channels.find(c => c.Name == channelName)
  if (existingChannel != null) {
    return existingChannel.Name
  }
  var newChannel = new IrcChannel(this, channelName)
  this.channels.push(newChannel)
  return newChannel
}

IrcClient.prototype.getUserFromNickName = function (nickName, isOnline = true) {
  var existingUser = this.users.find(u => u.NickName == nickName)
  if (existingUser != null) {
    return existingUser.NickName
  }
  
  var newUser = new IrcUser(this)
  newUser.nickName = nickName
  newUser.isOnline = isOnline

  this.users.push(newUser)

  return newUser
}

IrcClient.prototype.handleISupportParameter = function(name, value) {
  if (name.toLowerCase() == 'prefix') {
    var prefixValueMatch = value.match(regexISupportPrefix)
    var prefixes = prefixValueMatch[2]
    var modes = prefixValueMatch[1]
    
    if (prefixes.length != modes.length) {
      throw 'Message ISupport Prefix is Invalid.'
    }

    channelUserModes = []
    channelUserModes = modes.split('')

    channelUserModesPrefixes = {}
    for (var i = 0; i < prefixes.length; i++) {
      channelUserModesPrefixes[prefixes[i]] = modes[i]
    }
  }
}

IrcClient.prototype.isChannelName = function (channelName) {
  return channelName.match(regexChannelName) != null
}

// ------------------- Module Configuration  ----------------------------------

util.inherits(IrcClient, EventEmitter)

module.exports = IrcClient
