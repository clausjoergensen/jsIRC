// Copyright (c) 2018 Claus Jørgensen
'use strict'

function IrcUtils () {}

IrcUtils.updateModes = function (existingModes, newModes, newModeParameters = null, modesWithParameters = null, callback = null) {
  console.log('existingModes', existingModes, 'newModes', newModes)

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
        callback(addMode, mode, modeParameters[i++])
      } else {
        if (addMode) {
          result.push(mode)
        } else {
          result.splice(result.indexOf(mode))
        }
      }
    }
  })

  console.log('updatedModes', result)

  return result
}

module.exports = IrcUtils
