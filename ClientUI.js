// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu } = remote

const IrcChannelUser = require('./irc/IrcChannelUser.js') 
const Autolinker = require('autolinker') 
const strftime = require('strftime')

function ClientUI (client, ctcpClient) {
  this.client = client
  this.ctcpClient = ctcpClient

  this.chatInput = document.getElementById('chat-input')
  this.serverView = this.createServerView()
  this.channelViews = {}
  this.navigationServerView = null
  this.navigationChannelViews = {}
  this.selectedChannel = null

  this.setupEventListeners()
  this.focusInputField()
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
      this.displayServerMessage(null, `* Couldn't connect to ${error.address}:${error.port}`, ['server-error'])
    } else if (error.code == 'ECONNRESET') {
      this.displayServerMessage(null, `* Disconnected (Connection Reset)`, ['server-error'])
    }
  })

  this.client.on('error', errorMessage => {
    this.displayServerMessage(null, '* ' + errorMessage)
  })

  this.client.on('protocolError', (command, errorParameters, errorMessage) => {
    switch (command) {
      case 433: // ERR_NICKNAMEINUSE
        this.displayServerMessage(null, `Nickname '${errorParameters[0]}' is already in use.`, ['server-error'])
        this.chatInput.value = '/nick '
        break
      default:
        console.log(`Unsupported protocol error '${command}'.`, errorParameters, errorMessage)
        break
    }
  })

  this.client.on('clientInfo', () => {
    this.addServerToList(this.client.serverName)
  })

  this.client.on('connecting', (hostName, port) => {
    this.displayServerMessage(null, `* Connecting to ${hostName} (${port})`)
  })

  this.client.on('registered', this.clientRegistered.bind(this))

  this.client.on('disconnected', (reason) => {
    this.displayServerMessage(null, `* Disconnected (${reason})`)
  })

  this.client.on('notice', (source, noticeText) => {
    this.displayServerNotice(source, noticeText)
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
  this.chatInput.addEventListener('keyup', e => {
    e.preventDefault()
    if (e.keyCode === 13) {
      this.sendUserInput(this.chatInput.value)
      this.chatInput.value = ''
    }
  })
}

ClientUI.prototype.clientRegistered = function() {
  this.client.localUser.on('message', (source, targets, messageText) => {
    this.displayServerMessage(source, messageText)
  })
  this.client.localUser.on('notice', (source, targets, noticeText) => {
    this.displayServerNotice(source, noticeText)
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

  channel.on('topic', (source, topic) => { this.displayChannelTopic(channel, source) })
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

ClientUI.prototype.displayServerAction = function (text) {
  console.log(text)

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

ClientUI.prototype.displayServerMessage = function (source, text, styles = []) {
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

  var paragraph = document.createElement('p')
  paragraph.classList.add('server-message')
  paragraph.innerText = formattedText

  styles.forEach(s => paragraph.classList.add(s))    
  
  this.serverView.appendChild(paragraph)
  this.serverView.scrollTop = this.serverView.scrollHeight

  if (this.serverView.style.display == 'none') {
    this.navigationServerView.firstChild.classList.add('unread')
  }
}

ClientUI.prototype.displayServerNotice = function (source, text) {
  var senderName = ''
  if (source != null) {
    if (source.nickName != null) {
      senderName = ` - ${source.nickName} -`
    } else if (source.hostName != null) {
      senderName = source.hostName
    }
  }  

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

ClientUI.prototype.displayChannelTopic = function (channel, source = null) {
  const channelTableView = this.channelViews[channel.name]
  const titleView = channelTableView.getElementsByClassName('channel-title-label')[0]
  if (channel.topic == null || channel.topic.length == 0) {
    titleView.innerHTML = '(No Channel Topic)'
  } else {
    titleView.innerHTML = Autolinker.link(channel.topic, { 'stripPrefix': false })    
  }
  
  if (source != null) {
    this.displayChannelAction(channel, source, `changed topic to '${channel.topic}'`)
  }
}

ClientUI.prototype.displayChannelUsers = function (channel) {
  const channelTableView = this.channelViews[channel.name]
  var userListElement = channelTableView.getElementsByClassName('users-panel')[0]
  while (userListElement.firstChild) {
    userListElement.removeChild(userListElement.firstChild);
  }

  var sortedUsers = channel.users.sort((a, b) => {
    if (a.modes.includes('o') && b.modes.includes('o')) {
      return a.user.nickName.localeCompare(b.user.nickName)
    } else if (a.modes.includes('o')) {
      return -1
    } else if (b.modes.includes('o')) {
      return 1
    }

    if (a.modes.includes('v') && b.modes.includes('v')) {
      return a.user.nickName.localeCompare(b.user.nickName)
    } else if (a.modes.includes('v')) {
      return -1
    } else if (b.modes.includes('v')) {
      return 1
    }

    return a.user.nickName.localeCompare(b.user.nickName)
  })

  sortedUsers.forEach(channelUser => {
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
    
    var text = document.createTextNode(' ' + channelUser.modePrefix() + '' + user.nickName)
    userElement.appendChild(text)
    
    user.once('nickName', () => {  
      this.displayChannelUsers(channel)
    })

    channelUser.once('modes', () => {
      this.displayChannelUsers(channel)
    })
    
    userListElement.appendChild(userElement)
  })
}

IrcChannelUser.prototype.modePrefix = function () {
  var modePrefix = ''
  if (this.modes.includes('o')) {
    return '@'
  } else if (this.modes.includes('v')) {
    return '+'
  }
  return ''
}

ClientUI.prototype.focusInputField = function() {
  const input = document.getElementById('chat-input')
  input.focus()
}

ClientUI.prototype.sendAction = function (text) {
  var firstSpace = text.substring(1).indexOf(' ')
  var action = text.substring(1, firstSpace + 1)
  var content = text.substring(1).substr(firstSpace + 1)

  if (firstSpace == -1) {
    action = text.substring(1)
    content = ''
  }

  switch (action.toLowerCase()) {
    case 'join':
      this.client.joinChannel(content)
      break;
    case 'part':
      this.selectedChannel.part()
      break;
    case 'me':
      if (this.selectedChannel != null) {
        this.ctcpClient.action([this.selectedChannel.name], content)
        this.displayChannelAction(this.selectedChannel, this.client.localUser, content)
      } else {
        this.displayServerMessage(null, '* Cannot use /me in this view.')
      }
      break;
    case 'nick':
      this.client.setNickName(content)
      break;
    case 'topic':
      if (this.selectedChannel != null) {
        this.client.setTopic(this.selectedChannel.name, content)
      }
      break;
  }
}

ClientUI.prototype.sendUserInput = function (text) {
  if (text[0] == '/') {
    this.sendAction(text)
  } else {
    if (this.selectedChannel != null) {
      this.selectedChannel.sendMessage(text)
    } else {
      this.displayServerMessage(null, '* You are not on a channel')
    }
  }
}

module.exports = ClientUI