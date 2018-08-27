// Copyright (c) 2018 Claus Jørgensen
// This code is licensed under MIT license (see LICENSE.txt for details)
'use strict'

/**
 * @external Error
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error|Error} 
 */

/**
 * @private
 */
class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this._name = this.constructor.name
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }

  get name () {
    return this._name
  }
}

/**
 * The error that is thrown when null is passed to a function that does not accept it as a valid argument.
 *
 * @package
 * @extends external:Error
 */
class ArgumentNullError extends ExtendableError {
  /**
   * A human-readable description of the error.
   * @hideconstructor
   * @param {String} paramName The name of the parameter that caused the error.
   */
  constructor (paramName) {
    super(`Argument '${paramName}' is null.`)
  }

  /** Error message. */
  get message () {
    return super.message
  }

  /** Error name. */
  get name () {
    return super.name
  }
}

/**
 * The error that is thrown when one of the arguments provided to a function is not valid.
 *
 * @package
 * @extends external:Error
 */
class ArgumentError extends ExtendableError {
  /**
   * A human-readable description of the error.
   * @hideconstructor
   * @param {String} message A human-readable description of the error.
   */
  constructor (message) { // eslint-disable-line no-useless-constructor
    super(message)
  }

  /** Error message. */
  get message () {
    return super.message
  }

  /** Error name. */
  get name () {
    return super.name
  }
}

/**
 * The error that is thrown when a function call is invalid for the object's current state.
 *
 * @package
 * @extends external:Error
 */
class InvalidOperationError extends ExtendableError {
  /**
   * A human-readable description of the error.
   * @hideconstructor
   * @param {String} message A human-readable description of the error.
   */
  constructor (message) { // eslint-disable-line no-useless-constructor
    super(message)
  }

  /** Error message. */
  get message () {
    return super.message
  }

  /** Error name. */
  get name () {
    return super.name
  }
}

/**
 * The error that is thrown when an error is made while using a network protocol.
 *
 * @package
 * @extends external:Error
 */
class ProtocolViolationError extends ExtendableError {
  /**
   * A human-readable description of the error.
   * @hideconstructor
   * @param {String} message A human-readable description of the error.
   */
  constructor (message) { // eslint-disable-line no-useless-constructor
    super(message)
  }

  /** Error message. */
  get message () {
    return super.message
  }

  /** Error name. */
  get name () {
    return super.name
  }
}

module.exports = {
  ArgumentError: ArgumentError,
  ArgumentNullError: ArgumentNullError,
  InvalidOperationError: InvalidOperationError,
  ProtocolViolationError: ProtocolViolationError
}
