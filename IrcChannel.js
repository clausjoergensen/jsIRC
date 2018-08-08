// Copyright (c) 2018 Claus Jørgensen

var IrcChannelUser = require('./IrcChannelUser.js')

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

IrcChannel.prototype.getChannelUser = function (user) {
  return this.users.find(u => u == user)
}

IrcChannel.prototype.userJoined = function (channelUser) {
  channelUser.channel = this

  this.users.push(user)

  this.emit('userJoinedChannel', channelUser)
}

IrcChannel.prototype.userParted = function (channelUser, comment) {
  var idx = this.users.indexOf(channelUser)
  if (idx != -1) {
    this.users.splice(idx)
  }

  this.emit('userLeftChannel', channelUser, comment)
}

IrcChannel.prototype.userQuit = function (channnelUser, comment) {
  var idx = this.users.indexOf(channelUser)
  if (idx != -1) {
    this.users.splice(idx)
  }

  this.emit('userQuit', channelUser, comment)
}

IrcChannel.prototype.userInvited = function (user) {
  this.emit('invite', user)
}

IrcChannel.prototype.userKicked = function (channelUser, comment = null) {
  this.emit('kick', user)
}

IrcChannel.prototype.topicChanged = function (user, newTopic) {
  this.topic = newTopic
  this.emit('topic', user)
}

IrcChannel.prototype.messageReceived = function (source, targets, messageText) {
  this.emit('message', messageText, source)
}

IrcChannel.prototype.noticeReceived = function (source, targets, noticeText) {
  this.emit('notice', messageText, source)
}

IrcChannel.prototype.usersListReceived = function () {
  this.emit('usersListReceived')
}

module.exports = IrcChannel
