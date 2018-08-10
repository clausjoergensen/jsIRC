// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * @class
 *
 * Utilities for IRC
 */
module.exports = class IrcUtils {

  /**
   * Updates collection of modes from specified mode string.
   *
   * The mode string is of form `( "+" | "-" ) ( mode character )+`.
   *
   * @public
   * @static
   * @param {IrcUser} user The IrcUser for which to look.
   * @return {IrcChannelUser} The corresponding IrcChannelUser.
   */
  static updateModes (existingModes, newModes, newModeParameters = null, modesWithParameters = null, callback = null) {
    var result = existingModes
    var i = 0
    var addMode = null
    newModes.forEach(mode => {
      if (mode == '+') {
        addMode = true
      } else if (mode == '-') {
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
