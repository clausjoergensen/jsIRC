var util = require('util')
var EventEmitter = require('events').EventEmitter

function IrcServer(hostName) {
    this.hostName = hostName
}

util.inherits(IrcServer, EventEmitter)

module.exports = IrcServer
