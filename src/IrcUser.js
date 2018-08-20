// Copyright (c) 2018 Claus Jørgensen
// This code is licensed under MIT license (see LICENSE.txt for details)
'use strict'

const events = require('events')
const { EventEmitter } = events

/**
 * Represents an IRC user that exists on a specific {@link IrcClient}.
 *
 * @class
 * @public
 * @extends EventEmitter
 */
class IrcUser extends EventEmitter {
  /**
   * Constructs a new IrcUser for a given {@link IrcClient}.
   *
   * @access protected
   * @hideconstructor
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
  get client () {
    return this._client
  }

  /**
   * Gets wheather the user is a local user.
   *
   * @public
   * @return {boolean} True if the user is local; otherwise false.
   */
  get isLocalUser () {
    return false
  }

  /*
   * Gets the name of the source, as understood by the IRC protocol.
   */
  get name () {
    return this.nickName
  }

  /**
   * Gets whether the user is currently connected to the IRC network.
   * This value may not be always be up-to-date.
   *
   * @public
   */
  get isOnline () {
    return this._isOnline
  }

  /**
   * Sets whether the user is currently connected to the IRC network.
   *
   * @fires IrcUser#isOnline
   */
  set isOnline (value) {
    this._isOnline = value
    this.emit('isOnline')
  }

  /**
   * Gets the current nick name of the user.
   *
   * @public
   */
  get nickName () {
    return this._nickName
  }

  /**
   * Sets the current nick name of the user
   *
   * @fires IrcUser#nickName
   */
  set nickName (value) {
    this._nickName = value
    /**
     * @event IrcUser#nickName
     */
    this.emit('nickName')
  }

  /**
   * Gets the current user name of the user. This value never changes until the user reconnects.
   *
   * @public
   */
  get userName () {
    return this._userName
  }

  /**
   * Sets the current user name of the user
   *
   * @fires IrcUser#userName
   */
  set userName (value) {
    this._userName = value
    /**
     * @event IrcUser#userName
     */
    this.emit('userName')
  }

  /**
   * Gets the host name of the user.
   *
   * @public
   */
  get realName () {
    return this._realName
  }

  /**
   * Sets the host name of the user
   *
   * @fires IrcUser#realName
   */
  set realName (value) {
    this._realName = value
    /**
     * @event IrcUser#realName
     */
    this.emit('realName')
  }

  /**
   * Gets the duration for which the user has been idle. This is set when a Who Is response is received.
   *
   * @public
   */
  get idleDuration () {
    return this._idleDuration
  }

  /**
   * Sets the duration for which the user has been idle.
   *
   * @fires IrcUser#idleDuration
   */
  set idleDuration (value) {
    this._idleDuration = value
    /**
     * @event IrcUser#idleDuration
     */
    this.emit('idleDuration')
  }

  /**
   * Gets whether the user is a server operator.
   *
   * @public
   */
  get isOperator () {
    return this._isOperator
  }

  /**
   * Sets whether the user is a server operator.
   *
   * @fires IrcUser#isOperator
   */
  set isOperator (value) {
    this._isOperator = value
    /**
     * @event IrcUser#isOperator
     */
    this.emit('isOperator')
  }

  /**
   * Gets the name of the server to which the user is connected.
   *
   * @public
   */
  get serverName () {
    return this._serverName
  }

  /**
   * Sets the name of the server to which the user is connected.
   *
   * @fires IrcUser#serverName
   */
  set serverName (value) {
    this._serverName = value
    /**
     * @event IrcUser#serverName
     */
    this.emit('serverName')
  }

  /**
   * Gets arbitrary information about the server to which the user is connected.
   *
   * @public
   */
  get serverInfo () {
    return this._serverInfo
  }

  /**
   * Sets the information about the server to which the user is connected.
   *
   * @fires IrcUser#serverInfo
   */
  set serverInfo (value) {
    this._serverInfo = value
    /**
     * @event IrcUser#serverInfo
     */
    this.emit('serverInfo')
  }

  /**
   * Gets whether the user has been been seen as away. This value is always up-to-date for the local user;
   * though it is only updated for remote users when a private message is sent to them or a Who Is response
   * is received for the user.
   *
   * @public
   */
  get isAway () {
    return this._isAway
  }

  /**
   * Sets wheather the user should be seen as away.
   *
   * @fires IrcUser#isAway
   */
  set isAway (value) {
    this._isAway = value
    /**
     * @event IrcUser#isAway
     */
    this.emit('isAway')
  }

  /**
   * Gets the current away message received when the user was seen as away.
   *
   * @public
   */
  get awayMessage () {
    return this._awayMessage
  }

  /**
   * Sets the users away message.
   *
   * @fires IrcUser#awayMessage
   */
  set awayMessage (value) {
    this._awayMessage = value
    /**
     * @event IrcUser#awayMessage
     */
    this.emit('awayMessage')
  }

  /**
   * Gets the hop count of the user, which is the number of servers between the user and the server on which the
   * client is connected, within the network.
   *
   * @public
   */
  get hopCount () {
    return this._hopCount
  }

  /**
   * Sets the hop count of the user.
   *
   * @fires IrcUser#hopCount
   */
  set hopCount (value) {
    this._hopCount = value
    /**
     * @event IrcUser#hopCount
     */
    this.emit('hopCount')
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
   * @return {IrcChannelUser[]} A array of all IrcChannelUser object that correspond to the IrcUser.
   */
  getChannelUsers () {
    let channelUsers = []
    this.client.channels.forEach(channel => {
      channel.users.forEach(channelUser => {
        if (channelUser.user === this) {
          channelUsers.push(channelUser)
        }
      })
    })
    return channelUsers
  }

  /**
   * Returns a string representation of this instance.
   *
   * @public
   * @return {string} A string that represents this instance.
   */
  toString () {
    return this.nickName
  }

  quit (comment) {
    let allChannelUsers = []
    this.client.channels.forEach(channel => {
      channel.users.forEach(channelUser => {
        if (channelUser.user === this) {
          allChannelUsers.push(channelUser)
        }
      })
    })

    allChannelUsers.forEach(cu => cu.channel.userQuit(cu, comment))

    /**
     * @event IrcUser#quit
     * @param {string} comment
     */
    this.emit('quit', comment)
  }

  joinChannel (channel) {
    /**
     * @event IrcUser#joinedChannel
     * @param {IrcChannel} channel
     */
    this.emit('joinedChannel', channel)
  }

  partChannel (channel) {
    /**
     * @event IrcUser#partedChannel
     * @param {IrcChannel} channel
     */
    this.emit('partedChannel', channel)
  }

  inviteReceived (source, channel) {
    /**
     * @event IrcUser#invite
     * @param {IrcChannel} channel
     * @param {IrcUser} source
     */
    this.emit('invite', channel, source)
  }

  actionReceived (source, targets, messageText) {
    /**
     * @event IrcUser#action
     * @param {IrcUser|IrcChannel} source
     * @param {string} messageText
     */
    this.emit('action', source, messageText)
  }

  messageReceived (source, targets, messageText) {
    let previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
    /**
     * @event IrcUser#previewMessage
     * @property {boolean} handled
     * @property {IrcUser|IrcChannel} source
     * @property {string[]} targets
     * @property {string} messageText
     */
    this.emit('previewMessage', previewMessageEventArgs)

    if (!previewMessageEventArgs.handled) {
      /**
       * @event IrcUser#message
       * @param {IrcUser|IrcChannel} source
       * @param {string} messageText
       */
      this.emit('message', source, targets, messageText)
    }
  }

  noticeReceived (source, targets, noticeText) {
    let previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
    /**
     * @event IrcUser#previewNotice
     * @property {boolean} handled
     * @property {IrcUser|IrcChannel} source
     * @property {string[]} targets
     * @property {string} noticeText
     */
    this.emit('previewNotice', previewNoticeEventArgs)

    if (!previewNoticeEventArgs.handled) {
      /**
       * @event IrcUser#notice
       * @param {IrcUser|IrcChannel} source
       * @param {string} noticeText
       */
      this.emit('notice', source, targets, noticeText)
    }
  }
}

module.exports = IrcUser
