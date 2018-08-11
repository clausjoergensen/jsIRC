// Copyright (c) 2018 Claus Jørgensen
'use strict'

/** 
 * These entry types correspond to the STATS replies described in the RFC for the IRC protocol.
 *
 * @readonly
 * @enum {number}
 */
var IrcServerStatisticalEntry = {
  /** An active connection to the server. */
  connection: 1,
  /** A command supported by the server. */
  command: 2,
  /** A server to which the local server may connect. */
  allowedServerConnect: 3,
  /** A server from which the local server may accept connections. */
  allowedServerAccept: 4,
  /** A client that may connect to the server. */
  allowedClient: 5,
  /** A client that is banned from connecting to the server. */
  bannedClient: 6,
  /** A connection class defined by the server. */
  connectionClass: 7,
  /** The leaf depth of a server in the network. */
  leafDepth: 8,
  /** The uptime of the server. */
  uptime: 9,
  /** An operator on the server. */
  allowedOperator: 10,
  /** A hub server within the network. */
  hubServer: 11
}

module.exports = IrcServerStatisticalEntry
