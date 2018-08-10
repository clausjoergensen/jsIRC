// Copyright (c) 2018 Claus Jørgensen
'use strict'

const assert = require('assert');
const events = require('events')

const { IrcClient, CtcpClient } = require('./../irc/index.js')

describe('IrcClient', function() {
  var nickName1 = 'Rincewind'
  var nickName2 = 'Twoflower'

  var client1 = null
  var client2 = null

  var connectedPromise1 = null
  var connectedPromise2 = null
  var registeredPromise1 = null
  var registeredPromise2 = null

  before(function() {
    client1 = new IrcClient()
    client2 = new IrcClient()
    
    connectedPromise1 = new Promise((resolve, reject) => {
      client1.once('connected', () => { 
        resolve()
      })
    })

    connectedPromise2 = new Promise((resolve, reject) => {
      client2.once('connected', () => { 
        resolve()
      })
    })    

    registeredPromise1 = new Promise((resolve, reject) => {
      client1.once('registered', () => { 
        resolve()
      })      
    })

    registeredPromise2 = new Promise((resolve, reject) => {
      client2.once('registered', () => { 
        resolve()
      })      
    })

    client1.connect('127.0.0.1', 6667, {
      'nickName': nickName1,
      'password': null,
      'userName': 'rincewind.wizzard@unseenuniversity.dw',
      'realName': 'Rincewind Wizzard',
      'userModes': []
    })

    client2.connect('127.0.0.1', 6667, {
      'nickName': nickName2,
      'password': null,
      'userName': 'twoflower.tourist@palace.cwc',
      'realName': 'Twoflower the Tourist',
      'userModes': []
    })
  })

  after(function() {
    client1.quit()
  })

  it('connect', function(done) {
    connectedPromise1.then(connectedPromise2).then(done)
  })

  it('registered', function(done) {
    registeredPromise1.then(registeredPromise2).then(done)
  })

  it('joinChannel', function(done) {
    var userJoinedPromise1 = new Promise((resolve, reject) => {
      client1.localUser.once('joinedChannel', (channel) => {
        resolve()
      })          
    })
    
    var userJoinedPromise2 = new Promise((resolve, reject) => {
      client2.localUser.once('joinedChannel', (channel) => {
        resolve()
      })          
    })

    userJoinedPromise1.then(userJoinedPromise2).then(done)

    client1.joinChannel('#discworld')
    client2.joinChannel('#discworld')
  })

  it('sendMessage', function(done) {
    var expectedMessageText = 'Hello World'
    
    client1.channels[0].once('message', (source, messageText) => {
      if (messageText == expectedMessageText) {
        done()      
      }
    })

    client1.channels[0].sendMessage(expectedMessageText)
  })

  it('sendNotice', function(done) {
    var expectedNoticeText = 'Hello World'
    var expectedSource = client1.localUser
    
    client1.channels[0].once('notice', (source, noticeText) => {
      if (source == expectedSource && noticeText == expectedNoticeText) {
        done()      
      }
    })

    client1.channels[0].sendNotice(expectedNoticeText)
  })

  it('setNickName', function(done) {
    var expectedNickName = 'Ridicully'
    
    client1.localUser.once('nickName', () => {
      if (client1.localUser.nickName == expectedNickName) {
        done()      
      }
    })

    client1.setNickName(expectedNickName)
  })

  it('setTopic', function(done) {
    var expectedTopic = 'Nunc Id Vides, Nunc Ne Vides'
    var expectedUser = client1.localUser
    
    client1.channels[0].once('topic', (user, topic) => {
      if (user == expectedUser && topic == expectedTopic) {
        done()      
      }
    })

    client1.setTopic(client1.channels[0].name, expectedTopic)
  })

  it('op', function(done) {
    var channelUser2 = client1.channels[0].users.find(x => x.user.nickName == nickName2)
    channelUser2.once('modes', () => {
      if (channelUser2.modes.includes('o')) {
        done()
      }
    })

    channelUser2.op()
  })

  it('deop', function(done) {
    var channelUser2 = client1.channels[0].users.find(x => x.user.nickName == nickName2)
    channelUser2.once('modes', () => {
      if (!channelUser2.modes.includes('o')) {
        done()
      }
    })

    channelUser2.deop()
  })

  it('voice', function(done) {
    var channelUser2 = client1.channels[0].users.find(x => x.user.nickName == nickName2)
    channelUser2.once('modes', () => {
      if (channelUser2.modes.includes('v')) {
        done()
      }
    })

    channelUser2.voice()
  })

  it('devoice', function(done) {
    var channelUser2 = client1.channels[0].users.find(x => x.user.nickName == nickName2)
    channelUser2.once('modes', () => {
      if (!channelUser2.modes.includes('v')) {
        done()
      }
    })

    channelUser2.devoice()
  })

  it('ban', function(done) {
    var channelUser2 = client1.channels[0].users.find(x => x.user.nickName == nickName2)

    client1.channels[0].once('modes', () => {
      if (client1.channels[0].modes.includes('b')) {
        done()
      }
    })

    channelUser2.ban()
  })

  it('kick', function(done) {
    client1.channels[0].once('userKicked', (channelUser) => {
      if (channelUser.user.nickName == nickName2) {
        done()
      }
    })

    client1.kick(client1.channels[0], [nickName2], 'Tourist, Rincewind had decided, meant "idiot"')
  })

  it('leaveChannel', function(done) {
    client1.localUser.once('partedChannel', (channel) => {
      done()      
    })

    client1.leaveChannel(client1.channels[0].name)
  })
})
