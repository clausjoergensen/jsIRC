// Copyright (c) 2018 Claus Jørgensen
'use strict'

var util = require('util')
const events = require('events')
const { EventEmitter } = events
const IrcUtils = require('./IrcUtils.js')
const IrcUser = require('./IrcUser.js')

/**
 * @class IrcLocalUser
 * @extends IrcUser
 *
 * Represents an local IRC user that exists on a specific IrcClient.
 */
module.exports = class IrcLocalUser extends IrcUser {

  constructor (client) {
    super(client, true)
    this._modes = []
  }

  /**
   *
   * @public
   * @return {}
   */
  get isLocalUser() {
    return true
  }

  /**
   *
   * @public
   */
  setNickName(nickName) {
    this.client.setNickName(nickName)
  }

  /**
   *
   * @public
   */
  setAway(text) {
    this.client.setAway(text)
  }

  /**
   *
   * @public
   */
  unsetAway(text) {
    this.client.unsetAway()
  }

  /**
   *
   * @public
   */
  sendMessage (targets, text) {
    // TODO    
  }

  /**
   *
   * @public
   */
  sendNotice (targets, text) {
    // TODO    
  }

  /**
   * Requests a list of the current modes of the user.
   * @public
   */
  getModes() {
    client.getLocalUserModes(this)
  } 

  /**
   *
   * @public
   */
  setModes(newModes) {
    // TODO
  } 


  // - Internal Methods

  modesChanged (newModes) {
    this._modes = IrcUtils.updateModes(this._modes, newModes.split(''))
    this.emit('modes)')
  }
}
