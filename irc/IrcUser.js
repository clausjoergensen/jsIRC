// Copyright (c) 2018 Claus Jørgensen
'use strict'

var util = require('util')
var EventEmitter = require('events').EventEmitter

function IrcUser(client) {
    this.client = client
    this.isOnline = false
    this.nickName = null
    this.userName = null
    this.realName = null
    this.userModes = []
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
      var channelUser = channel.users[u]
      if (channelUser.user == this) {
        allChannelUsers.push(channelUser)
      }
    })
  })

  allChannelUsers.forEach(u => u.userQuit(channelUser, comment))

  this.emit('quit', comment)
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

IrcUser.prototype.messageReceived = function (source, targets, messageText) {
  this.emit('message', messageText, source)
}

IrcUser.prototype.noticeReceived = function (source, targets, noticeText) {
  this.emit('notice', noticeText, source)
}

util.inherits(IrcUser, EventEmitter)

module.exports = IrcUser
