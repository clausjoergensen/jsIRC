// Copyright (c) 2018 Claus Jørgensen
// This code is licensed under MIT license (see LICENSE.txt for details)
'use strict'

const events = require('events')
const { EventEmitter } = events
const IrcUtils = require('./IrcUtils.js')
const IrcChannelType = require('./IrcChannelType.js')
const { ArgumentNullError } = require('./Errors.js')

/**
 * Represents an IRC channel that exists on a specific IrcClient.
 *
 * @class
 * @package
 * @extends EventEmitter
 */
class IrcChannel extends EventEmitter {
  /**
   * Constructs a new IrcChannel for a given {@link IrcClient}.
   *
   * @private
   * @hideconstructor
   * @throws {ArgumentNullError} if a parameter is null.
   * @param {IrcClient} client The IrcClient instance.
   * @param {string} name The channel name.
  */
  constructor (client, name) {
    super()

    if (!client) {
      throw new ArgumentNullError('client')
    }

    if (!name) {
      throw new ArgumentNullError('name')
    }

    this._client = client
    this._name = name
    this._topic = null
    this._channelType = IrcChannelType.unspecified
    this._modes = new Set([])
    this._users = []
  }

  /**
   * Gets the client to which the channel belongs.
   *
   * @public
   * @return {IrcClient} The IRC client.
   */
  get client () {
    return this._client
  }

  /**
   * Gets the name of the channel.
   *
   * @public
   * @return {string} Name of the Channel.
   */
  get name () {
    return this._name
  }

  /**
   * Gets a read-only list of the modes the channel currently has.
   *
   * @public
   * @return {string[]} List of the modes the channel currently has.
   */
  get modes () {
    return Array.from(this._modes)
  }

  /*
   * Gets a list of all channel users currently in the channel.
   *
   * @public
   * @return {IrcChannelUser[]} list of all channel users currently in the channel
   */
  get users () {
    return this._users
  }

  /*
   * Gets the current topic of the channel.
   *
   * @public
   * @return {string} The current topic of the channel.
   */
  get channelType () {
    return this._channelType
  }

  /*
   * Gets the current topic of the channel.
   *
   * @public
   * @return {string} The current topic of the channel.
   */
  get topic () {
    return this._topic
  }

  /**
   * Gets the IrcChannelUser in the channel that corresponds to the specified IrcUser, or null if none is found.
   *
   * @public
   * @throws {ArgumentNullError} if a parameter is null.
   * @param {IrcUser} user The IrcUser for which to look.
   * @return {IrcChannelUser} The corresponding IrcChannelUser.
   */
  getChannelUser (user) {
    if (!user) {
      throw new ArgumentNullError('user')
    }
    return this.users.find(u => u.user === user)
  }

  /**
   * Requests a list of the current modes of the channel, or if modes is specified, the settings for the specified modes.
   *
   * @public
   * @param {string[]} [modes=null] The modes for which to get the current settings,
   * or null for all current channel modes.
   */
  getModes (modes = null) {
    this.client.getChannelModes(this, modes)
  }

  /**
   * Sets the specified modes on the channel.
   *
   * @public
   * @param {string} newModes The mode string that specifies mode changes,
   *  which takes the form <code>( "+" / "-" ) *( mode character )</code>
   * @param {string[]} [modeParameters=null] A array of parameters to the modes, or null for no parameters
   */
  setModes (newModes, modeParameters = null) {
    if (!newModes) {
      throw new ArgumentNullError('newModes')
    }

    this.client.setChannelModes(this, newModes, modeParameters)
  }

  /**
   * Leaves the channel, giving the specified comment.
   *
   * @public
   * @param {string} [comment=null] The comment to send the server upon leaving the channel, or null for no comment.
   */
  part (comment = null) {
    this.client.leaveChannel(this.name, comment)
  }

  /**
   * Kicks a user from the channel, optionally with a reason
   *
   * @public
   * @param {string} userNickName The User Nick Name.
   * @param {string} [reason=null] The kick reason.
   */
  kick (userNickName, reason = null) {
    this.client.kick(this, [userNickName], reason)
  }

  /**
   * Invites a user to the channel.
   *
   * @public
   * @param {string} userNickName The User Nick Name.
   */
  invite (userNickName) {
    this.client.invite(this, userNickName)
  }

  /**
   * Sets the channel topic
   *
   * @public
   * @param {string} [topic] The new channel topic; null to refresh the topic.
   */
  setTopic (topic = null) {
    this.client.setTopic(this, topic)
  }

  /**
   * Bans a hostMask from the channel.
   *
   * @public
   */
  ban (hostMask) {
    this.setModes('+b', [hostMask])
  }

  /**
   * Unbans a hostMask from the channel.
   *
   * @public
   */
  unban (hostMask) {
    this.setModes('-b', [hostMask])
  }

  /**
   * Sends a PRIVMSG to the current channel.
   *
   * @public
   * @fires IrcChannel#message
   * @param {string} messageText The message to send.
   */
  sendMessage (messageText) {
    this.client.sendMessage([this.name], messageText)
    /**
     * @event IrcChannel#message
     * @param {IrcUser} user
     * @param {string} messageText
     */
    this.emit('message', this.client.localUser, messageText)
  }

  /**
   * Sends a NOTICE to the current channel.
   *
   * @public
   * @fires IrcChannel#notice
   * @param {string} noticeText The notice to send.
   */
  sendNotice (noticeText) {
    this.client.sendNotice([this.name], noticeText)
    /**
     * @event IrcChannel#notice
     * @param {IrcUser} user
     * @param {string} noticeText
     */
    this.emit('notice', this.client.localUser, noticeText)
  }

  /**
   * Returns a string representation of this instance.
   *
   * @public
   * @return {string} A string that represents this instance.
   */
  toString () {
    return this.name
  }

  userJoined (channelUser) {
    let existingChannelUser = this._users.find(
      cu => cu.user.nickName.localeCompare(channelUser.user.nickName, undefined, { sensitivity: 'base' }) === 0)
    
    if (existingChannelUser) {
      return
    }
    
    channelUser.channel = this
    this._users.push(channelUser)

    /**
     * @event IrcChannel#userJoinedChannel
     * @param {IrcChannelUser} channelUser
     */
    this.emit('userJoinedChannel', channelUser)
  }

  userParted (channelUser, comment) {
    let existingChannelUser = this._users.find(
      cu => cu.user.nickName.localeCompare(channelUser.user.nickName, undefined, { sensitivity: 'base' }) === 0)

    if (existingChannelUser) {
      this._users.splice(this._users.indexOf(existingChannelUser))      
    }

    /**
     * @event IrcChannel#userLeftChannel
     * @param {IrcChannelUser} channelUser
     */
    this.emit('userLeftChannel', existingChannelUser, comment)
  }

  userQuit (channelUser, comment) {
    let existingChannelUser = this._users.find(
      cu => cu.user.nickName.localeCompare(channelUser.user.nickName, undefined, { sensitivity: 'base' }) === 0)

    if (existingChannelUser) {
      this._users.splice(this._users.indexOf(existingChannelUser))
    }

    /**
     * @event IrcChannel#userQuit
     * @param {IrcChannelUser} channelUser
     * @param {string} comment
     */
    this.emit('userQuit', existingChannelUser, comment)
  }

  userInvited (user) {
    /**
     * @event IrcChannel#userInvite
     * @param {IrcUser} user
     */
    this.emit('userInvite', user)
  }

  userKicked (source, channelUser, comment = null) {
    let existingChannelUser = this._users.find(
      cu => cu.user.nickName.localeCompare(channelUser.user.nickName, undefined, { sensitivity: 'base' }) === 0)

    if (existingChannelUser) {
      this._users.splice(this._users.indexOf(existingChannelUser))
    }

    /**
     * @event IrcChannel#userKicked
     * @param {IrcChannelUser} channelUser
     * @param {string} comment
     */
    this.emit('userKicked', source, existingChannelUser, comment)
  }

  userNameReply (channelUser) {
    let existingChannelUser = this._users.find(
      cu => cu.user.nickName.localeCompare(channelUser.user.nickName, undefined, { sensitivity: 'base' }) === 0)

    if (existingChannelUser) {
      return
    }

    channelUser.channel = this
    this._users.push(channelUser)
  }

  topicChanged (user, newTopic) {
    this._topic = newTopic
    /**
     * @event IrcChannel#topic
     * @param {IrcUser} user
     * @param {string} newTopic
     */
    this.emit('topic', user, newTopic)
  }

  modesChanged (source, newModes, newModeParameters) {
    this._modes = IrcUtils.updateModes(this._modes,
      newModes,
      newModeParameters,
      this.client.channelUserModes,
      (add, mode, parameter) => {
        let channelUser = this.users.find(
          u => u.user.nickName.localeCompare(parameter, undefined, { sensitivity: 'base' }) === 0)
        if (channelUser) {
          channelUser.modeChanged(add, mode)          
        }
      })

    /**
     * @event IrcChannel#modes
     * @param {IrcUser} source
     * @param {string[]} modes
     * @param {string[]} parameters
     */
    this.emit('modes', source, newModes, newModeParameters)
  }

  actionReceived (source, targets, messageText) {
    /**
     * @event IrcChannel#action
     * @param {IrcUser|IrcChannel} source
     * @param {string} messageText
     */
    this.emit('action', source, messageText)
  }

  messageReceived (source, targets, messageText) {
    let previewMessageEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': messageText }
    /**
     * @event IrcChannel#previewMessage
     * @property {boolean} handled
     * @property {IrcUser|IrcChannel} source
     * @property {string[]} targets
     * @property {string} messageText
     */
    this.emit('previewMessage', previewMessageEventArgs)

    if (!previewMessageEventArgs.handled) {
    /**
     * @event IrcChannel#message
     * @param {IrcUser|IrcChannel} source
     * @param {string} messageText
     */
      this.emit('message', source, messageText)
    }
  }

  noticeReceived (source, targets, noticeText) {
    let previewNoticeEventArgs = { 'handled': false, 'source': source, 'targets': targets, 'text': noticeText }
    /**
     * @event IrcChannel#previewNotice
     * @property {boolean} handled
     * @property {IrcUser|IrcChannel} source
     * @property {string[]} targets
     * @property {string} noticeText
     */
    this.emit('previewNotice', previewNoticeEventArgs)

    if (!previewNoticeEventArgs.handled) {
      /**
       * @event IrcChannel#notice
       * @param {IrcUser|IrcChannel} source
       * @param {string} noticeText
       */
      this.emit('notice', source, noticeText)
    }
  }

  usersListReceived () {
    /**
     * @event IrcChannel#notice
     */
    this.emit('userList')
  }

  typeChanged (type) {
    this._type = type
    /**
     * @event IrcChannel#notice
     * @param {IrcChannelType} type
     */
    this.emit('type', type)
  }
}

module.exports = IrcChannel
