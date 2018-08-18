// Copyright (c) 2018 Claus Jørgensen
'use strict'

const events = require('events')
const { EventEmitter } = events

/**
 * Represents an IRC server that exists on a specific {@link IrcClient}.
 *
 * @class
 * @public
 * @extends EventEmitter
 */
class IrcServer extends EventEmitter {
  /**
   * Constructs a new IrcServer for a given hostName.
   *
   * @hideconstructor
   * @param {string} hostName The server host name.
  */
  constructor (hostName) {
    super()
    this._hostName = hostName
  }

  /**
   * Gets the host name of the server.
   */
  get hostName () {
    return this._hostName
  }

  /*
   * Gets the name of the source, as understood by the IRC protocol.
   */
  get name () {
    return this.hostName
  }

  /**
   * Returns a string representation of this instance.
   *
   * @public
   * @return {string} A string that represents this instance.
   */
  toString () {
    return this.hostName
  }
}

module.exports = IrcServer
