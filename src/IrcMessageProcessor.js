// Copyright (c) 2018 Claus Jørgensen
'use strict'

const log = require('electron-log')

const IrcUser = require('./IrcUser.js')
const IrcChannel = require('./IrcChannel.js')
const IrcChannelType = require('./IrcChannelType.js')
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcReply = require('./IrcReply.js')
const IrcError = require('./IrcError.js')
const IrcServerStatisticalEntry = require('./IrcServerStatisticalEntry.js')
const { ArgumentError, ArgumentNullError, ProtocolViolationError } = require('./Errors.js')

const regexHostName = new RegExp(/([^%@]+)/)
const regexChannelName = new RegExp(/([#+!&].+)/)
const regexTargetMask = new RegExp(/([$#].+)/)
const regexNickNameId = new RegExp(/([^!@]+)(?:(?:!([^!@]+))?@([^%@]+))?/)
const regexUserNameId = new RegExp(/([^!@]+)(?:(?:%[^%@]+)?@([^%@]+?\.[^%@]*)|%([^!@]+))/)
const regexISupportPrefix = new RegExp(/\((.*)\)(.*)/)

/**
 * @typedef NetworkInfo
 * @type {object}
 * @property {number} serverClientsCount
 * @property {number} serverServersCount
 * @property {number} channelsCount
 * @property {number} unknownConnectionsCount
 * @property {number} operatorsCount
 * @property {number} visibleUsersCount
 * @property {number} invisibleUsersCount
 * @property {number} serversCount
 */

/**
 * @typedef ServerStatistic
 * @property {IrcServerStatisticalEntry} type
 * @property {string} message
 */

/**
 * @typedef ServerSupportedFeature
 * @property {number} CHANLIMIT Maximum number of channels that a client
 * @property {string} CHANMODES Modes that may be set on a channel.
 * @property {number} CHANNELLEN Maximum length of a channel name a client may create.
 * @property {string} CHANTYPES Valid channel prefixes.
 * @property {char} EXCEPTS Mode character for 'ban exceptions'
 * @property {string} IDCHAN Safe channel identifiers.
 * @property {string} INVEX Mode character for 'invite exceptions'.
 * @property {number} KICKLEN Maximum length of a kick message a client may provide.
 * @property {number} MAXLIST Maximum number of "list modes" a client may set on a channel at once.
 * @property {string} MODES Maximum number of modes accepting parameters that may be sent in a single MODE command.
 * @property {string} NETWORK IRC network name.
 * @property {number} NICKLEN Maximum length of a nickname the client may use.
 * @property {string} PREFIX Mapping of channel modes that clients may have to status flags.
 * @property {null} SAFELIST Flag indicating that a client may request a LIST without being disconnected.
 * @property {string} STATUSMSG The server supports sending messages to only to clients on a channel with a specific status.
 * @property {number} TARGMAX Maximum number of targets allowable for commands that accept multiple targets.
 * @property {number} TOPICLEN Maximum length of a topic that may be set.
 */

/**
 * IRC Message Processing for a given {@link IrcClient}.
 *
 * @class
 * @package
 * @extends EventEmitter
 */
class IrcMessageProcessor {
  /**
   * Initializes a new instance of the IrcMessageProcessor class.
   *
   * @hideconstructor
   * @param {IrcClient} client The IrcClient instance.
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
      '324': this.processMessageReplyChannelModes.bind(this),
      '331': this.processMessageReplyNoTopic.bind(this),
      '332': this.processMessageReplyTopic.bind(this),
      '341': this.processMessageReplyInviting.bind(this),
      '351': this.processMessageReplyVersion.bind(this),
      '352': this.processMessageReplyWhoReply.bind(this),
      '353': this.processMessageReplyNameReply.bind(this),
      '364': this.processMessageReplyLinks.bind(this),
      '365': this.processMessageReplyEndOfLinks.bind(this),
      '366': this.processMessageReplyEndOfNames.bind(this),
      '367': this.processMessageReplyBanList.bind(this),
      '368': this.processMessageReplyBanListEnd.bind(this),
      '369': this.processMessageReplyEndOfWhoWas.bind(this),
      '372': this.processMessageReplyMotd.bind(this),
      '375': this.processMessageReplyMotdStart.bind(this),
      '376': this.processMessageReplyMotdEnd.bind(this),
      '391': this.processMessageReplyTime.bind(this)
    }
  }

  /** @private */
  get client () {
    return this._client
  }

  /**
   * Processes a IRC message with the appropriate message handler.
   *
   * @package
   * @param {Object} message The message object.
   */
  processMessage (message) {
    let messageProcessor = this._messageProcessors[message.command]
    if (messageProcessor !== undefined) {
      messageProcessor(message)
    } else {
      let numericCommand = parseInt(message.command)
      if (numericCommand >= 400 && numericCommand <= 599) {
        this.processMessageNumericError(message)
      } else {
        let replyId = IrcReply[message.command]
        if (replyId !== undefined) {
          log.debug(`Unsupported command ${replyId} (${message.command})`)
          return
        }
        let errorId = IrcError[message.command]
        if (errorId !== undefined) {
          log.debug(`Unsupported command ${errorId} (${message.command})`)
          return
        }
        log.debug(`Unsupported command '${message.command}'`)
      }
    }
  }

  /**
   * Process NICK messages received from the server.
   * @private
   */
  processMessageNick (message) {
    if (!(message.source instanceof IrcUser)) {
      throw new ProtocolViolationError(`The message source '${message.source.name}' is not a user.`)
    }

    console.assert(message.parameters[0])

    let sourceUser = message.source
    let newNickName = message.parameters[0]
    sourceUser.nickName = newNickName
  }

  /**
   * Process QUIT messages received from the server.
   * @private
   */
  processMessageQuit (message) {
    if (!(message.source instanceof IrcUser)) {
      throw new ProtocolViolationError(`The message source '${message.source.name}' is not a user.`)
    }

    let sourceUser = message.source

    console.assert(message.parameters[0] !== null) // Empty string is allowed.
    let comment = message.parameters[0]

    sourceUser.quit(comment)

    let idx = this.client.users.indexOf(sourceUser)
    if (idx !== -1) {
      this.client.users.splice(idx, 1)
    }
  }

  /**
   * Process JOIN messages received from the server.
   * @private
   */
  processMessageJoin (message) {
    if (!(message.source instanceof IrcUser)) {
      throw new ProtocolViolationError(`The message source '${message.source.name}' is not a user.`)
    }

    let sourceUser = message.source

    console.assert(message.parameters[0])
    let channelList = message.parameters[0].split(',')

    channelList.forEach(channelName => {
      let channel = this.getChannelFromName(channelName)
      if (sourceUser === this.client.localUser) {
        this.client.localUser.joinChannel(channel)
      } else {
        channel.userJoined(new IrcChannelUser(sourceUser))
      }
    })
  }

  /**
   * Process PART messages received from the server.
   * @private
   */
  processMessagePart (message) {
    if (!(message.source instanceof IrcUser)) {
      throw new ProtocolViolationError(`The message source '${message.source.name}' is not a user.`)
    }

    let sourceUser = message.source

    console.assert(message.parameters[0])
    let channelList = message.parameters[0].split(',')

    console.assert(message.parameters[1] !== null) // Empty string is allowed.
    let comment = message.parameters[1]

    channelList.forEach(channelName => {
      let channel = this.getChannelFromName(channelName)
      if (sourceUser === this.client.localUser) {
        this.client.localUser.partChannel(channel)
        this.client.channels.splice(this.client.channels.indexOf(channel), 1)
      } else {
        channel.userParted(channel.getChannelUser(sourceUser), comment)
      }
    })
  }

  /**
   * Process MODE messages received from the server.
   * @private
   */
  processMessageMode (message) {
    function isChannelName (channelName) {
      return regexChannelName.test(channelName)
    }

    console.assert(message.parameters[0])

    if (isChannelName(message.parameters[0])) {
      console.assert(message.parameters[1])
      let channel = this.getChannelFromName(message.parameters[0])
      let modesAndParameters = this.getModeAndParameters(message.parameters.slice(1))
      channel.modesChanged(message.source, modesAndParameters.modes, modesAndParameters.parameters)
      /**
       * @event IrcClient#channelMode
       * @param {IrcChannel} channel
       * @param {IrcChannel|IrcUser} source
       * @param {string[]} modes
       * @param {string[]} parameters
       */
      this.client.emit('channelMode',
        channel, message.source, modesAndParameters.modes, modesAndParameters.parameters)
    } else if (message.parameters[0] === this.client.localUser.nickName) {
      console.assert(message.parameters[1])
      this.client.localUser.modesChanged(message.parameters[1])
    } else {
      throw new ProtocolViolationError(`Cannot set user mode for '${message.parameters[0]}'`)
    }
  }

  /**
   * Process TOPIC messages received from the server.
   * @private
   */
  processMessageTopic (message) {
    console.assert(message.parameters[0])
    let channel = this.getChannelFromName(message.parameters[0])
    console.assert(message.parameters[1] !== null) // Empty string is allowed.
    channel.topicChanged(message.source, message.parameters[1])
  }

  /**
   * Process KICK messages received from the server.
   * @private
   */
  processMessageKick (message) {
    console.assert(message.parameters[0])
    let channels = message.parameters[0].split(',').map(n => this.getChannelFromName(n))
    console.assert(message.parameters[1])
    let users = message.parameters[1].split(',').map(n => this.client.getUserFromNickName(n))
    console.assert(message.parameters[2] !== null) // Empty string is allowed.
    let comment = message.parameters[2]

    let channelUsers = channels
      .map((channel, i) => [channel, users[i]])
      .map(([channel, user], i) => {
        return channel.getChannelUser(user)
      })

    channelUsers.forEach(channelUser => {
      if (channelUser.user === this.client.localUser) {
        let channel = channelUser.channel
        this.client.channels.splice(this.client.channels.indexOf(channel), 1)

        channelUser.channel.userKicked(channelUser, comment)
        this.client.localUser.partChannel(channel)
      } else {
        channelUser.channel.userKicked(channelUser, comment)
      }
    })
  }

  /**
   * Process INVITE messages received from the server.
   * @private
   */
  processMessageInvite (message) {
    console.assert(message.parameters[0])
    let user = this.client.getUserFromNickName(message.parameters[0])
    console.assert(message.parameters[1])
    let channel = this.getChannelFromName(message.parameters[1])
    user.inviteReceived(message.source, channel)
  }

  /**
   * Process PRIVMSG messages received from the server.
   * @private
   */
  processMessagePrivateMessage (message) {
    console.assert(message.parameters[0])
    let targetNames = message.parameters[0].split(',')
    console.assert(message.parameters[1])
    let messageText = message.parameters[1]

    let targets = targetNames.map(x => this.getMessageTarget(x))
    targets.forEach(t => {
      if (typeof t.messageReceived === 'function') {
        t.messageReceived(message.source, targets, messageText)
      } else {
        this.client.localUser.messageReceived(message.source, targets, messageText)
      }
    })
  }

  /**
   * Process NOTICE messages received from the server.
   * @private
   */
  processMessageNotice (message) {
    console.assert(message.parameters[0])
    let targetNames = message.parameters[0].split(',')
    console.assert(message.parameters[1])
    let noticeText = message.parameters[1]

    if (targetNames[0] === 'AUTH') {
      /**
       * @event IrcClient#notice
       * @param {IrcChannel|IrcUser} source
       * @param {string[]} noticeText
       */
      this.client.emit('notice', message.source, noticeText)
    } else {
      let targets = targetNames.map(x => this.getMessageTarget(x))
      targets.forEach(t => {
        if (typeof t.noticeReceived === 'function') {
          t.noticeReceived(message.source, targets, noticeText)
        } else {
          this.client.localUser.noticeReceived(message.source, targets, noticeText)
        }
      })
    }
  }

  /**
   * Process PING messages received from the server.
   * @private
   */
  processMessagePing (message) {
    console.assert(message.parameters[0])
    let server = message.parameters[0]
    let targetServer = message.parameters[1]

    try {
      /**
       * @event IrcClient#ping
       * @param {string} server
       */
      this.client.emit('ping', server)
    } finally {
      this.client.sendMessagePong(server, targetServer)
    }
  }

  /**
   * Process PONG messages received from the server.
   * @private
   */
  processMessagePong (message) {
    console.assert(message.parameters[0])
    let server = message.parameters[0]
    /**
     * @event IrcClient#pong
     * @param {string} server
     */
    this.client.emit('pong', server)
  }

  /**
   * Process ERROR messages received from the server.
   * @private
   */
  processMessageError (message) {
    console.assert(message.parameters[0])
    let errorMessage = message.parameters[0]
    /**
     * @event IrcClient#error
     * @param {string} errorMessage
     */
    this.client.emit('error', errorMessage)
  }

  /**
   * Process RPL_WELCOME responses from the server.
   * @private
   */
  processMessageReplyWelcome (message) {
    console.assert(message.parameters[0])
    console.assert(message.parameters[1])

    let welcomeMessage = message.parameters[1].split(' ')
    let hostMask = welcomeMessage[welcomeMessage.length - 1]

    let nickNameMatch = hostMask.match(regexNickNameId)
    this.client.localUser.nickName = nickNameMatch[1] || this.client.localUser.nickName
    this.client.localUser.userName = nickNameMatch[2] || this.client.localUser.userName
    this.client.localUser.hostName = nickNameMatch[3] || this.client.localUser.hostName

    /**
     * @event IrcClient#registered
     */
    this.client.emit('registered')
  }

  /**
   * Process RPL_YOURHOST responses from the server.
   * @private
   */
  processMessageReplyYourHost (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    this.client.yourHostMessage = message.parameters[1]
  }

  /**
   * Process RPL_CREATED responses from the server.
   * @private
   */
  processMessageReplyCreated (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    this.client.serverCreatedMessage = message.parameters[1]
  }

  /**
   * Process RPL_MYINFO responses from the server.
   * @private
   */
  processMessageReplyMyInfo (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)

    console.assert(message.parameters[1])
    this.client.serverName = message.parameters[1]
    console.assert(message.parameters[2])
    this.client.serverVersion = message.parameters[2]
    console.assert(message.parameters[3])
    this.client.serverAvailableUserModes = message.parameters[3].split('')
    console.assert(message.parameters[4])
    this.client.serverAvailableChannelModes = message.parameters[4].split('')

    /**
     * @event IrcClient#clientInfo
     */
    this.client.emit('clientInfo')
  }

  /**
   * Process RPL_BOUNCE and RPL_ISUPPORT responses from the server.
   * @private
   */
  processMessageReplyBounceOrISupport (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    if (message.parameters[1].startsWith('Try Server')) {
      // RPL_BOUNCE
      let textParts = message.parameters[0].split(' ', ',')
      let serverAddress = textParts[2]
      let serverPort = parseInt(textParts[6])

      /**
       * @event IrcClient#bounce
       * @param {string} serverAddress
       * @param {number} serverPort
       */
      this.client.emit('bounce', serverAddress, serverPort)
    } else {
      // RPL_ISUPPORT
      for (let i = 1; i < message.parameters.length - 1; i++) {
        if (!(message.parameters[i + 1])) {
          break
        }
        let paramParts = message.parameters[i].split('=')
        let paramName = paramParts[0]
        let paramValue = paramParts.length === 1 ? null : paramParts[1]

        this.handleISupportParameter(paramName, paramValue)
        this.client.serverSupportedFeatures[paramName] = paramValue
      }

      /**
       * @event IrcClient#serverSupportedFeatures
       * @property {ServerSupportedFeature} serverSupportedFeatures
       */
      this.client.emit('serverSupportedFeatures', this.client.serverSupportedFeatures)
    }
  }

  /**
   * Process RPL_STATSLINKINFO responses from the server.
   * @private
   */
  processMessageStatsLinkInfo (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.connection,
      'message': message
    })
  }

  /**
   * Process RPL_STATSCOMMANDS responses from the server.
   * @private
   */
  processMessageStatsCommands (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.command,
      'message': message
    })
  }

  /**
   * Process RPL_STATSCLINE responses from the server.
   * @private
   */
  processMessageStatsCLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedServerConnect,
      'message': message
    })
  }

  /**
   * Process RPL_STATSNLINE responses from the server.
   * @private
   */
  processMessageStatsNLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedServerAccept,
      'message': message
    })
  }

  /**
   * Process RPL_STATSILINE responses from the server.
   * @private
   */
  processMessageStatsILine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedClient,
      'message': message
    })
  }

  /**
   * Process RPL_STATSKLINE responses from the server.
   * @private
   */
  processMessageStatsKLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.bannedClient,
      'message': message
    })
  }

  /**
   * Process RPL_STATSYLINE responses from the server.
   * @private
   */
  processMessageStatsYLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.connectionClass,
      'message': message
    })
  }

  /**
   * Process RPL_ENDOFSTATS responses from the server.
   * @private
   */
  processMessageEndOfStats (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    /**
     * @event IrcClient#serverStatistics
     * @property {ServerStatistic[]} serverStatistics
     */
    this.client.emit('serverStatistics', this.listedStatsEntries)
    this.listedStatsEntries = []
  }

  /**
   * Process RPL_STATSLLINE responses from the server.
   * @private
   */
  processMessageStatsLLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.leafDepth,
      'message': message
    })
  }

  /**
   * Process RPL_STATSUPTIME responses from the server.
   * @private
   */
  processMessageStatsUpTime (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.uptime,
      'message': message
    })
  }

  /**
   * Process RPL_STATSOLINE responses from the server.
   * @private
   */
  processMessageStatsOLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.allowedOperator,
      'message': message
    })
  }

  /**
   * Process RPL_STATSHLINE responses from the server.
   * @private
   */
  processMessageStatsHLine (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.listedStatsEntries.push({
      'type': IrcServerStatisticalEntry.hubServer,
      'message': message
    })
  }

  /**
   * Process RPL_LUSERCLIENT responses from the server.
   * @private
   */
  processMessageLUserClient (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[0])

    let info = message.parameters[1]
    let infoParts = info.split(' ')
    console.assert(infoParts.length === 10)

    if (!this.client.networkInfo) {
      this.client.networkInfo = {}
    }

    this.client.networkInfo.visibleUsersCount = parseInt(infoParts[2])
    this.client.networkInfo.invisibleUsersCount = parseInt(infoParts[5])
    this.client.networkInfo.serversCount = parseInt(infoParts[8])

    /**
     * @event IrcClient#networkInfo
     * @property {NetworkInfo} networkInfo
     */
    this.client.emit('networkInfo', this.client.networkInfo)
  }

  /**
   * Process RPL_LUSEROP responses from the server.
   * @private
   */
  processMessageLUserOp (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    if (!this.client.networkInfo) {
      this.client.networkInfo = {}
    }

    this.client.networkInfo.operatorsCount = parseInt(message.parameters[1])
    /**
     * @event IrcClient#networkInfo
     * @property {NetworkInfo} networkInfo
     */
    this.client.emit('networkInfo', this.client.networkInfo)
  }

  /**
   * Process RPL_LUSERUNKNOWN responses from the server.
   * @private
   */
  processMessageLUserUnknown (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    if (!this.client.networkInfo) {
      this.client.networkInfo = {}
    }

    this.client.networkInfo.unknownConnectionsCount = parseInt(message.parameters[1])
    /**
     * @event IrcClient#networkInfo
     * @property {NetworkInfo} networkInfo
     */
    this.client.emit('networkInfo', this.client.networkInfo)
  }

  /**
   * Process RPL_LUSERCHANNELS responses from the server.
   * @private
   */
  processMessageLUserChannels (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    if (!this.client.networkInfo) {
      this.client.networkInfo = {}
    }

    this.client.networkInfo.channelsCount = parseInt(message.parameters[1])
    /**
     * @event IrcClient#networkInfo
     * @property {NetworkInfo} networkInfo
     */
    this.client.emit('networkInfo', this.client.networkInfo)
  }

  /**
   * Process RPL_LUSERME responses from the server.
   * @private
   */
  processMessageLUserMe (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    if (!this.client.networkInfo) {
      this.client.networkInfo = {}
    }

    let info = message.parameters[1]
    let infoParts = info.split(' ')

    for (let i = 0; i < infoParts.length; i++) {
      switch (infoParts[i].toLowerCase()) {
        case 'user':
        case 'users':
          this.client.networkInfo.serverClientsCount = parseInt(infoParts[i - 1])
          break
        case 'server':
        case 'servers':
          this.client.networkInfo.serverServersCount = parseInt(infoParts[i - 1])
          break
        case 'service':
        case 'services':
          this.client.networkInfo.serverClientsCount = parseInt(infoParts[i - 1])
          break
      }
    }

    /**
     * @event IrcClient#networkInfo
     * @property {NetworkInfo} networkInfo
     */
    this.client.emit('networkInfo', this.client.networkInfo)
  }

  /**
   * Process RPL_AWAY responses from the server.
   * @private
   */
  processMessageReplyAway (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    user.awayMessage = message.parameters[2]
    user.isAway = true
  }

  /**
   * Process RPL_ISON responses from the server.
   * @private
   */
  processMessageReplyIsOn (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let onlineUserNames = message.parameters[1].split(' ')
    onlineUserNames.forEach(name => {
      let onlineUser = this.client.getUserFromNickName(name)
      onlineUser.isOnline = true
    })
  }

  /**
   * Process RPL_UNAWAY responses from the server.
   * @private
   */
  processMessageReplyUnAway (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.client.localUser.isAway = false
  }

  /**
   * Process RPL_NOWAWAY responses from the server.
   * @private
   */
  processMessageReplyNowAway (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    this.client.localUser.isAway = true
  }

  /**
   * Process RPL_WHOISUSER responses from the server.
   * @private
   */
  processMessageReplyWhoIsUser (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    user.userName = message.parameters[2]

    console.assert(message.parameters[3])
    user.hostName = message.parameters[3]

    console.assert(message.parameters[4])
    console.assert(message.parameters[5])
    user.realName = message.parameters[5]
  }

  /**
   * Process RPL_WHOISSERVER responses from the server.
   * @private
   */
  processMessageReplyWhoIsServer (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    user.serverName = message.parameters[2]

    console.assert(message.parameters[3])
    user.serverInfo = message.parameters[3]
  }

  /**
   * Process RPL_WHOISOPERATOR responses from the server.
   * @private
   */
  processMessageReplyWhoIsOperator (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])
    user.isOperator = true
  }

  /**
   * Process RPL_WHOWASUSER responses from the server.
   * @private
   */
  processMessageReplyWhoWasUser (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1], false)

    console.assert(message.parameters[2])
    user.userName = message.parameters[2]

    console.assert(message.parameters[3])
    user.hostName = message.parameters[3]

    console.assert(message.parameters[4])
    console.assert(message.parameters[5])
    user.realName = message.parameters[5]
  }

  /**
   * Process RPL_ENDOFWHO responses from the server.
   * @private
   */
  processMessageReplyEndOfWho (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let mask = message.parameters[1]
    /**
     * @event IrcClient#whoReply
     * @param {string} mask
     */
    this.client.emit('whoReply', mask)
  }

  /**
   * Process RPL_WHOISIDLE responses from the server.
   * @private
   */
  processMessageReplyWhoIsIdle (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    user.idleDuration = parseInt(message.parameters[2])
  }

  /**
   * Process RPL_ENDOFWHOIS responses from the server.
   * @private
   */
  processMessageReplyEndOfWhoIs (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])
    /**
     * @event IrcClient#whoIsReply
     * @param {IrcUser} user
     */
    this.client.emit('whoIsReply', user)
  }

  /**
   * Process RPL_WHOISCHANNELS responses from the server.
   * @private
   */
  processMessageReplyWhoIsChannels (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let user = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    let channelIds = message.parameters[2].split(' ')
    channelIds.forEach(channelId => {
      if (channelId.length === 0) {
        return
      }
      let lookup = this.getUserModeAndIdentifier(channelId)
      let channel = this.getChannelFromName(lookup.identifier)
      if (!(channel.getChannelUser(user))) {
        channel.userJoined(new IrcChannelUser(user, lookup.mode.split('')))
      }
    })
  }

  /**
   * Process RPL_LIST responses from the server.
   * @private
   */
  processMessageReplyList (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channelName = message.parameters[1]

    console.assert(message.parameters[2])
    let visibleUsersCount = parseInt(message.parameters[2])

    console.assert(message.parameters[3])
    let topic = message.parameters[3]

    this.client.listedChannels.push({
      'channelName': channelName,
      'visibleUsersCount': visibleUsersCount,
      'topic': topic
    })
  }

  /**
   * Process RPL_LISTEND responses from the server.
   * @private
   */
  processMessageReplyListEnd (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    /**
     * @event IrcClient#channelList
     * @param {Object[]} listedChannels
     */
    this.client.emit('channelList', this.client.listedChannels)
    this.client.listedChannels = []
  }

  /**
   * Process processMessageReplyListEnd responses from the server
   * @private
   */
  processMessageReplyChannelModes (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = this.getChannelFromName(message.parameters[0])
    let modesAndParameters = this.getModeAndParameters(message.parameters.slice(1))

    channel.modesChanged(message.source, modesAndParameters.modes, modesAndParameters.parameters)

    /**
     * @event IrcClient#channelMode
     * @param {IrcChannel} channel
     * @param {IrcChannel|IrcUser} channel
     * @param {string[]} modes
     * @param {string[]} parameters
     */
    this.client.emit('channelMode',
      channel, message.source, modesAndParameters.modes, modesAndParameters.parameters)
  }

  /**
   * Process RPL_NOTOPIC responses from the server.
   * @private
   */
  processMessageReplyNoTopic (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = this.getChannelFromName(message.parameters[1])
    channel.topicChanged(null, null)
  }

  /**
   * Process RPL_TOPIC responses from the server.
   * @private
   */
  processMessageReplyTopic (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = this.getChannelFromName(message.parameters[1])

    console.assert(message.parameters[2])
    channel.topicChanged(null, message.parameters[2])
  }

  /**
   * Process RPL_INVITING responses from the server.
   * @private
   */
  processMessageReplyInviting (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let invitedUser = this.client.getUserFromNickName(message.parameters[1])

    console.assert(message.parameters[2])
    let channel = this.getChannelFromName(message.parameters[2])
    channel.userInvited(invitedUser)
  }

  /**
   * Process RPL_VERSION responses from the server.
   * @private
   */
  processMessageReplyVersion (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let versionInfo = message.parameters[1]
    let versionSplitIndex = versionInfo.lastIndexOf('.')
    let version = versionInfo.substr(0, versionSplitIndex)
    let debugLevel = versionInfo.substr(versionSplitIndex + 1)

    console.assert(message.parameters[2])
    let server = message.parameters[2]

    console.assert(message.parameters[3])
    let comments = message.parameters[3]

    /**
     * @event IrcClient#serverVersion
     * @property {string} version
     * @property {string} debugLevel
     * @property {string} server
     * @property {string} comments
     */
    this.client.emit('serverVersion', {
      'version': version,
      'debugLevel': debugLevel,
      'server': server,
      'comments': comments
    })
  }

  /**
   * Process RPL_WHOREPLY responses from the server.
   * @private
   */
  processMessageReplyWhoReply (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = message.parameters[1] === '*' ? null : this.getChannelFromName(message.parameters[1])

    console.assert(message.parameters[5])
    let user = this.client.getUserFromNickName(message.parameters[5])

    console.assert(message.parameters[3])
    user.hostName = message.parameters[3]

    console.assert(message.parameters[4])
    user.serverName = message.parameters[4]

    console.assert(message.parameters[6])
    let userModeFlags = message.parameters[6]

    console.assert(userModeFlags.length > 0)
    if (userModeFlags.includes('H')) {
      user.IsAway = false
    } else if (userModeFlags.includes('G')) {
      user.IsAway = true
    }

    user.IsOperator = userModeFlags.includes('*')

    if (channel) {
      let channelUser = channel.getChannelUser(user)
      if (!channelUser) {
        channelUser = new IrcChannelUser(user)
        channel.userJoined(channelUser)
      }

      for (let c of userModeFlags.split('')) {
        let mode = this.client.channelUserModesPrefixes[c]
        if (mode) {
          channelUser.modeChanged(true, mode)
        } else {
          break
        }
      }
    }

    console.assert(message.parameters[7])
    let lastParamParts = message.parameters[7].split(' ')
    user.hopCount = parseInt(lastParamParts[0])
    if (lastParamParts.length > 1) {
      user.realName = lastParamParts[1]
    }
  }

  /**
   * Process RPL_NAMEREPLY responses from the server.
   * @private
   */
  processMessageReplyNameReply (message) {
    function getChannelType (type) {
      switch (type) {
        case '=':
          return IrcChannelType.public
        case '*':
          return IrcChannelType.private
        case '@':
          return IrcChannelType.secret
        default:
          throw new ArgumentError(`The channel type '${type}' sent by the server is invalid.`)
      }
    }

    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[2])

    let channel = this.getChannelFromName(message.parameters[2])
    if (channel) {
      console.assert(message.parameters[1])
      console.assert(message.parameters[1].length === 1)
      channel.typeChanged(getChannelType(message.parameters[1][0]))

      console.assert(message.parameters[3])
      let userIds = message.parameters[3].split(' ')
      userIds.forEach(userId => {
        if (userId.length === 0) {
          return
        }

        let userNickNameAndMode = this.getUserModeAndIdentifier(userId)
        let user = this.client.getUserFromNickName(userNickNameAndMode.identifier)
        channel.userNameReply(new IrcChannelUser(user, userNickNameAndMode.mode.split('')))
      })
    }
  }

  /**
   * Process RPL_LINKS responses from the server.
   * @private
   */
  processMessageReplyLinks (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let hostName = message.parameters[1]

    console.assert(message.parameters[3])
    let infoParts = message.parameters[3].split(' ')

    console.assert(infoParts.length >= 2)
    let hopCount = parseInt(infoParts[0])
    let info = infoParts[1]

    this.client.listedServerLinks.push({ 'hostName': hostName, 'hopCount': hopCount, 'info': info })
  }

  /**
   * Process RPL_ENDOFLINKS responses from the server.
   * @private
   */
  processMessageReplyEndOfLinks (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)

    /**
     * @event IrcClient#serverLinks
     * @property {object[]} serverLinks
     */
    this.client.emit('serverLinks', this.client.listedServerLinks)
    this.client.listedServerLinks = []
  }

  /**
   * Process RPL_ENDOFNAMES responses from the server.
   * @private
   */
  processMessageReplyEndOfNames (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = this.getChannelFromName(message.parameters[1])
    channel.usersListReceived()
  }

  /**
   * Process RPL_BANLIST responses from the server.
   * @private
   */
  processMessageReplyBanList (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)

    if (!(this.banList)) {
      this.banList = []
    }

    let [, channel, banMask, bannedBy, time] = message.parameters

    this.banList.push({
      'channel': channel,
      'banMask': banMask,
      'bannedBy': bannedBy,
      'time': parseInt(time)
    })
  }

  /**
   * Process RPL_ENDOFBANLIST responses from the server.
   * @private
   */
  processMessageReplyBanListEnd (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    let channel = this.getChannelFromName(message.parameters[1])
    /**
     * @event IrcClient#banList
     * @property {object[]} banList
     */
    channel.emit('banList', this.banList || [])
    this.banList = []
  }

  /**
   * Process RPL_ENDOFWHOWAS responses from the server.
   * @private
   */
  processMessageReplyEndOfWhoWas (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])
    /**
     * @event IrcClient#whoWasReply
     * @property {IrcUser} user
     */
    this.client.emit('whoWasReply', this.client.getUserFromNickName(message.parameters[1], false))
  }

  /**
   * Process RPL_MOTD responses from the server.
   * @private
   */
  processMessageReplyMotd (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    this.client.messageOfTheDay += message.parameters[1] + '\r\n'
  }

  /**
   * Process RPL_MOTDSTART responses from the server.
   * @private
   */
  processMessageReplyMotdStart (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)

    this.client.messageOfTheDay = ''
  }

  /**
   * Process RPL_ENDOFMOTD responses from the server.
   * @private
   */
  processMessageReplyMotdEnd (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])

    this.client.messageOfTheDay += message.parameters[1]
    /**
     * @event IrcClient#motd
     * @property {string} messageOfTheDay
     */
    this.client.emit('motd', this.client.messageOfTheDay)
  }

  /**
   * Process RPL_TIME responses from the server.
   * @private
   */
  processMessageReplyTime (message) {
    console.assert(message.parameters[0] === this.client.localUser.nickName)
    console.assert(message.parameters[1])
    console.assert(message.parameters[2])

    let [server, dateTime] = message.parameters
    /**
     * @event IrcClient#serverTime
     * @property {string} server
     * @property {string} dateTime
     */
    this.client.emit('serverTime', server, dateTime)
  }

  /**
   * Process Numeric Errors responses from the server.
   * @private
   */
  processMessageNumericError (message) {
    console.assert(message.parameters[0])
    console.assert(message.parameters[1])

    let errorParameters = []
    let errorMessage = null
    for (let i = 1; i < message.parameters.length; i++) {
      if (i + 1 === message.parameters.length || !(message.parameters[i + 1])) {
        errorMessage = message.parameters[i]
        break
      }
      errorParameters.push(message.parameters[i])
    }

    let errorName = IrcError[message.command]

    /**
     * @event IrcClient#protocolError
     * @property {number} command
     * @property {string[]} errorParameters
     * @property {string} errorMessage
     */
    this.client.emit('protocolError', parseInt(message.command), errorName, errorParameters, errorMessage)
  }

  /** @private */
  getChannelFromName (channelName) {
    if (!channelName) {
      throw new ArgumentNullError('channelName')
    }

    let existingChannel = this.client.channels.find(c => c.name === channelName)
    if (existingChannel) {
      return existingChannel
    }

    let newChannel = new IrcChannel(this.client, channelName)
    this.client.channels.push(newChannel)

    return newChannel
  }

  /** @private */
  getMessageTarget (targetName) {
    if (!(targetName)) {
      throw new ArgumentNullError('targetName')
    }

    if (targetName === '*') {
      return this.client
    }

    let channelName = null
    let channelNameMatch = targetName.match(regexChannelName)
    if (channelNameMatch) {
      channelName = channelNameMatch[1]
    }

    let nickName = null
    let nickNameMatch = targetName.match(regexNickNameId)
    if (nickNameMatch) {
      nickName = nickNameMatch[1]
    }

    let userName = null
    let userNameMatch = targetName.match(regexUserNameId)
    if (userNameMatch) {
      userName = userNameMatch[1]
    }

    let hostName = null
    let hostNameMatch = targetName.match(regexHostName)
    if (hostNameMatch) {
      hostName = hostNameMatch[1]
    }

    let targetMask = null
    let targetMaskMatch = targetName.match(regexTargetMask)
    if (targetMaskMatch) {
      targetMask = targetMaskMatch[1]
    }

    if (channelName) {
      return this.getChannelFromName(channelName)
    }

    if (nickName) {
      let user = this.client.getUserFromNickName(nickName, true)
      if (!(user.userName)) {
        user.userName = userName
      }
      if (!(user.hostName)) {
        user.hostName = hostName
      }
      return user
    }

    if (userName) {
      let user = this.client.getUserFromNickName(nickName, true)
      if (!(user.hostName)) {
        user.hostName = hostName
      }
      return user
    }

    if (targetMask) {
      if (targetMask.length < 2) {
        throw new ArgumentError('The target mask must be contain at least two characters.')
      }

      if (targetMask[0] === '$') {
        return '$' // Server Mask
      } else if (targetMask[0] === '#') {
        return '#' // Host Mask
      } else {
        throw new ArgumentError(`The type of the given target mask '${targetMask}' is invalid.`)
      }
    }

    throw new ArgumentError(`The source '${targetName}' of the message was not recognised as either a server or user.`)
  }

  /** @private */
  getUserModeAndIdentifier (identifier) {
    if (!identifier) {
      throw new ArgumentNullError('identifier')
    }

    let mode = identifier[0]
    let channelUserMode = this.client.channelUserModesPrefixes[mode]
    if (channelUserMode) {
      return { 'mode': channelUserMode, 'identifier': identifier.substring(1) }
    }
    return { 'mode': '', 'identifier': identifier }
  }

  /** @private */
  handleISupportParameter (name, value) {
    if (!name) {
      throw new ArgumentNullError('name')
    }

    if (name.toLowerCase() === 'prefix') {
      let prefixValueMatch = value.match(regexISupportPrefix)
      let prefixes = prefixValueMatch[2]
      let modes = prefixValueMatch[1]

      if (prefixes.length !== modes.length) {
        throw new ProtocolViolationError(
          'The ISUPPORT message sent by the server contains an invalid PREFIX parameter.')
      }

      this.client.channelUserModes = []
      this.client.channelUserModes = modes.split('')

      this.client.channelUserModesPrefixes = {}
      for (let i = 0; i < prefixes.length; i++) {
        this.client.channelUserModesPrefixes[prefixes[i]] = this.client.channelUserModes[i]
      }
    }
  }

  /** @private */
  getModeAndParameters (messageParameters) {
    let modes = ''
    let modeParameters = []
    messageParameters.forEach(p => {
      if (!(p)) { return }
      if (p.length !== 0) {
        if (p[0] === '+' || p[0] === '-') {
          modes += p
        } else {
          modeParameters.push(p)
        }
      }
    })
    return { 'modes': modes.split(''), 'parameters': modeParameters }
  }
}

module.exports = IrcMessageProcessor
