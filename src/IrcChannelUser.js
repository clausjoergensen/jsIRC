// Copyright (c) 2018 Claus Jørgensen
'use strict'

const events = require('events')
const { EventEmitter } = events

/**
 * Represents an IRC user that exists on a specific channel on a specific IrcClient.
 *
 * @class
 * @extends EventEmitter
 */
class IrcChannelUser extends EventEmitter {
  /**
   * Constructs a new IrcChannelUser for a given {@link IrcUser}.
   *
   * @hideconstructor
   * @param {IrcUser} user The IrcUser on the channel.
   * @param {string[]} [modes] Array of channel modes.
  */
  constructor (user, modes = null) {
    super()
    this._user = user
    this._modes = modes || []
    this._channel = null
  }

  /**
   * Gets the IrcUser that is represented by the IrcChannelUser.
   *
   * @public
   * @return {IrcUser} The IrcUser on the channel
   */
  get user () {
    return this._user
  }

  /**
   * Gets the channel.
   *
   * @public
   * @return {IrcUser} The Irc Channel.
   */
  get channel () {
    return this._channel
  }

  /**
   * Sets the Irc Channel.
   *
   * @public
   * @fires IrcChannelUser#channel
   * @param {IrcChannel} The Irc Channel.
   */
  set channel (value) {
    this._channel = value
    /**
     * @event IrcChannelUser#channel
     */
    this.emit('channel')
  }

  /**
   * Gets a read-only list of the channel modes the user currently has.
   *
   * @public
   * @return {string[]} The list of channel modes.
   */
  get modes () {
    return this._modes
  }

  /**
   * Kicks the user from the channel, giving the specified comment.
   *
   * @public
   * @param {string} [comment=null] The comment to give for the kick, or null for none.
   */
  kick (comment = null) {
    this.channel.kick(this.user.nickName, comment)
  }

  /**
   * Gives the user operator privileges in the channel.
   *
   * @public
   */
  op () {
    this.channel.setModes('+o', [this.user.nickName])
  }

  /**
   * Removes operator privileges from the user in the channel.
   *
   * @public
   */
  deop () {
    this.channel.setModes('-o', [this.user.nickName])
  }

  /**
   * Voices the user in the channel.
   *
   * @public
   */
  voice () {
    this.channel.setModes('+v', [this.user.nickName])
  }

  /**
   * Devoices the user in the channel.
   *
   * @public
   */
  devoice () {
    this.channel.setModes('-v', [this.user.nickName])
  }

  /**
   * Bans the user from the channel.
   *
   * @public
   */
  ban () {
    this.channel.setModes('+b', [this.user.nickName])
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {string} A string that represents this instance.
   */
  toString () {
    return `${this._channel.name}/${this._user.nickName}`
  }

  // - Internal Methods

  modeChanged (add, mode) {
    if (add) {
      this._modes.push(mode)
    } else {
      this._modes.splice(this._modes.indexOf(mode))
    }
    /**
     * @event IrcChannelUser#modes
     */
    this.emit('modes')
  }
}

module.exports = IrcChannelUser
