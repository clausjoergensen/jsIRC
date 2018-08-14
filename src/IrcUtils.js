// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { ArgumentNullError } = require('./Errors.js')

/**
 * @callback UpdateModes
 * @param {boolean} add True if adding the mode; otherwise false.
 * @param {string} mode The mode to add/remove.
 * @param {string} parameter The mode parameter.
 */

/**
 * Utilities for IRC
 *
 * @class
 * @static
 * @package
 * @hideconstructor
 */
class IrcUtils {
  /**
   * Updates collection of modes from specified mode string.
   *
   * The mode string is of form <code>( "+" | "-" ) ( mode character )+</code>
   *
   * @package
   * @static
   * @param {string[]} existingModes
   * @param {string[]} newModes
   * @param {string[]} [newModeParameters]
   * @param {string[]} [modesWithParameters]
   * @param {UpdateModes} [callback]
   * @return {IrcChannelUser} The corresponding IrcChannelUser.
   */
  static updateModes (existingModes, newModes, newModeParameters = null, modesWithParameters = null, callback = null) {
    if (!existingModes) {
      throw new ArgumentNullError('existingModes')
    }

    if (!newModes) {
      throw new ArgumentNullError('existingModes')
    }

    if (newModeParameters) {
      if (!modesWithParameters) {
        throw new ArgumentNullError('modesWithParameters')
      }
      if (!callback) {
        throw new ArgumentNullError('callback')
      }
    }

    let result = existingModes
    let i = 0
    let addMode = null
    newModes.forEach(mode => {
      if (mode === '+') {
        addMode = true
      } else if (mode === '-') {
        addMode = false
      } else if (addMode != null) {
        if (newModeParameters != null && modesWithParameters.includes(mode)) {
          callback(addMode, mode, newModeParameters[i++])
        } else {
          if (addMode) {
            result.push(mode)
          } else {
            result.splice(result.indexOf(mode))
          }
        }
      }
    })
    return result
  }
}

module.exports = IrcUtils
