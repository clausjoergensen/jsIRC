// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

/**
 * @class IrcChannelUser
 * @extends EventEmitter
 *
 * Represents an IRC user that exists on a specific channel on a specific IrcClient.
 */
module.exports = class IrcChannelUser extends EventEmitter {

  /*
   * Constructs a new IrcChannelUser for a given IrcUser.
   *
   * @access internal
   * @constructor
   * @param {IrcUser} user The IrcUser on the channel.
   * @param {Array} [modes] Array of channel modes.
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
   */
  get user() {
    return this._user
  }

  /**
   * Gets the channel.
   *
   * @public
   */
  get channel() {
    return this._channel
  }

  /**
   * Sets the channel.
   *
   * @public
   */
  set channel(value) {
    this._channel = value
    this.emit('channel')
  }

  /**
   * Gets a read-only list of the channel modes the user currently has.
   *
   * @public
   */
  get modes() {
    return this._modes
  }

  /**
   * Kicks the user from the channel, giving the specified comment.
   * 
   * @public
   * @param {String} [comment] The comment to give for the kick, or null for none.
   */
  kick (comment = null) {
    channel.kick(user.nickName, comment)
  }

  /**
   * Gives the user operator privileges in the channel.
   *
   * @public
   */
  op () {
    channel.setModes('+0', user.nickName)
  }

  /**
   * Removes operator privileges from the user in the channel.
   *
   * @public
   */
  deop() {
    channel.setModes('-o', user.nickName)
  }

  /**
   * Voices the user in the channel.
   *
   * @public
   */
  voice() {
    channel.setModes('+v', user.nickName)
  }

  /**
   * Devoices the user in the channel
   *
   * @public
   */
  devoice() {
    channel.setModes('-v', user.nickName)
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {String} A string that represents this instance.
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
    this.emit('modes')
  }
}
