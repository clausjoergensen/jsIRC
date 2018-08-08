// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const EventEmitter = require('events').EventEmitter

function IrcServer (hostName) {
    this.hostName = hostName
}

util.inherits(IrcServer, EventEmitter)

module.exports = IrcServer
