// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const util = require('util')
const events = require('events')
const { EventEmitter } = events
const strftime = require('strftime')

const taggedDataDelimeterChar = String.fromCharCode(0x01)
const lowLevelQuotingEscapeChar = String.fromCharCode(0x10)
const ctcpQuotingEscapeChar = String.fromCharCode(0x5C)

/**
 * Represents a client that communicates with a server using CTCP (Client to Client Protocol), 
 * operating over an IRC connection.
 *
 * @class CtcpClient
 * @extends EventEmitter
 */
class CtcpClient extends EventEmitter {

  /*
   * Constructs a new CtcpClient for a given {@link IrcClient}.
   *
   * @constructor
   * @param {IrcClient} client The IRC client by which the CTCP client should communicate.
  */
  constructor (client) {
    super()
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
  }

  /**
   * Gets the {@link IrcClient} by which the CTCP client should communicate.
   *
   * @public
   * @return {IrcClient} The IRC client.
   */
   get client() {
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
    var now = new Date()
    this.sendMessagePing(targets, now.getTime(), false)
  }

  // - Event Handlers

  connected () {
    var localUser = this.client.localUser
    if (localUser == null) {
      return
    }

    localUser.on('joinedChannel', this.joinedChannel.bind(this))
    localUser.on('leftChannel', this.leftChannel.bind(this))
    localUser.on('previewMessage', this.previewMessage.bind(this))
    localUser.on('previewNotice', this.previewNotice.bind(this))
  }

  disconnected () {
    //
  }

  joinedChannel (channel) {
    channel.on('previewMessage', this.previewMessage.bind(this))
    channel.on('previewNotice', this.previewNotice.bind(this))
  }

  leftChannel (channel) {
    channel.off('previewMessage', this.previewMessage)
    channel.off('previewNotice', this.previewNotice)
  }

  previewMessage (e) {
    e.handled = this.readMessage(e, false)
  }

  previewNotice (e) {
    e.handled = this.readMessage(e, true)
  }

  readMessage (e, isNotice) {
    if (!(e.text[0] == taggedDataDelimeterChar && e.text[e.text.length - 1] == taggedDataDelimeterChar)) {
      return false
    }
    
    var message = {
      'source': e.source,
      'targets': e.targets,
      'isResponse': isNotice
    }

    var dequotedText = lowLevelDequote(ctcpDequote(e.text.substr(1, e.text.length - 2)))
    var firstSpaceIndex = dequotedText.indexOf(' ')
    if (firstSpaceIndex == -1) {
        message['tag'] = dequotedText
        message['data'] = null
    }
    else
    {
        message['tag'] = dequotedText.substr(0, firstSpaceIndex)
        message['data'] = trimStart(':', dequotedText.substr(firstSpaceIndex + 1))
    }

    this.emit('rawMessage', message)

    var messageProcessor = this._messageProcessors[message.tag]
    if (messageProcessor != null) {
      messageProcessor(message)
    } else {
      console.log(`Unsupported CTCP Command '${message.tag}'`)
    }

    return true
  }

  // - Message Processors

  processMessageAction (message) {
    if (message.isResponse) {
      return
    } 

    message.targets.forEach(t => t.actionReceived(message.source, message.targets, message.data))
  }

  processMessageVersion (message) {
    if (message.isResponse) {
      var versionInfo = message.data
      this.emit('version', message.source, versionInfo)
    } else {
      var versionInfo = `${this.clientName} ${this.clientVersion}`
      this.sendMessageVersion([message.source.nickName], versionInfo, true)
    }
  }

  processMessagePing (message) {
    if (message.isResponse) {
      var now = new Date().getTime()
      var sendTime = parseInt(message.data)
      var pingTime = now - sendTime
      this.emit('ping', message.source, pingTime)
    } else {
      this.sendMessagePing([message.source.nickName], message.data, true)
    }
  }

  processMessageTime (message) {
    if (message.isResponse) {
      var dateTime = message.data
      this.emit('time', message.source, dateTime)
    } else {
      var now = Date()
      this.sendMessageTime([message.source.nickName], now.toLocaleString(), true)
    }
  }

  processMessageFinger (message) {
    if (message.isResponse) {
      this.emit('finger', message.source, message.data)
    } else {
      var finger = `${this.client.registrationInfo.realName} (${this.client.registrationInfo.userName})`
      this.sendMessageFinger([message.source.nickName], finger, true)
    }
  }

  processMessageClientInfo (message) {
    if (message.isResponse) {
      this.emit('clientInfo', message.source, message.data)
    } else {
      var supportedCommands = 'ACTION CLIENTINFO FINGER PING TIME VERSION'
      this.sendMessageClientInfo([message.source.nickName], supportedCommands, true)
    }
  }

  // - Message Sending

  sendMessageAction (targets, text) {
    this.writeMessage(targets, 'ACTION', text)
  }

  sendMessageTime (targets, info, isResponse) {
    this.writeMessage(targets, 'TIME', info, isResponse)
  }

  sendMessageVersion (targets, info, isResponse) {
    this.writeMessage(targets, 'VERSION', info, isResponse)
  }

  sendMessagePing (targets, info, isResponse) {
    this.writeMessage(targets, 'PING', info, isResponse)
  }

  sendMessageFinger (targets, info, isResponse) {
    this.writeMessage(targets, 'FINGER', info, isResponse)
  }

  sendMessageClientInfo (targets, info, isResponse) {
    this.writeMessage(targets, 'CLIENTINFO', info, isResponse)
  }

  writeMessage (targets, tag, data = null, isResponse = false) {
    var tag = tag.toUpperCase()
    var taggedData = data == null ? tag : tag + ' ' + data
    var text = taggedDataDelimeterChar + lowLevelQuote(ctcpQuote(taggedData)) + taggedDataDelimeterChar

    if (isResponse) {
      this.client.sendMessageNotice(targets, text)
    } else {
      this.client.sendMessagePrivateMessage(targets, text)
    }
  }
}

function ctcpQuote (value) {
  return quote(value, ctcpQuotingEscapeChar, {
    taggedDataDelimeterChar: 'a'
  });
}

function ctcpDequote (value) {
  return dequote(value, ctcpQuotingEscapeChar, {
    'a': taggedDataDelimeterChar
  });
}

function lowLevelQuote (value) {
  return quote(value, lowLevelQuotingEscapeChar, {
    '\0': '0',
    '\n': 'n',
    '\r': 'r'
  })
}

function lowLevelDequote (value) {
  return dequote(value, lowLevelQuotingEscapeChar, {
    '0': '\0',
    'n': '\n',
    'r': '\r'
  })
}

function quote(value, escapeChar, quotedChars) {
  var output = ''
  for (var i = 0; i < value.length; i++) {
    if (value[i] == escapeChar) {
      if (dequotedChars[value[i]] != null || value[i] == escapeChar) {
        output += escapeChar
        output += dequotedChars[value[i]] || escapeChar
      } else {
        throw 'Invalid Quote Character.'
      }
    } else {
      output += value[i]
    }
  }
  return output
}

function dequote(value, escapeChar, dequotedChars) {
  var output = ''
  for (var i = 0; i < value.length; i++) {
    if (value[i] == escapeChar) {
      i++
      if (dequotedChars[value[i]] != null || value[i] == escapeChar) {
        output += dequotedChars[value[i]] || escapeChar
      } else {
        throw 'Invalid Quote Character.'
      }
    } else {
      output += value[i]
    }
  }
  return output
}

function trimStart(chr, string) {
  var output = string
  while (output[0] == chr) {
    output = output.splice(1)
  }
  return output
}

module.exports = CtcpClient
