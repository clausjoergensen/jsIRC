// Copyright (c) 2018 Claus Jørgensen
'use strict'

var util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcUtils = require('./IrcUtils.js')

function IrcUser(client) {
    this.client = client
    this.isOnline = false
    this.nickName = null
    this.userName = null
    this.realName = null
    this.modes = []
    this.idleDuration = null
    this.isOperator = false
    this.serverName = null
    this.serverInfo = null
    this.isAway = false
    this.awayMessage = null
    this.isLocalUser = false
}

IrcUser.prototype.quit = function (comment) {
  var allChannelUsers = []
  client.channels.forEach(channel => {
    channel.users.forEach(user => {
      var channelUser = channel.users[user]
      if (channelUser.user == this) {
        allChannelUsers.push(channelUser)
      }
    })
  })

  allChannelUsers.forEach(u => u.userQuit(channelUser, comment))

  this.emit('quit', comment)
}

IrcUser.prototype.modesChanged = function (newModes) {
  console.log('modesChanged', newModes)
  this.modes = IrcUtils.updateModes(this.modes, newModes.split(''))
}

IrcUser.prototype.joinChannel = function (channel) {
  this.emit('joinedChannel', channel) 
}

IrcUser.prototype.partChannel = function (channel) {
 this.emit('partedChannel', channel)  
}

IrcUser.prototype.inviteReceived = function (source, channel) {
  this.emit('invite', channel, source)
}

IrcUser.prototype.actionReceived = function (source, targets, messageText) {
  this.emit('action', source, messageText)
}

IrcUser.prototype.messageReceived = function (source, targets, messageText) {
  var previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
  this.emit('previewMessage', previewMessageEventArgs)
  
  if (!previewMessageEventArgs.handled) {
    this.emit('message', source, targets, messageText)
  }
}

IrcUser.prototype.noticeReceived = function (source, targets, noticeText) {
  var previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
  this.emit('previewNotice', previewNoticeEventArgs)
  
  if (!previewNoticeEventArgs.handled) {
    this.emit('notice', source, targets, noticeText)
  }
}

util.inherits(IrcUser, EventEmitter)

module.exports = IrcUser
