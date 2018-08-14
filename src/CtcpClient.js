// Copyright (c) 2018 Claus Jørgensen
'use strict'

const events = require('events')
const { EventEmitter } = events
const log = require('electron-log')
const { ArgumentNullError, InvalidOperationError } = require('./Errors.js')

const taggedDataDelimeterChar = String.fromCharCode(0x01)
const lowLevelQuotingEscapeChar = String.fromCharCode(0x10)
const ctcpQuotingEscapeChar = String.fromCharCode(0x5C)

/**
 * Represents a client that communicates with a server using CTCP (Client to Client Protocol),
 * operating over an IRC connection.
 *
 * @public
 * @class
 * @extends EventEmitter
 *
 * @example
 *
 * let ircClient = new IrcClient()
 * let ctcpClient = new CtcpClient(ircClient)
 *
 * ctcpClient.on('version', (source, versionInfo) => {
 *   console.log(`[${source.nickName} VERSION reply]: ${versionInfo}.`)
 * }
 *
 * ctcpClient.version(['Rincewind'])
 *
 */
class CtcpClient extends EventEmitter {
  /**
   * Constructs a new CtcpClient for a given {@link IrcClient}.
   *
   * @throws {ArgumentNullError} if a parameter is null.
   * @param {IrcClient} client The IRC client by which the CTCP client should communicate.
   */
  constructor (client) {
    super()

    if (!client) {
      throw new ArgumentNullError('client')
    }

    this._client = client
    this._client.on('connected', this.connected.bind(this))
    this._client.on('disconnected', this.disconnected.bind(this))
    this._messageProcessors = {
      'ACTION': this.processMessageAction.bind(this),
      'VERSION': this.processMessageVersion.bind(this),
      'PING': this.processMessagePing.bind(this),
      'TIME': this.processMessageTime.bind(this),
      'FINGER': this.processMessageFinger.bind(this),
      'CLIENTINFO': this.processMessageClientInfo.bind(this)
    }
    this._clientVersion = '0.0.1'
    this._clientName = ''
    this._channelPreviewMessageEventListeners = {}
    this._channelPreviewNoticeEventListeners = {}
  }

  /**
   * Gets the {@link IrcClient} by which the CTCP client should communicate.
   *
   * @public
   * @return {IrcClient} The IRC client.
   */
  get client () {
    return this._client
  }

  /**
   * Gets the client version.
   */
  get clientVersion () {
    return this._clientVersion
  }

  /**
   * Sets the client version.
   */
  set clientVersion (value) {
    this._clientVersion = value
  }

  /**
   * Gets the client name.
   */
  get clientName () {
    return this._clientName
  }

  /**
   * Sets the client name.
   */
  set clientName (value) {
    this._clientName = value
  }

  /**
   * Sends an action message to the specified list of users.
   *
   * @public
   * @param {string[]} targets A list of users to which to send the request.
   * @param {string} text The text of the message.
   */
  action (targets, text) {
    this.sendMessageAction(targets, text)
  }

  /**
   * Gets additional information about a list of users.
   *
   * @public
   * @param {string[]} targets A list of users to which to send the request.
   */
  finger (targets) {
    this.sendMessageFinger(targets, null, false)
  }

  /**
   * Gets the local date/time of the specified list of users.
   *
   * @public
   * @param {string[]} targets A list of users to which to send the request.
   */
  time (targets) {
    this.sendMessageTime(targets, null, false)
  }

  /**
   * Gets the client version of the specified list of users.
   *
   * @public
   * @param {string[]} targets A list of users to which to send the request.
   */
  version (targets) {
    this.sendMessageVersion(targets, null, false)
  }

  /**
   * Pings the specified list of users.
   *
   * @public
   * @param {string[]} targets A list of users to which to send the request.
   */
  ping (targets) {
    let now = new Date()
    this.sendMessagePing(targets, now.getTime(), false)
  }

  /** @private */
  connected () {
    let localUser = this.client.localUser
    if (localUser == null) {
      return
    }

    this._joinedChannelEventListener = this.joinedChannel.bind(this)
    this._leftChannelEventListener = this.leftChannel.bind(this)
    this._localUserPreviewMessageEventListener = this.previewMessage.bind(this)
    this._localUserPreviewNoticeEventListener = this.previewNotice.bind(this)

    localUser.on('joinedChannel', this._joinedChannelEventListener)
    localUser.on('leftChannel', this._leftChannelEventListener)
    localUser.on('previewMessage', this._localUserPreviewMessageEventListener)
    localUser.on('previewNotice', this._localUserPreviewNoticeEventListener)
  }

  /** @private */
  disconnected () {
    let localUser = this.client.localUser
    if (localUser == null) {
      return
    }

    localUser.off('joinedChannel', this._joinedChannelEventListener)
    localUser.off('leftChannel', this._leftChannelEventListener)
    localUser.off('previewMessage', this._localUserPreviewMessageEventListener)
    localUser.off('previewNotice', this._localUserPreviewNoticeEventListener)
  }

  /** @private */
  joinedChannel (channel) {
    this._channelPreviewMessageEventListeners[channel] = this.previewMessage.bind(this)
    this._channelPreviewNoticeEventListeners[channel] = this.previewNotice.bind(this)

    channel.on('previewMessage', this._channelPreviewMessageEventListeners[channel])
    channel.on('previewNotice', this._channelPreviewNoticeEventListeners[channel])
  }

  /** @private */
  leftChannel (channel) {
    channel.off('previewMessage', this._channelPreviewMessageEventListeners[channel])
    channel.off('previewNotice', this._channelPreviewNoticeEventListeners[channel])
  }

  /** @private */
  previewMessage (e) {
    e.handled = this.readMessage(e, false)
  }

  /** @private */
  previewNotice (e) {
    e.handled = this.readMessage(e, true)
  }

  /** @private */
  readMessage (e, isNotice) {
    if (!(e.text[0] === taggedDataDelimeterChar && e.text[e.text.length - 1] === taggedDataDelimeterChar)) {
      return false
    }

    let message = {
      'source': e.source,
      'targets': e.targets,
      'isResponse': isNotice
    }

    let dequotedText = lowLevelDequote(ctcpDequote(e.text.substr(1, e.text.length - 2)))
    let firstSpaceIndex = dequotedText.indexOf(' ')
    if (firstSpaceIndex === -1) {
      message['tag'] = dequotedText
      message['data'] = null
    } else {
      message['tag'] = dequotedText.substr(0, firstSpaceIndex)
      message['data'] = trimStart(':', dequotedText.substr(firstSpaceIndex + 1))
    }

    /**
     * @event CtcpClient#rawMessage
     * @param {string} message
     */
    this.emit('rawMessage', message)

    let messageProcessor = this._messageProcessors[message.tag]
    if (messageProcessor != null) {
      try {
        messageProcessor(message)
      } catch (e) {
        log.error(e.message)
        this.emit('error', e.message)
      }
    } else {
      log.debug(`Unsupported CTCP Command '${message.tag}'`)
    }

    return true
  }

  /** @private */
  processMessageAction (message) {
    if (message.isResponse) {
      return
    }

    message.targets.forEach(t => t.actionReceived(message.source, message.targets, message.data))
  }

  /** @private */
  processMessageVersion (message) {
    if (message.isResponse) {
      let versionInfo = message.data
      /**
       * @event CtcpClient#version
       * @param {IrcUser} source
       * @param {string} versionInfo
       */
      this.emit('version', message.source, versionInfo)
    } else {
      let versionInfo = `${this.clientName} ${this.clientVersion}`
      this.sendMessageVersion([message.source.nickName], versionInfo, true)
    }
  }

  /** @private */
  processMessagePing (message) {
    if (message.isResponse) {
      let now = new Date().getTime()
      let sendTime = parseInt(message.data)
      let pingTime = now - sendTime
      /**
       * @event CtcpClient#ping
       * @param {IrcUser} source
       * @param {number} pingTime
       */
      this.emit('ping', message.source, pingTime)
    } else {
      this.sendMessagePing([message.source.nickName], message.data, true)
    }
  }

  /** @private */
  processMessageTime (message) {
    if (message.isResponse) {
      let dateTime = message.data
      /**
       * @event CtcpClient#time
       * @param {IrcUser} source
       * @param {string} dateTime
       */
      this.emit('time', message.source, dateTime)
    } else {
      let now = Date()
      this.sendMessageTime([message.source.nickName], now.toLocaleString(), true)
    }
  }

  /** @private */
  processMessageFinger (message) {
    if (message.isResponse) {
      /**
       * @event CtcpClient#finger
       * @param {IrcUser} source
       * @param {string} userInfo
       */
      this.emit('finger', message.source, message.data)
    } else {
      let finger = `${this.client.registrationInfo.realName} (${this.client.registrationInfo.userName})`
      this.sendMessageFinger([message.source.nickName], finger, true)
    }
  }

  /** @private */
  processMessageClientInfo (message) {
    if (message.isResponse) {
      /**
       * @event CtcpClient#clientInfo
       * @param {IrcUser} source
       * @param {string} clientInfo
       */
      this.emit('clientInfo', message.source, message.data)
    } else {
      let supportedCommands = 'ACTION CLIENTINFO FINGER PING TIME VERSION'
      this.sendMessageClientInfo([message.source.nickName], supportedCommands, true)
    }
  }

  /** @private */
  sendMessageAction (targets, text) {
    this.writeMessage(targets, 'ACTION', text)
  }

  /** @private */
  sendMessageTime (targets, info, isResponse) {
    this.writeMessage(targets, 'TIME', info, isResponse)
  }

  /** @private */
  sendMessageVersion (targets, info, isResponse) {
    this.writeMessage(targets, 'VERSION', info, isResponse)
  }

  /** @private */
  sendMessagePing (targets, info, isResponse) {
    this.writeMessage(targets, 'PING', info, isResponse)
  }

  /** @private */
  sendMessageFinger (targets, info, isResponse) {
    this.writeMessage(targets, 'FINGER', info, isResponse)
  }

  /** @private */
  sendMessageClientInfo (targets, info, isResponse) {
    this.writeMessage(targets, 'CLIENTINFO', info, isResponse)
  }

  /** @private */
  writeMessage (targets, tag, data = null, isResponse = false) {
    let taggedData = data == null ? tag.toUpperCase() : tag.toUpperCase() + ' ' + data
    let text = taggedDataDelimeterChar + lowLevelQuote(ctcpQuote(taggedData)) + taggedDataDelimeterChar

    if (isResponse) {
      this.client.sendMessageNotice(targets, text)
    } else {
      this.client.sendMessagePrivateMessage(targets, text)
    }
  }
}

/** @private */
function ctcpQuote (value) {
  return quote(value, ctcpQuotingEscapeChar, {
    taggedDataDelimeterChar: 'a'
  })
}

/** @private */
function ctcpDequote (value) {
  return dequote(value, ctcpQuotingEscapeChar, {
    'a': taggedDataDelimeterChar
  })
}

/** @private */
function lowLevelQuote (value) {
  return quote(value, lowLevelQuotingEscapeChar, {
    '\0': '0',
    '\n': 'n',
    '\r': 'r'
  })
}

/** @private */
function lowLevelDequote (value) {
  return dequote(value, lowLevelQuotingEscapeChar, {
    '0': '\0',
    'n': '\n',
    'r': '\r'
  })
}

/**
 * Enquotes specified string given escape character and mapping for quotation characters.
 * @private
 */
function quote (value, escapeChar, quotedChars) {
  let output = ''
  for (let i = 0; i < value.length; i++) {
    if (value[i] === escapeChar) {
      if (quotedChars[value[i]] || value[i] === escapeChar) {
        output += escapeChar
        output += quotedChars[value[i]] || escapeChar
      } else {
        output += value[i]
      }
    } else {
      output += value[i]
    }
  }
  return output
}

/**
 * Dequotes specified string given escape character and mapping for quotation characters.
 * @private
 */
function dequote (value, escapeChar, dequotedChars) {
  let output = ''
  for (let i = 0; i < value.length; i++) {
    if (value[i] === escapeChar) {
      i++
      if (dequotedChars[value[i]] || value[i] === escapeChar) {
        output += dequotedChars[value[i]] || escapeChar
      } else {
        throw new InvalidOperationError(`The quoted character '${value[i]}' was not recognised.`)
      }
    } else {
      output += value[i]
    }
  }
  return output
}

/**
 * Removes all occurrences of a set of characters specified in an array from the beginning of the string.
 * @private
 */
function trimStart (chr, string) {
  let output = string
  while (output[0] === chr) {
    output = output.splice(1)
  }
  return output
}

module.exports = CtcpClient
