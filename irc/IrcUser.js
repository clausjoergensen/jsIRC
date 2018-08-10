// Copyright (c) 2018 Claus Jørgensen
'use strict'

var util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcUtils = require('./IrcUtils.js')

module.exports = class IrcUser extends EventEmitter {

  constructor (client) {
    super()
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

  quit (comment) {
    var allChannelUsers = []
    client.channels.forEach(channel => {
      channel.users.forEach(channelUser => {
        if (channelUser.user == this) {
          allChannelUsers.push(channelUser)
        }
      })
    })

    allChannelUsers.forEach(cu => cu.channel.userQuit(cu, comment))

    this.emit('quit', comment)
  }

  modesChanged (newModes) {
    this.modes = IrcUtils.updateModes(this.modes, newModes.split(''))
    this.emit('modes)')
  }

  joinChannel (channel) {
    this.emit('joinedChannel', channel) 
  }

  partChannel (channel) {
   this.emit('partedChannel', channel)  
  }

  inviteReceived (source, channel) {
    this.emit('invite', channel, source)
  }

  actionReceived (source, targets, messageText) {
    this.emit('action', source, messageText)
  }

  messageReceived (source, targets, messageText) {
    var previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
    this.emit('previewMessage', previewMessageEventArgs)
    
    if (!previewMessageEventArgs.handled) {
      this.emit('message', source, targets, messageText)
    }
  }

  noticeReceived (source, targets, noticeText) {
    var previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
    this.emit('previewNotice', previewNoticeEventArgs)
    
    if (!previewNoticeEventArgs.handled) {
      this.emit('notice', source, targets, noticeText)
    }
  }
}
