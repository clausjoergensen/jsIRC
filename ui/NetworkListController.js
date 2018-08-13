// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu, BrowserWindow, app, shell } = remote

const events = require('events')
const { EventEmitter } = events

class NetworkListController extends EventEmitter {
  constructor (client) {
    super()

    this.client = client    
    this.selectedChannel = null
    this.serverView = null
    this.channelViews = {}

    this.client.once('clientInfo', () => {
      this.addServerToList()
    })

    this.client.on('connected', () => {
      this.clientConnected()
    })

    this.client.on('serverSupportedFeatures', (serverSupportedFeatures) => {
      let networkName = serverSupportedFeatures['NETWORK']
      if (networkName) {
        this.serverView.firstChild.innerText = networkName
      }
    })

    window.addEventListener('keyup', e => {
      if (e.ctrlKey) {
        if (e.keyCode === 78) { // ctrl+n
          this.viewNextChannel()
        } else if (e.keyCode === 87) { // ctrl+w
          this.selectedChannel.part()
        }
      }
    })        
  }

  get selectedChannelName () {
    return this.selectedChannel.name
  }

  clientConnected () {
    this.client.localUser.on('joinedChannel', this.localUserJoinedChannel.bind(this))
    this.client.localUser.on('partedChannel', this.localUserPartedChannel.bind(this))
  }

  localUserJoinedChannel (channel) {
    channel.on('message', (source, messageText) => {
      this.markAsUnread(channel)
    })

    channel.on('action', (source, messageText) => {
      this.markAsUnread(channel)
    })

    channel.on('topic', (source, topic) => { 
      this.setWindowTitleForChannel(channel)
      this.markAsUnread(channel)
    })

    this.addChannelToList(channel)    
  }

  localUserPartedChannel (channel) {
    let channelView = this.channelViews[channel.name]
    channelView.parentElement.removeChild(channelView)

    if (Object.keys(this.channelViews).length === 0) {
      this.viewServer()
    } else if (this.selectedChannel == channel) {
      this.viewPreviousChannel(channel)
    }

    delete this.channelViews[channel.name]
  }

  viewChannel (channel) {
    Array.from(document.getElementsByClassName('network-title'))
      .forEach(e => e.classList.remove('network-title-selected'))

    Object.keys(this.channelViews).forEach((key, index) => {
      this.channelViews[key].classList.remove('channel-selected')
    })

    this.channelViews[channel.name].classList.remove('nav-unread')
    this.channelViews[channel.name].classList.add('channel-selected')

    let previousSelectedChannel = this.selectedChannel
    this.selectedChannel = channel
    this.setWindowTitleForChannel(channel)

    this.emit('viewChannel', previousSelectedChannel, channel)
  }

  viewServer () {
    this.channelViews[this.selectedChannel.name].classList.remove('channel-selected')
    this.selectedChannel = null
    
    Array.from(document.getElementsByClassName('network-title'))
      .forEach(e => e.classList.remove('network-title-selected'))
    
    this.serverView.firstChild.classList.remove('nav-unread')
    this.serverView.firstChild.classList.add('network-title-selected')

    this.setWindowTitleForServer()

    this.emit('viewServer', this.client.serverName)
  }

  viewPreviousChannel (channel) {
    let keys = Object.keys(this.channelViews)
    let index = keys.indexOf(channel.name)
    let previousChannelElement = this.channelViews[keys[index - 1]]
    if (previousChannelElement) {
      this.viewChannel(previousChannelElement.channel)
    } else {
      this.viewServer()
    }
  }

  viewNextChannel () {
    if (this.selectedChannel) {
      let keys = Object.keys(this.channelViews)
      let index = keys.indexOf(this.selectedChannel.name)
      let nextChannelElement = this.channelViews[keys[index + 1]]
      if (nextChannelElement) {
        this.viewChannel(nextChannelElement.channel)
      } else {
        this.viewServer()
      }
    } else {
      let keys = Object.keys(this.channelViews)
      let firstChannelElement = this.channelViews[keys[0]]
      if (firstChannelElement) {
        this.viewChannel(firstChannelElement.channel)
      } else {
        this.viewServer()
      }
    }
  }

  addServerToList () {
    let serverName = this.client.serverName

    let serverNavigationElement = document.createElement('div')
    serverNavigationElement.classList.add('network')
    serverNavigationElement.serverName = serverName

    this.serverView = serverNavigationElement

    let title = document.createElement('div')
    title.classList.add('network-title')
    title.innerText = serverName

    let channelListElement = document.createElement('div')
    channelListElement.classList.add('channel-list')

    serverNavigationElement.appendChild(title)
    serverNavigationElement.appendChild(channelListElement)

    let networkListElement = document.getElementById('network-list')
    networkListElement.appendChild(serverNavigationElement)

    title.addEventListener('click', (e) => {
      e.preventDefault()
      this.emit('viewServer', this.client.serverName)
    }, false)
  }

  addChannelToList (channel) {
    if (this.channelViews[channel.name]) {
      return
    }

    let channelTableView = document.createElement('table')
    channelTableView.style.display = 'none'
    channelTableView.cellSpacing = 0
    channelTableView.cellPadding = 0
    channelTableView.classList.add('channel-view')

    let row = channelTableView.insertRow()
    let messagesCell = row.insertCell()
    messagesCell.classList.add('messages-panel')
    let usersCell = row.insertCell()
    usersCell.classList.add('users-panel')

    let channelView = document.createElement('div')
    channelView.classList.add('channel-content-view')
    messagesCell.appendChild(channelView)

    let channelTitleView = document.createElement('div')
    channelTitleView.classList.add('channel-title-view')
    channelView.appendChild(channelTitleView)

    let channelTitleLabel = document.createElement('div')
    channelTitleLabel.classList.add('channel-title-label')
    channelTitleView.appendChild(channelTitleLabel)

    const channelTitleMenu = Menu.buildFromTemplate([{
      label: 'Set Topic',
      click: () => {
        this.showChannelModes(channel)
      }
    }])

    channelTitleLabel.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      channelTitleMenu.popup({ window: remote.getCurrentWindow() })
    }, false)

    let channelMessageView = document.createElement('div')
    channelMessageView.classList.add('channel-message-view')
    channelView.appendChild(channelMessageView)

    const channelMessageViewMenu = Menu.buildFromTemplate([{
      label: 'Channel Modes',
      click: () => {
        this.showChannelModes(channel)
      }
    }])

    channelMessageView.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      channelMessageViewMenu.popup({ window: remote.getCurrentWindow() })
    }, false)

    this.channelViews[channel.name] = channelTableView
    document.getElementById('right-column').appendChild(channelTableView)

    let channelElement = document.createElement('div')
    channelElement.classList.add('channel')
    channelElement.channel = channel
    channelElement.innerText = channel.name

    const channelMenu = Menu.buildFromTemplate([{
      label: 'Leave Channel',
      click: () => {
        channel.part()
      }
    }])

    channelElement.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      channelMenu.popup({ window: remote.getCurrentWindow() })
    }, false)

    channelElement.addEventListener('click', (e) => {
      e.preventDefault()
      this.viewChannel(channel)
    }, false)

    let channelListElement = this.serverView.children[1]
    channelListElement.appendChild(channelElement)

    this.channelViews[channel.name] = channelElement
  }

  setWindowTitleForServer () {
    let userModes = this.client.localUser.modes.join('')
    userModes = userModes.length > 0 ? `+${userModes}` : ''

    let serverName = this.client.serverSupportedFeatures['NETWORK']
    serverName = serverName || this.client.serverName

    let browserWindow = BrowserWindow.getFocusedWindow()
    if (browserWindow) {
      browserWindow.setTitle(`${app.getName()} - [Status: ${this.client.localUser.nickName} [${userModes}] on ${serverName} (${this.client.hostName}:${this.client.port})]`)
    }
  }


  setWindowTitleForChannel (channel) {
    let topic = channel.topic ? `: ${channel.topic}` : ''

    let serverName = this.client.serverSupportedFeatures['NETWORK']
    serverName = serverName || this.client.serverName

    let browserWindow = BrowserWindow.getFocusedWindow()
    if (browserWindow) {
      browserWindow.setTitle(`${app.getName()} - [${channel.name} (${serverName}, ${this.client.localUser.nickName})${topic}]`)
    }
  }  

  markAsUnread (channel = null) {
    if (channel == null) {
      this.serverView.firstChild.classList.add('nav-unread')      
    } else {
      this.serverView.firstChild.classList.remove('nav-unread')
      if (this.selectedChannel !== channel) {
        this.channelViews[channel.name].classList.add('nav-unread')
      }
    }
  }
}

module.exports = NetworkListController
