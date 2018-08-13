// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { IrcClient, IrcFloodPreventer, CtcpClient } = require('./../irc/index.js')

const IrcNetworkListController = require('./IrcNetworkListController.js')
const IrcChatController = require('./IrcChatController.js')

class IrcViewController {
  constructor (server, port, registrationInfo) {
    this.client = new IrcClient()
    this.floodPreventer = new IrcFloodPreventer(4, 2000)
    this.chatController = new IrcChatController(this.client)
    this.networkListController = new IrcNetworkListController(this.client)

    this.networkListController.on('viewChannel', (channel) => {
      this.chatController.viewChannel(channel)
    })

    this.networkListController.on('viewServer', () => {
      this.chatController.viewServer()
    })

    this.client.on('connected', () => {
      this.client.localUser.on('joinedChannel', (channel) => {
        this.networkListController.viewChannel(channel)
      })
    })

    this.client.connect(server, port, registrationInfo)
  }

  joinChannels (channels) {
    this.client.on('registered', () => {
      channels.forEach(channel => this.client.joinChannel(channel))
    })
  }
}

module.exports = IrcViewController
