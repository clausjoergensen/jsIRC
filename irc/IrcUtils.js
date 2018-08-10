// Copyright (c) 2018 Claus Jørgensen
'use strict'

module.exports = class IrcUtils {

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
