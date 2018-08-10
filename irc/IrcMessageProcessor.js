// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcChannel = require('./IrcChannel.js')
const IrcChannelType = require('./IrcChannelType.js')
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcReply = require('./IrcReply.js')
const IrcError = require('./IrcError.js')

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
 * @class IrcMessageProcessor
 * @extends EventEmitter
 *
 * IRC Message Processing.
 */
module.exports = class IrcMessageProcessor {

  /*
   * Initializes a new instance of the IrcMessageProcessor class.
   *
   * @access internal
   * @param {IrcClient} client The IrcClient instance.
   * @constructor
  */
  constructor (client) {
    this._client = client
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
      '391': this.processMessageReplyTime.bind(this)
    }
  }

  get client() {
    return this._client
  }


  /**
   * Processes a IRC message with the appropriate message handler.
   *
   * @access internal
   * @param {Object} message The message object.
   */
  processMessage (message) {
    var messageProcessor = this._messageProcessors[message.command]
    if (messageProcessor != null) {
      messageProcessor(message)
    } else {
      var numericCommand = parseInt(message.command)
      if (numericCommand >= 400 && numericCommand <= 599) {
        this.processMessageNumericError(message)
      } else {
        if (this.client.loggingEnabled) {
          var replyId = IrcReply[message.command]
          if (replyId != null) {
            console.log(`Unsupported command ${replyId} (${message.command})`)
            return
          }
          var errorId = IrcError[message.command]
          if (errorId != null) {
            console.log(`Unsupported command ${errorId} (${message.command})`)
            return
          }
          console.log(`Unsupported command '${message.command}'`)
        }
      }
    }
  }

  // - Internal Methods

  processMessageNick (message) {
    var sourceUser = message.source
    var newNickName = message.parameters[0]
    sourceUser.nickName = newNickName
    sourceUser.emit('nickName', newNickName)
  }

  processMessageQuit (message) {
    var sourceUser = message.source
    var comment = message.parameters[0]
    
    sourceUser.quit(comment)
    
    let idx = this.client.users.indexOf(sourceUser)
    if (idx != -1) {
      this.client.users.splice(idx)
    }
  }

  // Process JOIN messages received from the server.
  processMessageJoin (message) {
    var sourceUser = message.source
    var channelList = message.parameters[0].split(',')

    channelList.forEach(channelName => {
      var channel = this.getChannelFromName(channelName)
      if (sourceUser == this.client.localUser) {
        this.client.localUser.joinChannel(channel)
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
      if (sourceUser == this.client.localUser) {
        this.client.localUser.partChannel(channel)
        this.client.channels.splice(this.client.channels.indexOf(channel))
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
    if (isChannelName(message.parameters[0])) {
      var channel = this.getChannelFromName(message.parameters[0])
      var modesAndParameters = getModeAndParameters(message.parameters.slice(1))
      channel.modesChanged(message.source, modesAndParameters.modes, modesAndParameters.parameters)
      this.client.emit('channelMode', channel, message.source, modesAndParameters.modes, modesAndParameters.parameters)
    } else if (message.parameters[0] == this.client.localUser.nickName) {
      this.client.localUser.modesChanged(message.parameters[1])
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
        if (channelUser.user == this.client.localUser) {
            var channel = channelUser.channel
            this.client.channels.splice(this.client.channels.indexOf(channel))

            channelUser.channel.userKicked(channelUser, comment)
            this.client.localUser.partChannel(channel)
        } else {
          channelUser.channel.userKicked(channelUser, comment)
        }
    })
  }

  // Process INVITE messages received from the server.
  processMessageInvite (message) {
    var user = this.client.getUserFromNickName(message.parameters[0])
    var channel = this.getChannelFromName(message.parameters[1])
    user.inviteReceived(message.source, channel)
  }    

   // Process PRIVMSG messages received from the server.
  processMessagePrivateMessage (message) {
    var targetNames = message.parameters[0].split(',')
    var messageText = message.parameters[1]

    var targets = targetNames.map(x => this.getMessageTarget(x))
    targets.forEach(t => {
      if (typeof t.messageReceived === 'function') {
        t.messageReceived(message.source, targets, messageText)
      } else {
       this.client.localUser.messageReceived(message.source, targets, messageText)
      }
    })
  }

  // Process NOTICE messages received from the server.
  processMessageNotice (message) {
    var targetNames = message.parameters[0].split(',')
    var noticeText = message.parameters[1]

    if (targetNames[0] == 'AUTH') {
      this.client.emit('notice', message.source, noticeText)
    } else {
      var targets = targetNames.map(x => this.getMessageTarget(x))
      targets.forEach(t => {
        if (typeof t.noticeReceived === 'function') {
          t.noticeReceived(message.source, targets, noticeText)
        } else {
         this.client.localUser.noticeReceived(message.source, targets, noticeText)
        }
      })
    }
  }

  // Process PING messages received from the server.
  processMessagePing (message) {
    var server = message.parameters[0]
    var targetServer = message.parameters[1]
    
    try {
      this.client.emit('ping', server)    
    } finally {
      this.client.sendMessagePong(server, targetServer)
    }
  } 

  // Process PONG messages received from the server.
  processMessagePong (message) {
    var server = message.parameters[0]
    
    try {
      this.client.emit('pong', server)    
    } finally {
      this.client.sendMessagePong(server, targetServer)
    }
  }

  // Process ERROR messages received from the server.
  processMessageError (message) {
    var errorMessage = message.parameters[0]
    this.client.emit('error', errorMessage)
  }

  // - Message Responding

  // Process RPL_WELCOME responses from the server.
  processMessageReplyWelcome (message) {
    var welcomeMessage = message.parameters[1].split(' ')
    var hostMask = welcomeMessage[welcomeMessage.length - 1]
    
    var nickNameMatch = hostMask.match(regexNickNameId)
    this.client.localUser.nickName = nickNameMatch[1] || this.client.localUser.nickName
    this.client.localUser.userName = nickNameMatch[2] || this.client.localUser.userName
    this.client.localUser.hostName = nickNameMatch[3] || this.client.localUser.hostName
    
    this.client.isRegistered = true

    this.client.emit('registered')
  }

  // Process RPL_YOURHOST responses from the server.
  processMessageReplyYourHost (message) {
    this.client.yourHostMessage = message.parameters[1]

  }

  // Process RPL_CREATED responses from the server.
  processMessageReplyCreated (message) {
    this.client.serverCreatedMessage = message.parameters[1]
  }

  // Process RPL_MYINFO responses from the server.
  processMessageReplyMyInfo (message) {
    this.client.serverName = message.parameters[1]
    this.client.serverVersion = message.parameters[2]
    this.client.serverAvailableUserModes = message.parameters[3].split('')
    this.client.serverAvailableChannelModes = message.parameters[4].split('')

    this.client.emit('clientInfo')
  }

  // Process RPL_BOUNCE and RPL_ISUPPORT responses from the server.
  processMessageReplyBounceOrISupport (message) {
    if (message.parameters[1].startsWith('Try Server')) { 
      // RPL_BOUNCE
      var textParts = message.parameters[0].split(' ', ',')
      var serverAddress = textParts[2]
      var serverPort = int.Parse(textParts[6])

      this.client.emit('bounce', serverAddress, serverPort)
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
        this.client.serverSupportedFeatures[paramName] = paramValue
      }
      
      this.client.emit('serverSupportedFeaturesReceived')
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
    this.client.emit('serverStatsReceived', this.listedStatsEntries)
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

    this.client.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSEROP responses from the server.
  processMessageLUserOp (message) {
    var networkInfo = { 'operatorsCount': parseInt(message.parameters[1]) }
    this.client.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSERUNKNOWN responses from the server.
  processMessageLUserUnknown (message) {
    var networkInfo = { 'unknownConnectionsCount': parseInt(message.parameters[1]) }
    this.client.emit('networkInformationReceived', networkInfo)
  }

  // Process RPL_LUSERCHANNELS responses from the server.
  processMessageLUserChannels (message) {
    var networkInfo = { 'channelsCount': parseInt(message.parameters[1]) }
    this.client.emit('networkInformation', networkInfo)
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

    this.client.emit('networkInformation', networkInfo)
  }

  // Process RPL_AWAY responses from the server.
  processMessageReplyAway (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    user.awayMessage = message.parameters[2]
    user.isAway = true
  }

  // Process RPL_ISON responses from the server.
  processMessageReplyIsOn (message) {
    var onlineUsers = []
    var onlineUserNames = message.parameters[1].split(' ')
    onlineUserNames.forEach(name => {
      var onlineUser = this.client.getUserFromNickName(name)
      onlineUser.isOnline = true    
    })
  }

  // Process RPL_UNAWAY responses from the server.
  processMessageReplyUnAway (message) {
    this.client.localUser.isAway = false
  }

  // Process RPL_NOWAWAY responses from the server.
  processMessageReplyNowAway (message) {
    this.client.localUser.isAway = true
  }

  // Process RPL_WHOISUSER responses from the server.
  processMessageReplyWhoIsUser (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    user.userName = message.parameters[2]
    user.hostName = message.parameters[3]
    user.realName = message.parameters[5]
  }

  // Process RPL_WHOISSERVER responses from the server.
  processMessageReplyWhoIsServer (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    user.serverName = message.parameters[2]
    user.serverInfo = message.parameters[3]
  }

  // Process RPL_WHOISOPERATOR responses from the server.
  processMessageReplyWhoIsOperator (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    user.isOperator = true
  }

  // Process RPL_WHOWASUSER responses from the server.
  processMessageReplyWhoWasUser (message) {
    var user = this.client.getUserFromNickName(message.parameters[1], false)
    user.userName = message.parameters[2]
    user.hostName = message.parameters[3]
    user.realName = message.parameters[5]
  }

  // Process RPL_ENDOFWHO responses from the server.
  processMessageReplyEndOfWho (message) {
    var mask = message.parameters[1]
    this.client.emit('whoReply', mask)
  }

  // Process RPL_WHOISIDLE responses from the server.
  processMessageReplyWhoIsIdle (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    user.idleDuration = intParse(message.parameters[2])
  }

  // Process RPL_ENDOFWHOIS responses from the server.
  processMessageReplyEndOfWhoIs (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    this.client.emit('whoIsReply', user)
  }

  // Process RPL_WHOISCHANNELS responses from the server.
  processMessageReplyWhoIsChannels (message) {
    var user = this.client.getUserFromNickName(message.parameters[1])
    var channelIds = message.parameters[2].split(' ')
    channelIds.forEach(channelId => {
      if (channelId.length == 0) {
        return
      }
      var lookup = this.getUserModeAndIdentifier(channelId)
      var channel = this.getChannelFromName(lookup.identifier)
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
    this.client.emit('channelList', listedChannels)
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
    var invitedUser = this.client.getUserFromNickName(message.parameters[1])
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

    this.client.emit('serverVersionInfo', { 
      'version': version, 
      'debugLevel': debugLevel, 
      'server': server, 
      'comments': comments 
    })
  }

  // Process RPL_WHOREPLY responses from the server.
  processMessageReplyWhoReply (message) {
    var channel = message.parameters[1] == '*' ? null : this.getChannelFromName(message.parameters[1])
    var user = this.client.getUserFromNickName(message.parameters[5])

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
          var user = this.client.getUserFromNickName(userNickNameAndMode.identifier)
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
    this.client.emit('serverLinksList', this.listedServerLinks)
    this.listedServerLinks = []
  }

  // Process RPL_ENDOFNAMES responses from the server.
  processMessageReplyEndOfNames (message) {
    var channel = this.getChannelFromName(message.parameters[1])
    channel.usersListReceived()
  }

  // Process RPL_ENDOFWHOWAS responses from the server.
  processMessageReplyEndOfWhoWas (message) {
    this.client.emit('whoWasReply', this.client.getUserFromNickName(message.parameters[1], false))
  }

  // Process RPL_MOTD responses from the server.
  processMessageReplyMotd (message) {
    this.client.messageOfTheDay += message.parameters[1] + '\r\n'
  }

  // Process RPL_MOTDSTART responses from the server.
  processMessageReplyMotdStart (message) {
    this.client.messageOfTheDay = ''
  }

  // Process RPL_ENDOFMOTD responses from the server.
  processMessageReplyMotdEnd (message) {
    this.client.messageOfTheDay += message.parameters[1]
    this.client.emit('motd', this.client.messageOfTheDay)
  }

  // Process RPL_TIME responses from the server.
  processMessageReplyTime (message) {
    var [server, message, dateTime] = message.parameters
    this.client.emit('serverTime', server, dateTime)
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

    this.client.emit('protocolError', parseInt(message.command), errorParameters, errorMessage)
  }

  // -- Utils

  getChannelFromName (channelName) {
    var existingChannel = this.client.channels.find(c => c.name == channelName)
    if (existingChannel != null) {
      return existingChannel
    }
    var newChannel = new IrcChannel(this.client, channelName)
    this.client.channels.push(newChannel)
    return newChannel
  }

  getMessageTarget (targetName) {
    if (targetName == null) {
      throw 'targetName is null.'
    }

    if (targetName.length == 0) {
      throw 'targetName cannot be empty string.'
    }

    if (targetName == '*') {
      return this.client
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
      var user = this.client.getUserFromNickName(nickName, true)
      if (user.userName == null) {
        user.userName = userName
      }
      if (user.hostName == null) {
        user.hostName = hostName
      }
      return user
    }
    
    if (userName != null) {
      var user = this.client.getUserFromNickName(nickName, true)
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

  getUserModeAndIdentifier (identifier) {
    var mode = identifier[0]
    let channelUserMode = this.channelUserModesPrefixes[mode]
    if (channelUserMode != null) {
      return { 'mode': channelUserMode, 'identifier': identifier.substring(1) }
    }
    return { 'mode': '', 'identifier': identifier }
  }

  handleISupportParameter (name, value) {
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
        this.channelUserModesPrefixes[prefixes[i]] = this.channelUserModes[i]
      }
    }
  }
}
