// Copyright (c) 2018 Claus Jørgensen
'use strict'

const assert = require('assert');
const events = require('events')

const { IrcClient, CtcpClient } = require('./../irc/index.js')

describe('IrcClient', function() {
  var client = null
  var connected = null
  var registered = null

  before(function() {
    client = new IrcClient()
    
    connected = new Promise((resolve, reject) => {
      client.on('connected', () => { 
        resolve()
      })
    })    

    registered = new Promise((resolve, reject) => {
      client.on('registered', () => { 
        resolve()
      })      
    })

    client.connect('127.0.0.1', 6667, {
      'nickName': 'Rincewind',
      'password': null,
      'userName': 'rincewind.wizzard@unseenuniversity.dw',
      'realName': 'Rincewind Wizzard',
      'userModes': []
    })
  })

  after(function() {
    client.quit()
  })

  it('connect', function(done) {
    connected.then(done)
  })

  it('registered', function(done) {
    registered.then(done)
  })

  it('joinChannel', function(done) {
    client.localUser.on('joinedChannel', (channel) => {
      done()      
    })

    client.joinChannel('#discworld')
  })

  it('sendMessage', function(done) {
    var expectedMessageText = 'Hello World'
    
    client.channels[0].on('message', (source, messageText) => {
      if (messageText == expectedMessageText) {
        done()      
      }
    })

    client.channels[0].sendMessage(expectedMessageText)
  })

  it('sendNotice', function(done) {
    var expectedNoticeText = 'Hello World'
    var expectedSource = client.localUser
    
    client.channels[0].on('notice', (source, noticeText) => {
      if (source == expectedSource && noticeText == expectedNoticeText) {
        done()      
      }
    })

    client.channels[0].sendNotice(expectedNoticeText)
  })

  it('setNickName', function(done) {
    var expectedNickName = 'Ridicully'
    
    client.localUser.on('nickName', () => {
      if (client.localUser.nickName == expectedNickName) {
        done()      
      }
    })

    client.setNickName(expectedNickName)
  })

  it('setTopic', function(done) {
    var expectedTopic = 'Nunc Id Vides, Nunc Ne Vides'
    var expectedUser = client.localUser
    
    client.channels[0].on('topic', (user, topic) => {
      if (user == expectedUser && topic == expectedTopic) {
        done()      
      }
    })

    client.setTopic(client.channels[0].name, expectedTopic)
  })

  it('leaveChannel', function(done) {
    client.localUser.on('partedChannel', (channel) => {
      done()      
    })

    client.leaveChannel(client.channels[0].name)
  })
})
