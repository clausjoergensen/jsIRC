// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu } = remote

const Autolinker = require('autolinker') 
const strftime = require('strftime')

function ClientUI (client, ctcpClient) {
  this.client = client
  this.ctcpClient = ctcpClient

  this.serverView = this.createServerView()
  this.channelViews = {}
  this.navigationServerView = null
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
    this.addServerToList(this.client.serverName)
  })

  this.client.on('connecting', (hostName, port) => {
    this.displayServerMessage(null, `* Connecting to ${hostName} (${port})`)
  })

  this.client.on('registered', this.clientRegistered.bind(this))

  this.client.on('disconnected', () => {
    this.displayServerMessage(null, '* Disconnected')
  })

  this.client.on('notice', (source, noticeText) => {
    this.displayServerMessage(source, noticeText)
  })

  this.client.on('motd', messageOfTheDay => {
    this.displayServerMessage(null, ` - ${this.client.serverName} Message of the Day - `)
    
    messageOfTheDay
      .split('\r\n')
      .forEach(l => this.displayServerMessage(null, l))
  })

  // CTCP Event Listeners
  ctcpClient.on('ping', (source, pingTime) => {
    this.displayServerAction(`[${source.nickName} PING reply]: ${pingTime} seconds.`)
  })

  ctcpClient.on('time', (source, dateTime) => {
    this.displayServerAction(`[${source.nickName} TIME reply]: ${dateTime}.`)
  })

  ctcpClient.on('version', (source, versionInfo) => {
    this.displayServerAction(`[${source.nickName} VERSION reply]: ${versionInfo}.`)
  })

  ctcpClient.on('finger', (source, info) => {
    this.displayServerAction(`[${source.nickName} FINGER reply]: ${info}.`)
  })

  ctcpClient.on('clientInfo', (source, info) => {
    this.displayServerAction(`[${source.nickName} CLIENTINFO reply]: ${info}.`)
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
  this.client.localUser.on('joinedChannel', this.localUserJoinedChannel.bind(this))
  this.client.localUser.on('partedChannel', this.localUserPartedChannel.bind(this))
}

ClientUI.prototype.localUserJoinedChannel = function (channel) {
  channel.on('message', (source, messageText) => {
    this.displayChannelMessage(channel, source, messageText)
  })

  channel.on('action', (source, messageText) => { 
    this.displayChannelMessage(channel, null, `* ${source.nickName} ${messageText}`)
  })

  channel.on('topic', (source, topic) => { this.displayChannelTopic(channel) })
  channel.on('userList', () => { this.displayChannelUsers(channel) })
  channel.on('userJoinedChannel', (user) => { this.displayChannelUsers(channel) })
  channel.on('userLeftChannel', (user) => { this.displayChannelUsers(channel) })

  this.addChannelToList(channel)
  this.viewChannel(channel)
}

ClientUI.prototype.localUserPartedChannel = function (channel) {
  this.leaveChannel(channel)  
}

ClientUI.prototype.addServerToList = function (serverName) {
  var serverNavigationElement = document.createElement('div')
  serverNavigationElement.classList.add('network')
  serverNavigationElement.serverName = serverName

  this.navigationServerView = serverNavigationElement

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
    { label: 'Leave Channel', click: () => {
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
    this.viewChannel(channel)
  }, false)

  var serverElement = this.navigationServerView

  var channelListElement = serverElement.children[1]
  channelListElement.appendChild(channelElement)

  this.navigationChannelViews[channel.name] = channelElement
}

ClientUI.prototype.viewServer = function () {
  if (this.selectedChannel != null) {
    this.navigationChannelViews[this.selectedChannel.name].classList.remove('channel-selected')
    this.channelViews[this.selectedChannel.name].style.display = 'none'
  }

  this.selectedChannel = null

  Array.from(document.getElementsByClassName('network-title'))
    .forEach(e => e.classList.remove('network-title-selected'))

  this.navigationServerView.firstChild.classList.remove('nav-unread')
  this.navigationServerView.firstChild.classList.add('network-title-selected')

  this.serverView.style.display = 'block'
}

ClientUI.prototype.viewChannel = function (channel) {
  Array.from(document.getElementsByClassName('network-title'))
    .forEach(e => e.classList.remove('network-title-selected'))
    
  Object.keys(this.navigationChannelViews).forEach((key, index) => {
    this.navigationChannelViews[key].classList.remove('channel-selected')
  })

  this.navigationChannelViews[channel.name].classList.remove('nav-unread')
  this.navigationChannelViews[channel.name].classList.add('channel-selected')

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

ClientUI.prototype.displayServerAction = function (text) {
  var now = new Date()
  var formattedText = `[${strftime('%H:%M', now)}] ${text}`

  var paragraph = document.createElement('p')
  paragraph.classList.add('server-message')
  paragraph.innerText = formattedText
  
  this.serverView.appendChild(paragraph)
  this.serverView.scrollTop = this.serverView.scrollHeight

  if (this.serverView.style.display == 'none' && this.selectedChannel != null) {
    this.navigationServerView.firstChild.classList.add('nav-unread')
  }
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

  if (this.serverView.style.display == 'none') {
    this.navigationServerView.firstChild.classList.add('unread')
  }
}

ClientUI.prototype.displayChannelAction = function (channel, source, text) {
  var senderName = '* ' + source.nickName
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

  this.navigationServerView.firstChild.classList.remove('nav-unread')

  if (this.selectedChannel != channel) {
    this.navigationChannelViews[channel.name].classList.add('nav-unread')
  }
}

ClientUI.prototype.displayChannelTopic = function (channel) {
  const channelTableView = this.channelViews[channel.name]
  const titleView = channelTableView.getElementsByClassName('channel-title-label')[0]
  titleView.innerHTML = Autolinker.link(channel.topic, { 'stripPrefix': false })
}

ClientUI.prototype.displayChannelUsers = function (channel) {
  const channelTableView = this.channelViews[channel.name]
  var userListElement = channelTableView.getElementsByClassName('users-panel')[0]
  while (userListElement.firstChild) {
    userListElement.removeChild(userListElement.firstChild);
  }

  channel.users.forEach(channelUser => {
    var user = channelUser.user

    const userMenuTemplate = [
      { label: 'Info', click: () => {
          this.ctcpClient.finger([user.nickName])
        }
      },
      { label: 'Whois', click: () => {
          this.client.queryWhoIs([user.nickName])
        } 
      },
      { type: 'separator' },
      //{ label: 'Control', submenu: [
      //  { label: 'Ignore' },
      //  { label: 'Unignore' },
      //  { label: 'Op' },
      //  { label: 'Deop' },
      //  { label: 'Voice' },
      //  { label: 'Devoice' },
      //  { label: 'Kick' },
      //  { label: 'Kick (Why)' },
      //  { label: 'Ban' },
      //  { label: 'Ban, Kick' },
      //  { label: 'Ban, Kick (Why)' }
      //]},
      { label: 'CTCP', submenu: [
        { label: 'Ping', click: () => {
            this.ctcpClient.ping([user.nickName])
            this.displayServerAction(`[${user.nickName} PING]`)
          } 
        },
        { label: 'Time', click: () => {
            this.ctcpClient.time([user.nickName])
            this.displayServerAction(`[${user.nickName} TIME]`)
          } 
        },
        { label: 'Version', click: () => {
            this.ctcpClient.version([user.nickName])
            this.displayServerAction(`[${user.nickName} VERSION]`)
          } 
        }
      ]},
      { type: 'separator' },
      { label: 'Slap', click: () => {
          var slapMessage = 'slaps Windcape around a bit with a large trout'
          this.ctcpClient.action([channel.name], slapMessage)
          this.displayChannelAction(channel, this.client.localUser, slapMessage)
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
  if (this.selectedChannel != null) {
    this.selectedChannel.sendMessage(text)
  } else {
    this.displayServerMessage(null, '* You are not on a channel')
  }
}

module.exports = ClientUI
