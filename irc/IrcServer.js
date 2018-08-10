// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

module.exports = class IrcServer extends EventEmitter {

  constructor (hostName) {
    super()
    this.hostName = hostName
  }
}
