// Copyright (c) 2018 Claus Jørgensen
'use strict'

const net = require('net')
const util = require('util')
const events = require('events')
const { EventEmitter } = events
const strftime = require('./strftime.js')

const taggedDataDelimeterChar = String.fromCharCode(0x01)
const lowLevelQuotingEscapeChar = String.fromCharCode(0x10)
const ctcpQuotingEscapeChar = String.fromCharCode(0x5C)

// - Public Functions

function CtcpClient (client) {
  this.client = client
  this.client.on('connected', this.connected.bind(this))
  this.client.on('disconnected', this.disconnected.bind(this))
  this.messageProcessors = {
    'VERSION': this.processMessageVersion.bind(this),
    'PING': this.processMessagePing.bind(this),
    'TIME': this.processMessageTime.bind(this)
  }
  this.clientVersion = '0.0.1'
  this.clientName = ''
}

CtcpClient.prototype.action = function (users, text) {
  this.sendMessageAction(users.map(u => u.nickName), text)
}

CtcpClient.prototype.time = function (users) {
  this.sendMessageTime(users.map(u => u.nickName), null, false)
}

CtcpClient.prototype.version = function (users) {
 this.sendMessageVersion(users.map(u => u.nickName), null, false) 
}

CtcpClient.prototype.ping = function (users) {
  var now = new Date()
  this.sendMessagePing(users.map(u => u.nickName), now.getTime(), false)
}

// - Event Handlers

CtcpClient.prototype.connected = function () {
  if (this.client.localUser == null) {
    return
  }

  this.client.localUser.on('previewMessage', this.previewMessage.bind(this))
  this.client.localUser.on('previewNotice', this.previewNotice.bind(this))
}

CtcpClient.prototype.disconnected = function () {
  if (this.client.localUser == null) {
    return
  }

  this.client.localUser.off('previewMessage', this.previewMessage)
  this.client.localUser.off('previewNotice', this.previewNotice)
}

CtcpClient.prototype.previewMessage = function (e) {
  this.readMessage(e, false)
}

CtcpClient.prototype.previewNotice = function (e) {
  this.readMessage(e, true)
}

CtcpClient.prototype.readMessage = function (e, isNotice) { 
  if (e.text[0] == taggedDataDelimeterChar && e.text[e.text.length - 1] == taggedDataDelimeterChar) {
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

    var messageProcessor = this.messageProcessors[message.tag]
    if (messageProcessor != null) {
      messageProcessor(message)
    }

    e.handled = true
  }
}

// - Message Processors

CtcpClient.prototype.processMessageVersion = function (message) {
  if (message.isResponse) {
    var versionInfo = message.data
    this.emit('version', message.source, versionInfo)
  } else {
    var versionInfo = `${this.clientName} ${this.clientVersion}`
    this.sendMessageVersion([message.source.nickName], versionInfo, true)
  }
}

CtcpClient.prototype.processMessagePing = function (message) {
  if (message.isResponse) {
    var now = Math.round(new Date().getTime() / 1000)
    var sendTime = parseInt(message.data)
    var pingTime = now - sendTime
    this.emit('ping', message.source, pingTime)
  } else {
    this.sendMessagePing([message.source.nickName], message.data, true)
  }
}

CtcpClient.prototype.processMessageTime = function (message) {
  if (message.isResponse) {
    var dateTime = message.data
    this.emit('time', message.source, dateTime)
  } else {
    var now = Date()
    this.sendMessageTime([message.source.nickName], now.toLocaleString(), true)
  }
}

// - Message Sending

CtcpClient.prototype.sendMessageAction = function (targets, text) {
  this.writeMessage(targets, 'ACTION', text)
}

CtcpClient.prototype.sendMessageTime = function (targets, info, isResponse) {
  this.writeMessage(targets, 'TIME', info, isResponse)
}

CtcpClient.prototype.sendMessageVersion = function (targets, info, isResponse) {
  this.writeMessage(targets, 'VERSION', info, isResponse)
}

CtcpClient.prototype.sendMessagePing = function (targets, info, isResponse) {
  this.writeMessage(targets, 'PING', info, isResponse)
}

CtcpClient.prototype.writeMessage = function (targets, tag, data = null, isResponse = false) {
  var tag = tag.toUpperCase()
  var taggedData = data == null ? tag : tag + ' ' + data
  var text = taggedDataDelimeterChar + lowLevelQuote(ctcpQuote(taggedData)) + taggedDataDelimeterChar

  if (isResponse) {
    this.client.sendMessageNotice(targets, text)
  } else {
    this.client.sendMessagePrivateMessage(targets, text)
  }
}

// - Utils

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

// - Module Configuration

util.inherits(CtcpClient, EventEmitter)

module.exports = CtcpClient
