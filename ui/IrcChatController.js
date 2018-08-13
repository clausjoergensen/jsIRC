// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')
const { Menu, app, shell } = remote

const events = require('events')
const { EventEmitter } = events

const { IrcError, CtcpClient } = require('./../irc/index.js')

const strftime = require('strftime')
const Autolinker = require('autolinker')
const prompt = require('electron-prompt')
const packageInfo = require('./../package.json')
const $ = require('jquery')

class IrcChatController extends EventEmitter {
  constructor (client, channel) {
    super()

    this.client = client
    this.ctcpClient = new CtcpClient(client)
    this.ctcpClient.clientName = packageInfo.name
    this.ctcpClient.clientVersion = packageInfo.version

    this.serverView = this.createServerView()
    this.selectedChannel = null
    this.channelViews = {}

    this.chatInput = document.getElementById('chat-input')

    this.client.on('connected', () => {
      this.clientConnected()
    })

    this.client.on('connecting', (hostName, port) => {
      this.displayServerMessage(null, `* Connecting to ${hostName} (${port})`)
    })

    this.client.on('disconnected', (reason) => {
      this.displayServerMessage(null, `* Disconnected (${reason})`)
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

    this.client.on('motd', messageOfTheDay => {
      this.displayServerMessage(null, ` - ${this.client.serverName} Message of the Day - `)
      messageOfTheDay
        .split('\r\n')
        .forEach(l => this.displayServerMessage(null, l))
    })

    this.client.on('connectionError', error => {
      if (error.code === 'ECONNREFUSED') {
        this.displayServerError(`* Couldn't connect to server (Connection refused)`)
      } else if (error.code === 'ECONNRESET') {
        this.displayServerMessage(null, `* Disconnected (Connection Reset)`)
      } else {
        console.log(error)
      }
    })

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

    this.chatInput.addEventListener('keyup', e => {
      e.preventDefault()
      if (e.keyCode === 13) {
        this.sendUserInput(this.chatInput.value)
        this.chatInput.value = ''
      }
    })

    $(document).on('click', 'a[href^="http"]', function (event) {
      event.preventDefault()
      shell.openExternal(this.href)
    })

    window.onfocus = () => {
      this.focusInputField()
    }
  }

  clientConnected () {
    this.client.localUser.on('joinedChannel', this.localUserJoinedChannel.bind(this))
    this.client.localUser.on('partedChannel', this.localUserPartedChannel.bind(this))

    this.client.localUser.on('message', (source, targets, messageText) => {
      this.displayServerMessage(source, messageText)
    })

    this.client.localUser.on('notice', (source, targets, noticeText) => {
      this.displayServerNotice(source, noticeText)
    })
  }

  localUserJoinedChannel (channel) {
    channel.on('message', (source, messageText) => {
      this.displayChannelMessage(channel, source, messageText)
    })

    channel.on('action', (source, messageText) => {
      this.displayChannelMessage(channel, null, `* ${source.nickName} ${messageText}`)
    })

    channel.on('topic', (source, topic) => {
      this.displayChannelTopic(channel, source)
    })

    channel.once('userList', () => {
      channel.users.forEach(channelUser => {
        channelUser.user.on('nickName', () => {
          this.displayChannelUsers(channel)
        })

        channelUser.on('modes', () => {
          this.displayChannelUsers(channel)
        })
      })
      this.displayChannelUsers(channel)
    })

    channel.on('userJoinedChannel', (channelUser) => {
      channelUser.user.on('nickName', () => {
        this.displayChannelUsers(channelUser.channel)
      })
      channelUser.on('modes', () => {
        this.displayChannelUsers(channelUser.channel)
      })
      this.displayChannelUsers(channel)
    })

    channel.on('userLeftChannel', (channelUser) => {
      this.displayChannelUsers(channel)
    })

    channel.on('userKicked', (_) => {
      this.displayChannelUsers(channel)
    })

    this.createChannelView(channel)
  }

  localUserPartedChannel (channel) {
    let channelView = this.channelViews[channel.name]
    channelView.parentElement.removeChild(channelView)
    delete this.channelViews[channel.name]
  }

  viewServer () {
    if (this.selectedChannel) {
      this.channelViews[this.selectedChannel.name].style.display = 'none'
    }
    this.serverView.style.display = 'block'
  }

  viewChannel (channel) {
    this.serverView.style.display = 'none'

    if (this.selectedChannel) {
      this.channelViews[this.selectedChannel.name].style.display = 'none'
    }

    this.channelViews[channel.name].style.display = 'table'
    this.selectedChannel = channel

    this.displayChannelTopic(channel)
    this.displayChannelUsers(channel)
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

  createChannelView (channel) {
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

    this.navigationController.markAsUnread()
  }

  displayServerError (text) {
    this.displayServerMessage(null, text, ['server-error'])
  }

  displayServerMessage (source, text, styles = []) {
    let senderName = ''
    if (source) {
      if (source.nickName) {
        senderName = `<${source.nickName}>`
      } else if (source.hostName) {
        senderName = source.hostName
      }
    }

    text = text.replace(/[^\x20-\xFF]/g, '')

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
    if (source) {
      if (source.nickName) {
        senderName = ` - ${source.nickName} -`
      } else if (source.hostName) {
        senderName = source.hostName
      }
    }

    text = text.replace(/[^\x20-\xFF]/g, '')

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
    if (channelTableView) {
      const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
      messageView.appendChild(paragraph)
      messageView.scrollTop = messageView.scrollHeight
    } else {
      this.displayServerError(`${channelName} ${errorMessage}`)
    }
  }

  displayChannelAction (channelName, source, text) {
    text = text.replace(/[^\x20-\xFF]/g, '')

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

    let senderName = '* ' + source.nickName
    let now = new Date()
    let formattedText = `[${strftime('%H:%M', now)}] ${senderName} ${linkedText}`

    let paragraph = document.createElement('p')
    paragraph.classList.add('channel-message')
    paragraph.innerHTML = formattedText

    const channelTableView = this.channelViews[channelName]
    const messageView = channelTableView.getElementsByClassName('channel-message-view')[0]
    messageView.appendChild(paragraph)
    messageView.scrollTop = messageView.scrollHeight
  }

  displayChannelMessage (channel, source, text) {
    let senderName = ''
    if (source) {
      if (source.nickName) {
        senderName = `&lt;${source.nickName}&gt;`
      } else if (source.hostName) {
        senderName = source.hostName
      }
    }

    text = text.replace(/[\x00-\x1F]/g, '') // eslint-disable-line no-control-regex

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

    if (source) {
      this.displayChannelAction(channel.name, source, `changed topic to '${channel.topic}'`)
    }
  }

  displayChannelUsers (channel) {
    const channelTableView = this.channelViews[channel.name]
    let userListElement = channelTableView.getElementsByClassName('users-panel')[0]
    while (userListElement.firstChild) {
      userListElement.removeChild(userListElement.firstChild)
    }

    let sortedUsers = channel.users.sort((a, b) => {
      if (a.modes.includes('q') && b.modes.includes('q')) {
        return a.user.nickName.localeCompare(b.user.nickName)
      } else if (a.modes.includes('q')) {
        return -1
      } else if (b.modes.includes('q')) {
        return 1
      }

      if (a.modes.includes('a') && b.modes.includes('a')) {
        return a.user.nickName.localeCompare(b.user.nickName)
      } else if (a.modes.includes('a')) {
        return -1
      } else if (b.modes.includes('a')) {
        return 1
      }

      if (a.modes.includes('o') && b.modes.includes('o')) {
        return a.user.nickName.localeCompare(b.user.nickName)
      } else if (a.modes.includes('o')) {
        return -1
      } else if (b.modes.includes('o')) {
        return 1
      }

      if (a.modes.includes('h') && b.modes.includes('h')) {
        return a.user.nickName.localeCompare(b.user.nickName)
      } else if (a.modes.includes('h')) {
        return -1
      } else if (b.modes.includes('h')) {
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

      const userMenu = Menu.buildFromTemplate([
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
      ])

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

      if (channelUser.modes.includes('q')) {
        prefixElement.classList.add('user-mode-owner')
        prefixElement.innerText = '~'
      } else if (channelUser.modes.includes('a')) {
        prefixElement.classList.add('user-mode-admin')
        prefixElement.innerText = '&'
      } else if (channelUser.modes.includes('o')) {
        prefixElement.classList.add('user-mode-op')
        prefixElement.innerText = '@'
      } else if (channelUser.modes.includes('h')) {
        prefixElement.classList.add('user-mode-halfop')
        prefixElement.innerText = '%'
      } else if (channelUser.modes.includes('v')) {
        prefixElement.classList.add('user-mode-voice')
        prefixElement.innerText = '+'
      } else {
        prefixElement.classList.add('user-mode-none')
        prefixElement.innerText = 'x'
      }

      userElement.appendChild(prefixElement)
      userElement.appendChild(userNameElement)

      userListElement.appendChild(userElement)
    })
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
        {
          let target = content.substr(0, content.indexOf(' '))
          let message = content.substr(content.indexOf(' ') + 1)
          this.client.sendMessage([target], message)
        }
        break
      case 'join':
        this.client.joinChannel(content)
        break
      case 'part':
        this.selectedChannel.part()
        break
      case 'me':
        if (this.selectedChannel) {
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
        if (this.selectedChannel) {
          this.client.setTopic(this.selectedChannel.name, content)
        }
        break
      case 'hop':
        {
          let newChannel = content.substr(content.indexOf(' ') + 1).trim()
          if (this.selectedChannel) {
            var name = this.selectedChannel.name
            this.selectedChannel.part()
            if (newChannel.length !== 0) {
              this.client.joinChannel(newChannel)
            } else {
              this.client.joinChannel(name)
            }
          } else {
            this.displayServerMessage(null, '* Cannot use /hop in this view.')
          }
        }
        break
    }
  }

  sendUserInput (text) {
    if (text[0] === '/') {
      this.sendAction(text)
    } else {
      if (this.selectedChannel) {
        var chunks = text.match(/.{1,398}/g)
        chunks.forEach(c => this.selectedChannel.sendMessage(c))
      } else {
        this.displayServerMessage(null, '* You are not on a channel')
      }
    }
  }

  focusInputField () {
    this.chatInput.focus()
  }
}

module.exports = IrcChatController
