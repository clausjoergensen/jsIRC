// Copyright (c) 2018 Claus Jørgensen
'use strict'

const util = require('util')
const EventEmitter = require('events').EventEmitter

function IrcChannelUser(user, modes = []) {
    this.user = user
    this.modes = []
    this.channel = null
}

util.inherits(IrcChannelUser, EventEmitter)

module.exports = IrcChannelUser
