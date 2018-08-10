// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

module.exports = class IrcChannelUser extends EventEmitter {

  constructor (user, modes = null) {
    super()
    this.user = user
    this.modes = modes || []
    this.channel = null
  }

  modeChanged (add, mode) {
    if (add) {
      this.modes.push(mode)
    } else {
      this.modes.splice(this.modes.indexOf(mode))
    }
    this.emit('modes')
  }
}
