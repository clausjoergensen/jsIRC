// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu } = remote

const Autolinker = require('autolinker') 
const IrcClient = require('./irc/IrcClient.js')
const CtcpClient = require('./irc/CtcpClient.js')
const strftime = require('./irc/strftime.js')

const packageInfo = require('./package.json')

var client = new IrcClient()
client.loggingEnabled = false

function ClientUI (client) {
  this.client = client

  this.ctcpClient = new CtcpClient(client)
  this.ctcpClient.clientName = packageInfo.name
  this.ctcpClient.clientVersion = packageInfo.version

  this.serverView = this.createServerView()
  this.channelViews = []
  this.navigationServerViews = {}
  this.navigationChannelViews = {}
  this.selectedChannel = null

  this.setupEventListeners()
}

ClientUI.prototype.createServerView = function () {
  var serverView = document.createElement('div')
  serverView.classList.add('server-view')
  document.getElementById('right-column').appendChild(serverView)
  return serverView  
}

ClientUI.prototype.setupEventListeners = function() {
  // IRC Client Event Listeners
  this.client.on('connectionError', error => {
    if (error.code == 'ECONNREFUSED') {
      this.displayServerMessage(null, `* Couldn't connect to ${error.address}:${error.port}`)
    } else if (error.code == 'ECONNRESET') {
      this.displayServerMessage(null, `* Disconnected (Connection Reset)`)
    }
  })

  this.client.on('error', errorMessage => {
    this.displayServerMessage(null, '* ' + errorMessage)
  })

  this.client.on('clientInfo', () => {
    this.addServerToList(client.serverName)
  })

  this.client.on('connecting', () => {
    this.displayServerMessage(null, '* Connecting to 127.0.0.1 (6667)')
  })

  this.client.on('registered', this.clientRegistered.bind(this))

  this.client.on('disconnected', () => {
    this.displayServerMessage(null, '* Disconnected')
  })

  this.client.on('notice', (source, noticeText) => {
    this.displayServerMessage(source, noticeText)
  })

  this.client.on('motd', messageOfTheDay => {
    this.displayServerMessage(null, ` - ${client.serverName} Message of the Day - `)
    
    messageOfTheDay
      .split('\r\n')
      .forEach(l => this.displayServerMessage(null, l))
  })

  // UI Event Listeners
  const chatInput = document.getElementById('chat-input')
  chatInput.addEventListener('keyup', e => {
    e.preventDefault()
    if (e.keyCode === 13) {
      this.sendUserInput(chatInput.value)
      chatInput.value = ''
    }
  })
}

ClientUI.prototype.clientRegistered = function() {
  this.client.localUser.on('message', (source, messageText) => {
    this.displayServerMessage(source, messageText)
  })
  this.client.localUser.on('notice', (source, noticeText) => {
    this.displayServerMessage(source, noticeText)
  })
  this.client.localUser.on('joinedChannel', this.userJoinedChannel.bind(this))
  this.client.localUser.on('partedChannel', this.userPartedChannel.bind(this))
}

ClientUI.prototype.userJoinedChannel = function (channel) {
  channel.on('message', (source, messageText) => {
    this.displayChannelMessage(channel, source, messageText)
  })
  channel.on('action', (source, messageText) => {
    this.displayChannelMessage(channel, null, `* ${source.nickName} ${messageText}`)
  })
  channel.on('userList', () => {
    this.displayChannelUsers(channel)
  })
  channel.on('topic', (source, topic) => {
    this.displayChannelTopic(channel)
  })

  this.addChannelToList(channel)  
}

ClientUI.prototype.userPartedChannel = function (channel) {
  this.leaveChannel(channel)  
}

ClientUI.prototype.addServerToList = function (serverName) {
  var serverNavigationElement = document.createElement('div')
  serverNavigationElement.classList.add('network')
  serverNavigationElement.serverName = serverName

  this.navigationServerViews[serverName] = serverNavigationElement

  var title = document.createElement('div')
  title.classList.add('network-title')
  title.innerText = serverName

  var channelListElement = document.createElement('div')
  channelListElement.classList.add('channel-list')

  serverNavigationElement.appendChild(title)
  serverNavigationElement.appendChild(channelListElement)

  var networkListElement = document.getElementById('network-list')
  networkListElement.appendChild(serverNavigationElement)

  title.addEventListener('click', (e) => {
    e.preventDefault()
    this.viewServer()
  }, false)
}

ClientUI.prototype.addChannelToList = function (channel) {
  var channelTableView = document.createElement('table')
  channelTableView.style.display = 'none'
  channelTableView.cellSpacing = 0
  channelTableView.cellPadding = 0
  channelTableView.classList.add('channel-view')
  
  var row = channelTableView.insertRow()  
  var messagesCell = row.insertCell()
  messagesCell.classList.add('messages-panel')
  var usersCell = row.insertCell()
  usersCell.classList.add('users-panel')

  var channelView = document.createElement('div')
  channelView.classList.add('channel-content-view')
  messagesCell.appendChild(channelView)

  var channelTitleView = document.createElement('div') 
  channelTitleView.classList.add('channel-title-view')
  channelView.appendChild(channelTitleView)
  
  var channelTitleLabel = document.createElement('div') 
  channelTitleLabel.classList.add('channel-title-label')
  channelTitleView.appendChild(channelTitleLabel)

  var channelMessageView = document.createElement('div') 
  channelMessageView.classList.add('channel-message-view')
  channelView.appendChild(channelMessageView)
  
  this.channelViews[channel.name] = channelTableView
  document.getElementById('right-column').appendChild(channelTableView)

  var channelElement = document.createElement('div')
  channelElement.classList.add('channel')
  channelElement.channel = channel
  channelElement.innerText = channel.name
  
  const channelMenuTemplate = [
    { label: 'Set Topic' },
    { type: 'separator' },
    { label: 'Leave Channel', click: function() {
        channel.part()
      } 
    }
  ]

  const channelMenu = Menu.buildFromTemplate(channelMenuTemplate)

  channelElement.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    channelMenu.popup({ window: remote.getCurrentWindow() })
  }, false)

  channelElement.addEventListener('click', (e) => {
    e.preventDefault()
    Object.keys(this.navigationChannelViews).forEach((key, index) => {
      this.navigationChannelViews[key].classList.remove('channel-selected')
    })
    channelElement.classList.add('channel-selected')
    this.viewChannel(channel)
  }, false)

  var serverElement = this.navigationServerViews[channel.client.serverName]

  var channelListElement = serverElement.children[1]
  channelListElement.appendChild(channelElement)

  this.navigationChannelViews[channel.name] = channelElement
}

ClientUI.prototype.viewServer = function () {
  if (this.selectedChannel != null) {
    this.navigationChannelViews[this.selectedChannel.name].classList.remove('channel-selected')
    this.channelViews[this.selectedChannel.name].style.display = 'none'
  }
  this.serverView.style.display = 'block'
}

ClientUI.prototype.viewChannel = function (channel) {
  this.serverView.style.display = 'none'    

  if (this.selectedChannel != null) {
    this.channelViews[this.selectedChannel.name].style.display = 'none'
  }
  
  this.channelViews[channel.name].style.display = 'table'
  this.selectedChannel = channel
  
  this.displayChannelTopic(channel)
  this.displayChannelUsers(channel)
}

ClientUI.prototype.leaveChannel = function (channel) {
  var channelElement = this.navigationChannelViews[channel.name]
  channelElement.parentElement.removeChild(channelElement)
  delete this.navigationChannelViews[channel.name]

  var channelView = this.channelViews[channel.name]
  channelView.parentElement.removeChild(channelView)
  delete this.channelViews[channel.name]
  
  if (Object.keys(this.channelViews).length == 0) {
    this.selectedChannel = null
    this.viewServer()
  } else if (this.selectedChannel == channel) {
    this.selectedChannel = null
    // show previous channel
  } else {
    // show previous channel
  }
}

ClientUI.prototype.nameFromSource = function (source) {
  var senderName = ''
  if (source != null) {
    if (source.nickName != null) {
      senderName = `<${source.nickName}>`
    } else if (source.hostName != null) {
      senderName = source.hostName
    }
  }  
  return senderName
}

ClientUI.prototype.displayServerMessage = function (source, text) {
  var senderName = this.nameFromSource(source)
  var now = new Date()
  var formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`

  var paragraph = document.createElement('p')
  paragraph.classList.add('server-message')
  paragraph.innerText = formattedText
  
  this.serverView.appendChild(paragraph)
  this.serverView.scrollTop = this.serverView.scrollHeight
}

ClientUI.prototype.displayChannelMessage = function (channel, source, text) {
  var senderName = this.nameFromSource(source)
  var now = new Date()
  var formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`
  
  var paragraph = document.createElement('p')
  paragraph.classList.add('channel-message')
  paragraph.innerText = formattedText
  
  const channelTableView = this.channelViews[channel.name]
  const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
  messageView.appendChild(paragraph)
  messageView.scrollTop = messageView.scrollHeight  
}

ClientUI.prototype.displayChannelTopic = function (channel) {
  const channelTableView = this.channelViews[channel.name]
  const titleView = channelTableView.getElementsByClassName('channel-title-label')[0]
  titleView.innerHTML = Autolinker.link(channel.topic, { 'stripPrefix': false })
}

ClientUI.prototype.displayChannelUsers = function (channel) {
  const channelTableView = this.channelViews[channel.name]
  var userListElement = document.getElementsByClassName('users-panel')[0]
  while (userListElement.firstChild) {
    userListElement.removeChild(userListElement.firstChild);
  }

  channel.users.forEach(channelUser => {
    var user = channelUser.user

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
            ctcpClient.ping([user.nickName])
          } 
        },
        { label: 'Time', click: function() {
            ctcpClient.time([user.nickName])
          } 
        },
        { label: 'Version', click: function() {
            ctcpClient.version([user.nickName])
          } 
        }
      ]},
      { type: 'separator' },
      { label: 'Slap', click: function() {
          ctcpClient.action([channel.name], 'slaps Windcape around a bit with a large trout')
        } 
      }
    ]

    const userMenu = Menu.buildFromTemplate(userMenuTemplate)
  
    var userElement = document.createElement('div')
    userElement.classList.add('user')
    userElement.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      userMenu.popup({ window: remote.getCurrentWindow() })
    }, false)

    var icon = document.createElement('span')
    icon.classList.add('icon')
    icon.classList.add('icon-user')
    userElement.appendChild(icon)
    
    var text = document.createTextNode(' ' + user.nickName)
    userElement.appendChild(text)
    
    userListElement.appendChild(userElement)
  })
}

ClientUI.prototype.focusInputField = function() {
  const input = document.getElementById('chat-input')
  input.focus()
}

ClientUI.prototype.sendUserInput = function (text) {
  this.client.sendRawMessage(text)
}

document.addEventListener('DOMContentLoaded', function (event) {
  const ui = new ClientUI(client)

  client.connect('127.0.0.1', 6667, {
    'nickName': 'Rincewind',
    'password': null,
    'userName': 'rincewind@unseenuniversity.dw',
    'realName': 'Rincewind the Wizzard',
    'userModes': []
  })

  client.on('registered', () => {
    client.sendRawMessage('join :#C#')
    client.sendRawMessage('join :#foo')
  })
})
