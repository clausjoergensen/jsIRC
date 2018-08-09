// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu } = remote

const IrcClient = require('./irc/IrcClient.js')
const CtcpClient = require('./irc/CtcpClient.js')
const strftime = require('./irc/strftime.js')

const packageInfo = require('./package.json')

var client = new IrcClient()
client.loggingEnabled = true

var ctcpClient = new CtcpClient(client)
ctcpClient.clientName = packageInfo.name
ctcpClient.clientVersion = packageInfo.version

function addParagraph (text, source = null) {
  var senderName = ''
  
  if (source != null) {
    if (source.nickName != null) {
      senderName = `<${source.nickName}>`
    } else if (source.hostName != null) {
      senderName = source.hostName
    }
  }

  var now = new Date()
  var formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`
  
  var p = document.createElement('p')
  p.classList.add('message')
  p.innerText = formattedText
  
  const messages = document.getElementById('messages')
  messages.appendChild(p)
  messages.scrollTop = messages.scrollHeight
}

function addNetwork (serverName) {
  var networkContainer = document.createElement('div')
  networkContainer.classList.add('network')
  networkContainer.serverName = serverName
  networkContainer.id = 'network-' + serverName

  var title = document.createElement('div')
  title.classList.add('network-title')
  title.innerText = serverName

  var channelListContainer = document.createElement('div')
  channelListContainer.classList.add('channel-list')

  networkContainer.appendChild(title)
  networkContainer.appendChild(channelListContainer)

  var networkListContainer = document.getElementById('network-list')
  networkListContainer.appendChild(networkContainer)
}

function addChannel (channel) {
  var channelContainer = document.createElement('div')
  channelContainer.classList.add('channel')
  channelContainer.channel = channel
  channelContainer.innerText = channel.name
  channelContainer.id = 'channel-' + channel.name

  var networtContainer = document.getElementById('network-' + channel.client.serverName)
  var channelListContainer = networtContainer.children[1]
  channelListContainer.appendChild(channelContainer)
}

function focusInputField () {
  const input = document.getElementById('chat-input')
  input.focus()
}

function listenForEnter () {
  const input = document.getElementById('chat-input')
  input.addEventListener("keyup", function(event) {
    event.preventDefault()
    if (event.keyCode === 13) {
      client.sendRawMessage(input.value)
      input.value = ''
    }
  })
}

function setupContextMenu () {
  const userMenuTemplate = [
    { label: 'Info' },
    { label: 'Whois' },
    { label: 'Query' },
    { type: 'separator' },
    { label: 'Control', submenu: [
      { label: 'Ignore' },
      { label: 'Unignore' },
      { label: 'Op' },
      { label: 'Deop' },
      { label: 'Voice' },
      { label: 'Devoice' },
      { label: 'Kick' },
      { label: 'Kick (Why)' },
      { label: 'Ban' },
      { label: 'Ban, Kick' },
      { label: 'Ban, Kick (Why)' }
    ]},
    { label: 'CTCP', submenu: [
      { label: 'Ping', click: function() {
          var user = client.getUserFromNickName('Windcape')
          ctcpClient.ping([user])
        } 
      },
      { label: 'Time', click: function() {
          var user = client.getUserFromNickName('Windcape')
          ctcpClient.time([user])
        } 
      },
      { label: 'Version', click: function() {
        var user = client.getUserFromNickName('Windcape')
          ctcpClient.version([user])
        } 
      }
    ]},
    { type: 'separator' },
    { label: 'Slap', click: function() {
        var user = client.getUserFromNickName('Windcape')
        ctcpClient.action([user], 'slaps Windcape around a bit with a large trout')
      } 
    }
  ]

  const serverMenuTemplate = [
    { label: 'Lusers'},
    { label: 'MOTD' },
    { label: 'Time' },
    { type: 'separator' },
    { label: 'Quit' }
  ]

  const channelMenuTemplate = [
    { label: 'Set Topic' },
    { type: 'separator' },
    { label: 'Leave Channel' }
  ]

  const serverMenu = Menu.buildFromTemplate(serverMenuTemplate)
  const channelMenu = Menu.buildFromTemplate(channelMenuTemplate)
  const userMenu = Menu.buildFromTemplate(userMenuTemplate)

  var channels = Array.from(document.getElementsByClassName('channel')).forEach(x => {
    x.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      channelMenu.popup({ window: remote.getCurrentWindow() })
    }, false)
  })

  Array.from(document.getElementsByClassName('user')).forEach(x => {
    x.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      userMenu.popup({ window: remote.getCurrentWindow() })
    }, false)
  })
  
  document.getElementById('channel-content').addEventListener('contextmenu', (e) => {
    e.preventDefault()
    serverMenu.popup({ window: remote.getCurrentWindow() })
  }, false)
}

client.on('connectionError', function (error) {
  if (error.code == 'ECONNREFUSED') {
    addParagraph(`* Couldn't connect to ${error.address}:${error.port}`)
  } else if (error.code == 'ECONNRESET') {
    addParagraph(`* Disconnected (Connection Reset)`)
  }
})

client.on('error', function (errorMessage) {
  addParagraph('* ' + errorMessage)
})

client.on('channelList', function (channels) {
  console.log('Channels', channels)
})

client.on('clientInfo', function () {
  addNetwork(client.serverName)
})

client.on('registered', function () {
  client.localUser.on('message', function (messageText, source) {
    addParagraph(messageText, source) 
  })
  client.localUser.on('notice', function (noticeText, source) {
    addParagraph(noticeText, source) 
  })
  client.localUser.on('joinedChannel', function (channel) {
    channel.on('message', function (messageText, source) {
      addParagraph(messageText, source)
    })
    addChannel(channel)
  })
})

client.on('disconnected', function () {
  addParagraph('* Disconnected')
})

client.on('notice', function (noticeText, source) {
  addParagraph(noticeText, source)
})

client.on('motd', function (messageOfTheDay) {
  addParagraph(` - ${client.serverName} Message of the Day - `)
  var lines = messageOfTheDay.split('\r\n')
  lines.forEach(l => addParagraph(l))
})

document.addEventListener('DOMContentLoaded', function (event) {
  addParagraph('* Connecting to 127.0.0.1 (6667)')

  client.connect('127.0.0.1', 6667, {
    'nickName': 'Rincewind',
    'password': null,
    'userName': 'rincewind@unseenuniversity.dw',
    'realName': 'Rincewind the Wizzard',
    'userModes': []
  })

  focusInputField()
  listenForEnter()
  setupContextMenu()
})
