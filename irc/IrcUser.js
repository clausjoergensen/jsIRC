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
  constructor (client, isLocalUser = false) {
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
   *
   * @public
   */
  get isOnline() {
    return this._isOnline
  }

  /**
   *
   * @public
   */
  set isOnline(value) {
    this._isOnline = value
  }

  /**
   *
   * @public
   */
  get nickName() {
    return this._nickName
  }

  /**
   *
   * @public
   */
  set nickName(value) {
    this._nickName = value
  }

  /**
   *
   * @public
   */
  get userName() {
    return this._client
  }

  /**
   *
   * @public
   */
  set userName(value) {
    this._userName = value
  }

  /**
   *
   * @public
   */
  get realName() {
    return this._client
  }

  /**
   *
   * @public
   */
  set realName(value) {
    this._realName = value
  }

  /**
   *
   * @public
   */
  get idleDuration() {
    return this._idleDuration
  }

  /**
   *
   * @public
   */
  set idleDuration(value) {
    this._idleDuration = value
  }

  /**
   *
   * @public
   */
  get isOperator() {
    return this._isOperator
  }

  /**
   *
   * @public
   */
  set isOperator(value) {
    this._isOperator = value
  }

  /**
   *
   * @public
   */
  get serverName() {
    return this._serverName
  }

  /**
   *
   * @public
   */
  set serverName(value) {
    this._serverName = value
  }

  /**
   *
   * @public
   */
  get serverInfo() {
    return this._serverInfo
  }

  /**
   *
   * @public
   */
  set serverInfo(value) {
    this._serverInfo = value
  }

  /**
   *
   * @public
   */
  get isAway() {
    return this._isAway
  }

  /**
   *
   * @public
   */
  set isAway(value) {
    this._isAway = value
  }

  /**
   *
   * @public
   */
  get awayMessage() {
    return this._client
  }

  /**
   *
   * @public
   */
  set awayMessage(value) {
    this._awayMessage = value
  }

  /**
   * Sends a Who Is query to server for the user.
   *
   * @public
   */ 
  whoIs () {
    this._client.queryWhoIs(this._nickName)
  }

  /**
   * Sends a Who Was query to server for the user.
   *
   * @public
   * @param {Int} [entriesCount] The maximum number of entries that the server should return. Specify -1 for unlimited.
   */
  whoWas (entriesCount = -1) {
    this._client.queryWhoWas([this._nickName], entriesCount)
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
    this._client.channels.forEach(channel => {
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
