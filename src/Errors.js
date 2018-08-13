// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * @private
 */
class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }
}

/**
 * @private
 */
class ArgumentNullError extends ExtendableError {
  constructor (arg) {
    super(`Argument '${arg}' is null.`)
  }
}

/**
 * @private
 */
class ArgumentError extends ExtendableError {
  constructor (message) {
    super(message)
  }
} 

/**
 * @private
 */
class InvalidOperationError extends ExtendableError {
 constructor (message) {
    super(message)
  } 
} 

/**
 * @private
 */
class ProtocolViolationError extends ExtendableError {
 constructor (message) {
    super(message)
  } 
} 

module.exports = {
  ArgumentNullError: ArgumentNullError
}
