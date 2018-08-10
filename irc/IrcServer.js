// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

/**
 * @class IrcServer
 * @extends EventEmitter
 *
 * Represents an IRC server that exists on a specific IrcClient.
 */
module.exports = class IrcServer extends EventEmitter {

  /*
   * Constructs a new IrcServer for a given hostName.
   *
   * @access internal
   * @constructor
   * @param {String} hostName The server host name.
  */
  constructor (hostName) {
    super()
    this._hostName = hostName
  }

  /**
   * Gets the host name of the server.
   */
  get hostName() {
    return this._hostName
  }

  /**
   * Returns a string representation of this instance.
   *
   * @return {String} A string that represents this instance.
   */
  toString () {
    return this.hostName
  }
}
