// Copyright (c) 2018 Claus Jørgensen
// This code is licensed under MIT license (see LICENSE.txt for details)
'use strict'

const IrcUtils = require('./IrcUtils.js')
const IrcUser = require('./IrcUser.js')
const { ArgumentNullError } = require('./Errors.js')

/**
 * Represents an local IRC user that exists on a specific {@link IrcClient}.
 *
 * @class
 * @package
 * @extends IrcUser
 */
class IrcLocalUser extends IrcUser {
  /**
   * Initializes a new instance of the IrcLocalUser class.
   *
   * @private
   * @hideconstructor
   * @param {IrcClient} client The IrcClient instance.
  */
  constructor (client) {
    super(client)

    if (!client) {
      throw new ArgumentNullError('client')
    }

    this._modes = new Set([])
  }

  /**
   * Gets wheather the user is a local user.
   *
   * @public
   * @return {boolean} True if the user is local; otherwise false.
   */
  get isLocalUser () {
    return true
  }

  /**
   * Gets a read-only collection of the modes the user currently has.
   *
   * @public
   */
  get modes () {
    return Array.from(this._modes)
  }

  /**
   * Sets the nick name of the local user to the specified text.
   *
   * @public
   * @param {string} nickName The new nick name of the local user.
   */
  setNickName (nickName) {
    this.client.setNickName(nickName)
  }

  /**
   * Sets the local user as away, giving the specified message.
   *
   * @public
   * @param {string} text The text of the response sent to a user when they try to message you while away.
   */
  setAway (text) {
    this.client.setAway(text)
  }

  /**
   * Sets the local user as here (no longer away).
   *
   * @public
   */
  unsetAway () {
    this.client.unsetAway()
  }

  /**
   * Sends a message to the specified target.
   *
   * @public
   * @param {string[]} targets A array of the names of targets to which to send the notice.
   * @param {string} text The text of the notice to send.
   */
  sendMessage (targets, text) {
    this.client.sendMessage(targets, text)
  }

  /**
   * Sends a notice to the specified target.

   * @public
   * @param {string[]} targets A array of the names of targets to which to send the notice.
   * @param {string} text The text of the notice to send.
   */
  sendNotice (targets, text) {
    this.client.sendNotice(targets, text)
  }

  /**
   * Requests a list of the current modes of the user.
   *
   * @public
   */
  getModes () {
    this.client.getLocalUserModes(this)
  }

  /**
   * Sets the specified modes on the local user.
   *
   * @public
   * @param {string} modes The mode string that specifies mode changes,
   * which takes the form <code>( "+" / "-" ) *( mode character )</code>
   */
  setModes (newModes) {
    this.client.setUserModes(this, newModes)
  }

  modesChanged (newModes) {
    this._modes = IrcUtils.updateModes(this._modes, newModes.split(''))
    /**
     * @event IrcLocalUser#modes
     */
    this.emit('modes', newModes)
  }

  kicked (source, channel, comment) {
   /**
     * @event IrcLocalUser#kicked
     */
    this.emit('kicked', source, channel, comment) 
  }
}

module.exports = IrcLocalUser
