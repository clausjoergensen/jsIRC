var IrcClient = require('./IrcClient.js')

var registrationInfo = {
  'nickName': 'Rincewind',
  'password': null,
  'userName': 'Rincewind',
  'realName': "Rincewind the Wizzard",
  'userModes': []
}

var client = new IrcClient()

client.on('registered', function(targets, noticeText) {
  //console.log('Registration Completed')
})

client.on('motd', function(motd) {
  //console.log(motd)
})

client.on('notice', function(targets, noticeText) {
  //console.log('NOTICE: ' + noticeText)
})

client.on('clientInfo', function() {
  //console.log('Server Name: ' + client.serverName)
  //console.log('Server Version: ' + client.serverVersion)
  //console.log('Server Available User Modes: ' + client.serverAvailableUserModes)
  //console.log('Server Available Channel Modes: ' + client.serverAvailableChannelModes)
})

client.connect('127.0.0.1', 6667, registrationInfo)
