// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * Defines the types of channels. Each channel may only be of a single type at any one time.
 *
 * @readonly
 * @enum {number}
 */
var IrcChannelType = {
  /** The channel type is unspecified. */
  unspecified: 0,
  /** The channel is public. The server always lists this channel. */
  public: 1,
  /** The channel is private. The server never lists this channel. */
  private: 2,
  /** The channel is secret. The server never lists this channel and pretends it does not exist when responding to queries. */
  secret: 3
}

module.exports = IrcChannelType
