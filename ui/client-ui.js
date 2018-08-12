// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu, BrowserWindow, app, shell } = remote
const { IrcError } = require('./../irc/index.js')
const Autolinker = require('autolinker')
const strftime = require('strftime')
const prompt = require('electron-prompt')
const path = require('path')
const $ = require('jquery')

class ClientUI {
  constructor (client, ctcpClient) {
    this.client = client
    this.ctcpClient = ctcpClient

    this.chatInput = document.getElementById('chat-input')
    this.serverView = this.createServerView()
    this.channelViews = {}
    this.navigationServerView = null
    this.navigationChannelViews = {}
    this.selectedChannel = null
    this.reconnectAttempt = 0

    this.setupEventListeners()
    this.focusInputField()

    window.onfocus = () => {
      this.focusInputField()
    }

    $(document).on('click', 'a[href^="http"]', function (event) {
      event.preventDefault()
      shell.openExternal(this.href)
    })
  }

  createServerView () {
    let serverView = document.createElement('div')
    serverView.classList.add('server-view')

    const serverMenuTemplate = [
      {
        label: 'Network Info',
        click: () => {
          this.client.getNetworkInfo()
        }
      },
      {
        label: 'Time',
        click: () => {
          this.client.getServerTime()
        }
      },
      {
        label: 'Message of the Day',
        click: () => {
          this.client.getMessageOfTheDay()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ]

    const serverMenu = Menu.buildFromTemplate(serverMenuTemplate)

    serverView.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      serverMenu.popup({ window: remote.getCurrentWindow() })
    }, false)

    document.getElementById('right-column').appendChild(serverView)
    return serverView
  }

  reconnect () {
    this.reconnectAttempt++
    this.displayServerMessage(null, `* Connect retry #${this.reconnectAttempt} ${this.client.hostName}  (${this.client.port})`)
    this.client.connect(this.client.hostName, this.client.port, this.client.registrationInfo)
    clearInterval(this.reconnectTimer)
  }

  setupEventListeners () {
    // IRC Client Event Listeners
    this.client.on('connectionError', error => {
      if (error.code === 'ECONNREFUSED') {
        this.displayServerError(`* Couldn't connect to server (Connection refused)`)
      } else if (error.code === 'ECONNRESET') {
        this.displayServerMessage(null, `* Disconnected (Connection Reset)`)
      } else {
        console.log(error)
      }
    })

    this.client.on('connectionClosed', () => {
      if (this.reconnectAttempt === 12) {
        this.reconnectAttempt = 0
        this.reconnectTimer = null
      } else {
        this.reconnectTimer = setInterval(() => this.reconnect(), 2000)
      }
    })

    this.client.on('error', errorMessage => {
      this.displayServerError('* ' + errorMessage)
    })

    this.client.on('protocolError', (command, errorParameters, errorMessage) => {
      switch (command) {
        case 433: // ERR_NICKNAMEINUSE
          this.displayServerError(`Nickname '${errorParameters[0]}' is already in use.`)
          this.chatInput.value = '/nick '
          this.focusInputField()
          break
        case 482: // ERR_CHANOPRIVSNEEDED
          this.displayChannelError(errorParameters[0], errorMessage)
          break
        default:
          let errorName = IrcError[command]
          console.log(`Unsupported protocol error ${errorName}(${command}).`, errorParameters, errorMessage)
          break
      }
    })

    this.client.on('serverSupportedFeatures', (serverSupportedFeatures) => {
      let networkName = serverSupportedFeatures['NETWORK']
      if (networkName != null) {
        this.navigationServerView.firstChild.innerText = networkName
      }
    })

    this.client.on('clientInfo', () => {
      this.addServerToList(this.client.serverName)
    })

    this.client.on('connecting', (hostName, port) => {
      this.displayServerMessage(null, `* Connecting to ${hostName} (${port})`)
    })

    this.client.on('connected', this.clientConnected.bind(this))

    this.client.on('disconnected', (reason) => {
      this.displayServerMessage(null, `* Disconnected (${reason})`)
    })

    this.client.on('motd', messageOfTheDay => {
      this.displayServerMessage(null, ` - ${this.client.serverName} Message of the Day - `)

      messageOfTheDay
        .split('\r\n')
        .forEach(l => this.displayServerMessage(null, l))
    })

    // CTCP Event Listeners
    this.ctcpClient.on('ping', (source, pingTime) => {
      this.displayServerAction(`[${source.nickName} PING reply]: ${pingTime} seconds.`)
    })

    this.ctcpClient.on('time', (source, dateTime) => {
      this.displayServerAction(`[${source.nickName} TIME reply]: ${dateTime}.`)
    })

    this.ctcpClient.on('version', (source, versionInfo) => {
      this.displayServerAction(`[${source.nickName} VERSION reply]: ${versionInfo}.`)
    })

    this.ctcpClient.on('finger', (source, info) => {
      this.displayServerAction(`[${source.nickName} FINGER reply]: ${info}.`)
    })

    this.ctcpClient.on('clientInfo', (source, info) => {
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

  clientConnected () {
    this.client.localUser.on('message', (source, targets, messageText) => {
      this.displayServerMessage(source, messageText)
    })
    this.client.localUser.on('notice', (source, targets, noticeText) => {
      this.displayServerNotice(source, noticeText)
    })
    this.client.localUser.on('joinedChannel', this.localUserJoinedChannel.bind(this))
    this.client.localUser.on('partedChannel', this.localUserPartedChannel.bind(this))
  }

  localUserJoinedChannel (channel) {
    channel.on('message', (source, messageText) => {
      this.displayChannelMessage(channel, source, messageText)
    })

    channel.on('action', (source, messageText) => {
      this.displayChannelMessage(channel, null, `* ${source.nickName} ${messageText}`)
    })

    channel.on('topic', (source, topic) => { this.displayChannelTopic(channel, source) })
    channel.on('userList', () => { this.displayChannelUsers(channel) })
    channel.on('userJoinedChannel', (_) => { this.displayChannelUsers(channel) })
    channel.on('userLeftChannel', (_) => { this.displayChannelUsers(channel) })
    channel.on('userKicked', (_) => { this.displayChannelUsers(channel) })

    this.addChannelToList(channel)
    this.viewChannel(channel)
  }

  localUserPartedChannel (channel) {
    this.leaveChannel(channel)
  }

  showChannelModes (channel) {
    let prompt = new BrowserWindow({
      width: 500,
      height: 300,
      resizable: false,
      parent: null,
      skipTaskbar: true,
      alwaysOnTop: false,
      useContentSize: false,
      modal: true,
      title: `[${channel.name}] Channel Modes`
    })

    prompt.setMenu(null)
    prompt.loadURL(path.join('file://', __dirname, '/channel-modes.html'))

    prompt.on('keyup', (e) => {
      if (e.keyCode == 27) {
        prompt.close()
      }
    })
  }

  addServerToList (serverName) {
    let serverNavigationElement = document.createElement('div')
    serverNavigationElement.classList.add('network')
    serverNavigationElement.serverName = serverName

    this.navigationServerView = serverNavigationElement

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
      this.viewServer()
    }, false)
  }

  addChannelToList (channel) {
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

    let serverElement = this.navigationServerView

    let channelListElement = serverElement.children[1]
    channelListElement.appendChild(channelElement)

    this.navigationChannelViews[channel.name] = channelElement
  }

  viewServer () {
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

    this.setWindowTitleForServer()
  }

  setWindowTitleForServer () {
    let userModes = this.client.localUser.modes.join('')
    userModes = userModes.length > 0 ? `+${userModes}` : ''

    let serverName = this.client.serverSupportedFeatures['NETWORK']
    serverName = serverName || this.client.serverName

    let browserWindow = BrowserWindow.getFocusedWindow()
    browserWindow.setTitle(`${app.getName()} - [Status: ${this.client.localUser.nickName} [${userModes}] on ${serverName} (${this.client.hostName}:${this.client.port})]`)
  }

  viewChannel (channel) {
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

    this.setWindowTitleForChannel(channel)
  }

  setWindowTitleForChannel (channel) {
    let topic = channel.topic ? `: ${channel.topic}` : ''

    let serverName = this.client.serverSupportedFeatures['NETWORK']
    serverName = serverName || this.client.serverName

    let browserWindow = BrowserWindow.getFocusedWindow()
    browserWindow.setTitle(`${app.getName()} - [${channel.name} (${serverName}, ${this.client.localUser.nickName})${topic}]`)
  }

  leaveChannel (channel) {
    let channelElement = this.navigationChannelViews[channel.name]
    channelElement.parentElement.removeChild(channelElement)
    delete this.navigationChannelViews[channel.name]

    let channelView = this.channelViews[channel.name]
    channelView.parentElement.removeChild(channelView)
    delete this.channelViews[channel.name]

    if (Object.keys(this.channelViews).length === 0) {
      this.selectedChannel = null
      this.viewServer()
    } else if (this.selectedChannel === channel) {
      this.selectedChannel = null
      // show previous channel
    } else {
      // show previous channel
    }
  }

  displayServerAction (text) {
    console.log(text)

    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${text}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('server-message')
    paragraph.innerText = formattedText

    this.serverView.appendChild(paragraph)
    this.serverView.scrollTop = this.serverView.scrollHeight

    if (this.serverView.style.display === 'none' && this.selectedChannel != null) {
      this.navigationServerView.firstChild.classList.add('nav-unread')
    }
  }

  displayServerError (text) {
    this.displayServerMessage(null, text, ['server-error'])
  }

  displayServerMessage (source, text, styles = []) {
    let senderName = ''
    if (source != null) {
      if (source.nickName != null) {
        senderName = `<${source.nickName}>`
      } else if (source.hostName != null) {
        senderName = source.hostName
      }
    }

    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('server-message')
    paragraph.innerText = formattedText

    styles.forEach(s => paragraph.classList.add(s))

    this.serverView.appendChild(paragraph)
    this.serverView.scrollTop = this.serverView.scrollHeight

    if (this.serverView.style.display === 'none') {
      this.navigationServerView.firstChild.classList.add('nav-unread')
    }
  }

  displayServerNotice (source, text) {
    let senderName = ''
    if (source != null) {
      if (source.nickName != null) {
        senderName = ` - ${source.nickName} -`
      } else if (source.hostName != null) {
        senderName = source.hostName
      }
    }

    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('server-message')
    paragraph.innerText = formattedText

    this.serverView.appendChild(paragraph)
    this.serverView.scrollTop = this.serverView.scrollHeight

    if (this.serverView.style.display === 'none') {
      this.navigationServerView.firstChild.classList.add('nav-unread')
    }
  }

  displayChannelError (channelName, errorMessage) {
    let senderName = '* ' + this.client.localUser.nickName
    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName}: ${errorMessage}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('channel-message')
    paragraph.classList.add('channel-message-error')
    paragraph.innerText = formattedText

    const channelTableView = this.channelViews[channelName]
    if (channelTableView != null) {
      const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
      messageView.appendChild(paragraph)
      messageView.scrollTop = messageView.scrollHeight
    } else {
      this.displayServerError(`${channelName} ${errorMessage}`)
    }
  }

  displayChannelAction (channelName, source, text) {
    let senderName = '* ' + source.nickName
    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${text}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('channel-message')
    paragraph.innerText = formattedText

    const channelTableView = this.channelViews[channelName]
    const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
    messageView.appendChild(paragraph)
    messageView.scrollTop = messageView.scrollHeight
  }

  displayChannelMessage (channel, source, text) {
    let senderName = ''
    if (source != null) {
      if (source.nickName != null) {
        senderName = `&lt;${source.nickName}&gt;`
      } else if (source.hostName != null) {
        senderName = source.hostName
      }
    }

    let linkedText = Autolinker.link(text, {
      stripPrefix: false,
      newWindow: false,
      replaceFn: (match) => {
        if (match.getType() === 'url') {
          var tag = match.buildTag()
          tag.setAttr('title', match.getAnchorHref())
          return tag
        } else {
          return true
        }
      }
    })

    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${linkedText}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('channel-message')
    paragraph.innerHTML = formattedText

    const channelTableView = this.channelViews[channel.name]
    const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
    messageView.appendChild(paragraph)
    messageView.scrollTop = messageView.scrollHeight

    this.navigationServerView.firstChild.classList.remove('nav-unread')

    if (this.selectedChannel !== channel) {
      this.navigationChannelViews[channel.name].classList.add('nav-unread')
    }
  }

  displayChannelTopic (channel, source = null) {
    const channelTableView = this.channelViews[channel.name]
    const titleView = channelTableView.getElementsByClassName('channel-title-label')[0]
    if (channel.topic == null || channel.topic.length === 0) {
      titleView.innerHTML = '(No Channel Topic)'
    } else {
      titleView.innerHTML = Autolinker.link(channel.topic, {
        stripPrefix: false,
        newWindow: false,
        replaceFn: (match) => {
          if (match.getType() === 'url') {
            var tag = match.buildTag()
            tag.setAttr('title', match.getAnchorHref())
            return tag
          } else {
            return true
          }
        }
      })
    }

    if (source != null) {
      this.displayChannelAction(channel.name, source, `changed topic to '${channel.topic}'`)
    }

    this.setWindowTitleForChannel(channel)
  }

  displayChannelUsers (channel) {
    const channelTableView = this.channelViews[channel.name]
    let userListElement = channelTableView.getElementsByClassName('users-panel')[0]
    while (userListElement.firstChild) {
      userListElement.removeChild(userListElement.firstChild)
    }

    let sortedUsers = channel.users.sort((a, b) => {
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
      let user = channelUser.user

      const userMenuTemplate = [
        {
          label: 'Info',
          click: () => {
            this.ctcpClient.finger([user.nickName])
          }
        },
        {
          label: 'Whois',
          click: () => {
            this.client.queryWhoIs([user.nickName])
          }
        },
        { type: 'separator' },
        {
          label: 'Control',
          submenu: [
            {
              label: 'Op',
              click: () => {
                channelUser.op()
              }
            },
            {
              label: 'Deop',
              click: () => {
                channelUser.deop()
              }
            },
            {
              label: 'Voice',
              click: () => {
                channelUser.voice()
              }
            },
            {
              label: 'Devoice',
              click: () => {
                channelUser.devoice()
              }
            },
            {
              label: 'Kick',
              click: () => {
                channelUser.kick()
              }
            },
            {
              label: 'Kick (Why)',
              click: () => {
                prompt({
                  title: `Kick ${user.nickName}`,
                  label: 'Reason:'
                }).then((r) => {
                  if (r) {
                    channelUser.kick(r)
                  }
                }).catch(console.error)
              }
            },
            {
              label: 'Ban',
              click: () => {
                channelUser.ban()
              }
            },
            {
              label: 'Ban, Kick',
              click: () => {
                channelUser.ban()
                channelUser.kick()
              }
            },
            {
              label: 'Ban, Kick (Why)',
              click: () => {
                prompt({
                  title: `Ban & Kick ${user.nickName}`,
                  label: 'Reason:'
                }).then((r) => {
                  if (r) {
                    channelUser.ban()
                    channelUser.kick(r)
                  }
                }).catch(console.error)
              }
            }
          ]
        },
        {
          label: 'CTCP',
          submenu: [
            {
              label: 'Ping',
              click: () => {
                this.ctcpClient.ping([user.nickName])
                this.displayServerAction(`[${user.nickName} PING]`)
              }
            },
            {
              label: 'Time',
              click: () => {
                this.ctcpClient.time([user.nickName])
                this.displayServerAction(`[${user.nickName} TIME]`)
              }
            }, {
              label: 'Version',
              click: () => {
                this.ctcpClient.version([user.nickName])
                this.displayServerAction(`[${user.nickName} VERSION]`)
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Slap',
          click: () => {
            let slapMessage = `slaps ${user.nickName} around a bit with a large trout`
            this.ctcpClient.action([channel.name], slapMessage)
            this.displayChannelAction(channel.name, this.client.localUser, slapMessage)
          }
        }
      ]

      const userMenu = Menu.buildFromTemplate(userMenuTemplate)

      let userElement = document.createElement('div')
      userElement.classList.add('user')
      userElement.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        userMenu.popup({ window: remote.getCurrentWindow() })
      }, false)

      let userNameElement = document.createElement('span')
      userNameElement.classList.add('user-name')
      userNameElement.innerText = user.nickName

      let prefixElement = document.createElement('span')
      prefixElement.classList.add('user-mode')

      if (channelUser.modes.includes('o')) {
        prefixElement.classList.add('user-mode-op')
        prefixElement.innerText = '@'
      } else if (channelUser.modes.includes('v')) {
        prefixElement.classList.add('user-mode-voice')
        prefixElement.innerText = '+'
      } else {
        prefixElement.classList.add('user-mode-none')
        prefixElement.innerText = 'x'
      }

      userElement.appendChild(prefixElement)
      userElement.appendChild(userNameElement)

      user.once('nickName', () => {
        this.displayChannelUsers(channel)
      })

      channelUser.once('modes', () => {
        this.displayChannelUsers(channel)
      })

      userListElement.appendChild(userElement)
    })
  }

  focusInputField () {
    this.chatInput.focus()
  }

  sendAction (text) {
    let firstSpace = text.substring(1).indexOf(' ')
    let action = text.substring(1, firstSpace + 1)
    let content = text.substring(1).substr(firstSpace + 1)

    if (firstSpace === -1) {
      action = text.substring(1)
      content = ''
    }

    switch (action.toLowerCase()) {
      case 'msg':
        let target = content.substr(0, content.indexOf(' '))
        let message = content.substr(content.indexOf(' ') + 1)
        this.client.sendMessage([target], message)
        break
      case 'join':
        this.client.joinChannel(content)
        break
      case 'part':
        this.selectedChannel.part()
        break
      case 'me':
        if (this.selectedChannel != null) {
          this.ctcpClient.action([this.selectedChannel.name], content)
          this.displayChannelAction(this.selectedChannel.name, this.client.localUser, content)
        } else {
          this.displayServerMessage(null, '* Cannot use /me in this view.')
        }
        break
      case 'nick':
        this.client.setNickName(content)
        break
      case 'topic':
        if (this.selectedChannel != null) {
          this.client.setTopic(this.selectedChannel.name, content)
        }
        break
    }
  }

  sendUserInput (text) {
    if (text[0] === '/') {
      this.sendAction(text)
    } else {
      if (this.selectedChannel != null) {
        var chunks = text.match(/.{1,398}/g)
        chunks.forEach(c => this.selectedChannel.sendMessage(c))
      } else {
        this.displayServerMessage(null, '* You are not on a channel')
      }
    }
  }
}

module.exports = ClientUI
