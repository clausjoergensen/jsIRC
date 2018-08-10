// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcUtils = require('./IrcUtils.js')

module.exports = class IrcChannel extends EventEmitter { 

  constructor (client, name) {
    super()
    this.client = client
    this.name = name
    this.topic = null
    this.channelType = IrcChannelType.Unspecified
    this.modes = []
    this.users = []
  }

  part (comment = null) {
    this.client.sendMessagePart([this.name], comment)
  }

  getChannelUser (user) {
    return this.users.find(u => u.user == user)
  }

  userJoined (channelUser) {
    if (this.users.indexOf(channelUser) != -1) {
      return
    }
    channelUser.channel = this
    this.users.push(channelUser)
    this.emit('userJoinedChannel', channelUser)
  }

  userParted (channelUser, comment) {
    var idx = this.users.indexOf(channelUser)
    if (idx != -1) {
      this.users.splice(idx)
    }
    this.emit('userLeftChannel', channelUser, comment)
  }

  userQuit (channelUser, comment) {
    var idx = this.users.indexOf(channelUser)
    if (idx != -1) {
      this.users.splice(idx)
    }
    this.emit('userQuit', channelUser, comment)
  }

  userInvited (user) {
    this.emit('userInvite', user)
  }

  userKicked (channelUser, comment = null) {
    var idx = this.users.indexOf(channelUser)
    if (idx != -1) {
      this.users.splice(idx)
    }  
    this.emit('userKicked', user)
  }

  userNameReply(channelUser) {
    if (this.users.indexOf(channelUser) != -1) {
      return
    }
    channelUser.channel = this
    this.users.push(channelUser)
  }

  topicChanged (user, newTopic) {
    this.topic = newTopic
    this.emit('topic', user, newTopic)
  }

  modesChanged (source, newModes, newModeParameters) {
    this.modes = IrcUtils.updateModes(this.modes, 
      newModes,
      newModeParameters,
      client.channelUserModes, 
      (add, mode, parameter) => {
        var channelUser = this.users.find(u => u.user.nickName == parameter)
        channelUser.modeChanged(add, mode)
      })
  }

  actionReceived (source, targets, messageText) {
    this.emit('action', source, messageText)
  }

  messageReceived (source, targets, messageText) {
    var previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
    this.emit('previewMessage', previewMessageEventArgs)
    
    if (!previewMessageEventArgs.handled) {
      this.emit('message', source, messageText)
    }
  }

  noticeReceived (source, targets, noticeText) {
    var previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
    this.emit('previewNotice', previewNoticeEventArgs)
    
    if (!previewNoticeEventArgs.handled) {
      this.emit('notice', source, noticeText)
    }
  }

  usersListReceived () {
    this.emit('userList')
  }

  typeChanged (type) {
    this.type = type
    this.emit('type', type)
  }

  sendMessage (messageText) {
    this.client.sendMessagePrivateMessage([this.name], messageText)
    this.emit('message', this.client.localUser, messageText)
  }

  sendNotice (noticeText) {
    this.client.sendMessagePrivateMessage([this.name], noticeText)
    this.emit('notice', this.client.localUser, noticeText)
  }
}

var IrcChannelType = {
  Unspecified: 0,
  Public: 1,
  Private: 2,
  Secret: 3
}
