// Copyright (c) 2018 Claus Jørgensen
'use strict'

const Long = require('long')

/**
 * Represents a flood protector that throttles data sent by the client according to the standard rules implemented
 *
 * @public
 * @class
 */
class IrcFloodPreventer {
  /**
   * Initializes a new instance of the IrcStandardFloodPreventer class.
   *
   * @param {number} maxMessageBurst The maximum number of messages that can be sent in a burst.
   * @param {number} counterPeriod The number of milliseconds between each decrement of the message counter.
   */
  constructor (maxMessageBurst, counterPeriod) {
    this._lastCounterDecrementTime = Long.fromInt(0)
    this._messageCounter = 0
    this._maxMessageBurst = maxMessageBurst
    this._counterPeriod = counterPeriod
  }

  /**
   * Gets the maximum message number of messages that can be sent in a burst.
   *
   * @public
   * @return {number} The maximum message number of messages that can be sent in a burst.
   */
  get maxMessageBurst () {
    return this._maxMessageBurst
  }

  /**
   * Gets the number of milliseconds between each decrement of the message counter.
   *
   * @public
   * @return {number} The period of the counter, in milliseconds.
   */
  get counterPeriod () {
    return this._counterPeriod
  }

  /**
   * Gets the time delay before which the client may currently send the next message.
   *
   * @public
   * @return {number} The time delay before the next message may be sent, in milliseconds.
   */
  getSendDelay () {
    // Subtract however many counter periods have elapsed since last decrement of counter.
    let now = new Date()
    let currentTime = now.getTime()
    let elapsedMilliseconds = currentTime - this._lastCounterDecrementTime
    let tempMessageCounter = Math.max(0, this._messageCounter - (elapsedMilliseconds / this.counterPeriod))

    this._messageCounter = tempMessageCounter > 0x7FFFFFFF ? 0x7FFFFFFF : tempMessageCounter

    // Update time of last decrement of counter to theoretical time of decrement.
    this._lastCounterDecrementTime = currentTime - elapsedMilliseconds % this.counterPeriod

    // Return time until next message can be sent.
    return Math.max((this._messageCounter - this.maxMessageBurst) * this.counterPeriod - elapsedMilliseconds, 0)
  }

  /**
   * Notifies the flood preventer that a message has just been send by the client.
   *
   * @public
   */
  messageSent () {
    this._messageCounter++
  }
}

module.exports = IrcFloodPreventer
