// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcUtils = require('./IrcUtils.js')

var IrcChannelType = {
  Unspecified: 0,
  Public: 1,
  Private: 2,
  Secret: 3
}

function IrcChannel (client, name) {
  this.client = client
  this.name = name
  this.topic = null
  this.channelType = IrcChannelType.Unspecified
  this.modes = []
  this.users = []
}

IrcChannel.prototype.part = function (comment = null) {
  this.client.sendMessagePart([this.name], comment)
}

IrcChannel.prototype.getChannelUser = function (user) {
  return this.users.find(u => u.user == user)
}

IrcChannel.prototype.userJoined = function (channelUser) {
  if (this.users.indexOf(channelUser) != -1) {
    return
  }
  channelUser.channel = this
  this.users.push(channelUser)
  this.emit('userJoinedChannel', channelUser)
}

IrcChannel.prototype.userParted = function (channelUser, comment) {
  var idx = this.users.indexOf(channelUser)
  if (idx != -1) {
    this.users.splice(idx)
  }
  this.emit('userLeftChannel', channelUser, comment)
}

IrcChannel.prototype.userQuit = function (channelUser, comment) {
  var idx = this.users.indexOf(channelUser)
  if (idx != -1) {
    this.users.splice(idx)
  }
  this.emit('userQuit', channelUser, comment)
}

IrcChannel.prototype.userInvited = function (user) {
  this.emit('userInvite', user)
}

IrcChannel.prototype.userKicked = function (channelUser, comment = null) {
  this.emit('userKicked', user)
}

IrcChannel.prototype.userNameReply = function(channelUser) {
  if (this.users.indexOf(channelUser) != -1) {
    return
  }
  channelUser.channel = this
  this.users.push(channelUser)
}

IrcChannel.prototype.topicChanged = function (user, newTopic) {
  this.topic = newTopic
  this.emit('topic', user, newTopic)
}

IrcChannel.prototype.modesChanged = function (source, newModes, newModeParameters) {
  this.modes = IrcUtils.updateModes(this.modes, 
    newModes,
    newModeParameters,
    client.channelUserModes, 
    (add, mode, parameter) => {
      var channelUser = this.users.find(u => u.user.nickName == parameter)
      channelUser.modeChanged(add, mode)
    })
}

IrcChannel.prototype.actionReceived = function (source, targets, messageText) {
  this.emit('action', source, messageText)
}

IrcChannel.prototype.messageReceived = function (source, targets, messageText) {
  var previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
  this.emit('previewMessage', previewMessageEventArgs)
  
  if (!previewMessageEventArgs.handled) {
    this.emit('message', source, messageText)
  }
}

IrcChannel.prototype.noticeReceived = function (source, targets, noticeText) {
  var previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
  this.emit('previewNotice', previewNoticeEventArgs)
  
  if (!previewNoticeEventArgs.handled) {
    this.emit('notice', source, noticeText)
  }
}

IrcChannel.prototype.usersListReceived = function () {
  this.emit('userList')
}

IrcChannel.prototype.typeChanged = function (type) {
  this.type = type
  this.emit('type', type)
}

IrcChannel.prototype.sendMessage = function (messageText) {
  this.client.sendMessagePrivateMessage([this.name], messageText)
  this.emit('message', this.client.localUser, messageText)
}

IrcChannel.prototype.sendNotice = function (noticeText) {
  this.client.sendMessagePrivateMessage([this.name], noticeText)
  this.emit('notice', this.client.localUser, noticeText)
}

util.inherits(IrcChannel, EventEmitter)

module.exports = IrcChannel
