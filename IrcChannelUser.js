var util = require('util')
var EventEmitter = require('events').EventEmitter

function IrcChannelUser(user, modes = []) {
    this.user = user
    this.modes = []
    this.channel = null
}

util.inherits(IrcChannelUser, EventEmitter)

module.exports = IrcChannelUser
