// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

function IrcChannelUser (user, modes = null) {
  this.user = user
  this.modes = modes || []
  this.channel = null
}

IrcChannelUser.prototype.modeChanged = function (add, mode) {
  if (add) {
    this.modes.push(mode)
  } else {
    this.modes.splice(modes.indexOf(mode))
  }
  this.emit('modesChanged')
}

util.inherits(IrcChannelUser, EventEmitter)

module.exports = IrcChannelUser
