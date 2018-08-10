// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcChannelUser = require('./IrcChannelUser.js')
const IrcUtils = require('./IrcUtils.js')
const IrcChannelType = require('./IrcChannelType.js')

/**
 * @class IrcChannel
 * @extends EventEmitter
 *
 * Represents an IRC channel that exists on a specific IrcClient.
 */
module.exports = class IrcChannel extends EventEmitter { 

  /*
   * Constructs a new IrcChannel for a given IrcClient.
   *
   * @access internal
   * @constructor
   * @param {IrcClient} client The IrcClient instance.
   * @param {String} name The channel name.
  */
  constructor (client, name) {
    super()
    this._client = client
    this._name = name
    this._topic = null
    this._channelType = IrcChannelType.unspecified
    this._modes = []
    this._users = []
  }

  // - Public Properties -

  /**
   * Gets the client to which the channel belongs.
   *
   * @public
   * @return {IrcClient} The client to which the channel belongs.
   */
   get client() {
    return this._client
   }

  /**
   * Gets the name of the channel.
   *
   * @public
   * @return {String} Name of the Channel.
   */
  get name() {
    return this._name
  }

  /**
   * Gets a read-only list of the modes the channel currently has.
   *
   * @public
   * @return {Array} List of the modes the channel currently has.
   */
  get modes() {
    return this._modes
  }

  /*
   * Gets a list of all channel users currently in the channel.
   *
   * @public
   * @return {Array} list of all channel users currently in the channel
   */
  get users() {
    return this._users
  } 

  /*
   * Gets the current topic of the channel.
   *
   * @public
   * @return {String} The current topic of the channel.
   */
  get channelType() {
    return this._channelType    
  }

  /*
   * Gets the current topic of the channel.
   *
   * @public
   * @return {String} The current topic of the channel.
   */
  get topic() {
    return this._topic    
  }

  // - Public Methods -

  /**
   * Gets the IrcChannelUser in the channel that corresponds to the specified IrcUser, or null if none is found.
   *
   * @public
   * @param {IrcUser} user The IrcUser for which to look.
   * @return {IrcChannelUser} The corresponding IrcChannelUser.
   */
  getChannelUser (user) {
    return this.users.find(u => u.user == user)
  }

  /**
   * Requests a list of the current modes of the channel, or if modes is specified, the settings for the specified modes.
   *
   * @public
   * @param {Array} [modes] The modes for which to get the current settings, or null for all current channel modes.
   */
  getModes(modes = null) {
    this.client.getChannelModes(this, modes)
  }

  /**
   * Sets the specified modes on the channel.
   * 
   * @public
   * @param {String} modes The mode string that specifies mode changes, which takes the form `( "+" / "-" ) *( mode character )`.
   * @param {Array} modeParameters A array of parameters to the modes, or null for no parameters   
   */
  setModes (modes, modeParameters) {
    this.client.setModes(this, modes, modeParameters)
  }

  /**
   * Leaves the channel, giving the specified comment.
   * 
   * @public
   * @param {String} [comment] The comment to send the server upon leaving the channel, or null for no comment.
   */
  part (comment = null) {
    this.client.sendMessagePart([this.name], comment)
  }

  /**
   * Sends a PRIVMSG to the current channel.
   *
   * @public
   * @param {String} messageText The message to send.
   */
  sendMessage (messageText) {
    this.client.sendMessagePrivateMessage([this.name], messageText)
    this.emit('message', this.client.localUser, messageText)
  }

  /**
   * Sends a NOTICE to the current channel.
   *
   * @public
   * @param {String} noticeText The notice to send.
   */
  sendNotice (noticeText) {
    this.client.sendMessagePrivateMessage([this.name], noticeText)
    this.emit('notice', this.client.localUser, noticeText)
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {String} A string that represents this instance.
   */
  toString () {
    return this.name
  }

  // - Internal Methods -

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
    this._topic = newTopic
    this.emit('topic', user, newTopic)
  }

  modesChanged (source, newModes, newModeParameters) {
    this._modes = IrcUtils.updateModes(this.modes, 
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
    this._type = type
    this.emit('type', type)
  }
}
