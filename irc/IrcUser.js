// Copyright (c) 2018 Claus Jørgensen
'use strict'

var util = require('util')
const events = require('events')
const { EventEmitter } = events

/**
 * @class IrcUser
 * @extends EventEmitter
 *
 * Represents an IRC user that exists on a specific IrcClient.
 */
module.exports = class IrcUser extends EventEmitter {

  /*
   * Constructs a new IrcUser for a given IrcClient.
   *
   * @access internal
   * @constructor
   * @param {IrcClient} client The IrcClient instance.
  */
  constructor (client) {
    super()
    this._client = client
    this._isOnline = false
    this._nickName = null
    this._userName = null
    this._realName = null
    this._idleDuration = null
    this._isOperator = false
    this._serverName = null
    this._serverInfo = null
    this._isAway = false
    this._awayMessage = null
    this._hopCount = 0
  }

  /**
   * Gets the client on which the user exists.
   *
   * @public
   */
  get client() {
    return this._client
  }

  /**
   * Gets a read-only collection of the modes the user currently has.
   *
   * @public
   */
  get isLocalUser() {
    return true
  }

  /*
   * Gets the name of the source, as understood by the IRC protocol.
   */
  get name() {
    return this.nickName
  } 

  /**
   * Gets whether the user is currently connected to the IRC network. 
   * This value may not be always be up-to-date.
   * 
   * @public
   */
  get isOnline() {
    return this._isOnline
  }

  set isOnline(value) {
    this._isOnline = value
  }

  /**
   * Gets the current nick name of the user.
   *
   * @public
   */
  get nickName() {
    return this._nickName
  }

  set nickName(value) {
    this._nickName = value
  }

  /**
   * Gets the current user name of the user. This value never changes until the user reconnects.
   *
   * @public
   */
  get userName() {
    return this._userName
  }

  set userName(value) {
    this._userName = value
  }

  /**
   * Gets the real name of the user. This value never changes until the user reconnects.
   *
   * @public
   */
  get realName() {
    return this._realName
  }

  set realName(value) {
    this._realName = value
  }

  /**
   * Gets the host name of the user.
   *
   * @public
   */
  get realName() {
    return this._realName
  }

  set realName(value) {
    this._realName = value
  }

  /**
   * Gets the duration for which the user has been idle. This is set when a Who Is response is received.
   *
   * @public
   */
  get idleDuration() {
    return this._idleDuration
  }

  set idleDuration(value) {
    this._idleDuration = value
  }

  /**
   * Gets whether the user is a server operator.
   *
   * @public
   */
  get isOperator() {
    return this._isOperator
  }

  set isOperator(value) {
    this._isOperator = value
  }

  /**
   * Gets the name of the server to which the user is connected.
   *
   * @public
   */
  get serverName() {
    return this._serverName
  }

  set serverName(value) {
    this._serverName = value
  }

  /**
   * Gets arbitrary information about the server to which the user is connected.
   *
   * @public
   */
  get serverInfo() {
    return this._serverInfo
  }

  set serverInfo(value) {
    this._serverInfo = value
  }

  /**
   * Gets whether the user has been been seen as away. This value is always up-to-date for the local user;
   * though it is only updated for remote users when a private message is sent to them or a Who Is response
   * is received for the user.
   *
   * @public
   */
  get isAway() {
    return this._isAway
  }

  set isAway(value) {
    this._isAway = value
  }

  /**
   * Gets the current away message received when the user was seen as away.
   *
   * @public
   */
  get awayMessage() {
    return this._awayMessage
  }

  set awayMessage(value) {
    this._awayMessage = value
  }

   /**
   * Gets the hop count of the user, which is the number of servers between the user and the server on which the
   * client is connected, within the network.
   *
   * @public
   */
  get hopCount() {
    return this._hopCount
  }

  set hopCount(value) {
    this._hopCount = value
  }

  /**
   * Sends a Who Is query to server for the user.
   *
   * @public
   */ 
  whoIs () {
    this.client.queryWhoIs(this._nickName)
  }

  /**
   * Sends a Who Was query to server for the user.
   *
   * @public
   * @param {Int} [entriesCount] The maximum number of entries that the server should return. Specify -1 for unlimited.
   */
  whoWas (entriesCount = -1) {
    this.client.queryWhoWas([this._nickName], entriesCount)
  }

  /**
   * Gets a array of all channel users that correspond to the user.
   * Each IrcChannelUser represents a channel of which the user is currently a member.
   *
   * @public
   * @return {Array} A array of all IrcChannelUser object that correspond to the IrcUser.
   */
  getChannelUsers () {
    var channelUsers = []
    this.client.channels.forEach(channel => {
      channel.users.forEach(channelUser => {
        if (channelUser.user == this) {
          channelUsers.push(channelUser)
        }
      })
    })
    return channelUsers
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {String} A string that represents this instance.
   */
  toString () {
    return this.nickName
  }

  // - Internal Methods

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
