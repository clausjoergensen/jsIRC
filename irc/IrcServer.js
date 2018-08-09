// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const events = require('events')
const { EventEmitter } = events

function IrcServer (hostName) {
    this.hostName = hostName
}

util.inherits(IrcServer, EventEmitter)

module.exports = IrcServer
