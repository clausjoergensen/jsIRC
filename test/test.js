// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { IrcClient, IrcFloodPreventer, CtcpClient } = require('./../irc/index.js')
const log = require('electron-log')

log.transports.file.level = false
log.transports.console.level = false

describe('IRC Tests', function () {
  let nickName1 = 'Rincewind'
  let nickName2 = 'Twoflower'

  let client1 = null
  let client2 = null
  let ctcpClient1 = null // eslint-disable-line no-unused-vars
  let ctcpClient2 = null // eslint-disable-line no-unused-vars

  let floodPreventer1 = new IrcFloodPreventer(4, 2000)
  let floodPreventer2 = new IrcFloodPreventer(4, 2000)

  let connectedPromise1 = null
  let connectedPromise2 = null
  let registeredPromise1 = null
  let registeredPromise2 = null

  before(function () {
    client1 = new IrcClient()
    client2 = new IrcClient()

    ctcpClient1 = new CtcpClient(client1)
    ctcpClient2 = new CtcpClient(client2)

    client1.floodPreventer = floodPreventer1
    client2.floodPreventer = floodPreventer2

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

  after(function () {
    client1.quit()
    client2.quit()
  })

  describe('IrcClient', function () {
    this.slow(2500)

    it('connect', function (done) {
      connectedPromise1.then(connectedPromise2).then(done)
    })

    it('registered', function (done) {
      registeredPromise1.then(registeredPromise2).then(done)
    })

    it('motd', function (done) {
      client1.once('motd', (_) => {
        done()
      })

      client1.getMessageOfTheDay()
    })

    it('networkInfo', function (done) {
      client1.once('networkInfo', (_) => {
        done()
      })

      client1.getNetworkInfo()
    })

    it('serverVersion', function (done) {
      client1.once('serverVersion', (_) => {
        done()
      })

      client1.getServerVersion()
    })

    it('serverTime', function (done) {
      client1.once('serverTime', (_) => {
        done()
      })

      client1.getServerTime()
    })

    it('serverStatistics', function (done) {
      client1.once('serverStatistics', (_) => {
        done()
      })

      client1.getServerStatistics()
    })

    it('serverLinks', function (done) {
      client1.once('serverLinks', (_) => {
        done()
      })

      client1.getServerLinks()
    })

    it('joinChannel', function (done) {
      let userJoinedPromise1 = new Promise((resolve, reject) => {
        client1.localUser.once('joinedChannel', (channel) => {
          resolve()
        })
        client1.joinChannel('#discworld')
      })

      let userJoinedPromise2 = new Promise((resolve, reject) => {
        client2.localUser.once('joinedChannel', (channel) => {
          resolve()
        })
        client2.joinChannel('#discworld')
      })

      userJoinedPromise1.then(userJoinedPromise2).then(done)
    })

    it('sendMessage', function (done) {
      let expectedMessageText = 'Hello World'

      client1.channels[0].once('message', (source, messageText) => {
        if (messageText === expectedMessageText) {
          done()
        }
      })

      client1.channels[0].sendMessage(expectedMessageText)
    })

    it('sendNotice', function (done) {
      let expectedNoticeText = 'Hello World'
      let expectedSource = client1.localUser

      client1.channels[0].once('notice', (source, noticeText) => {
        if (source === expectedSource && noticeText === expectedNoticeText) {
          done()
        }
      })

      client1.channels[0].sendNotice(expectedNoticeText)
    })

    it('floodPreventing', function (done) {
      this.timeout(25000)

      let expectedSpamMessage = 'Lovely Spam! Wonderful Spam! Spam, Spam, Spam, Spam! Spam, Spam, Spam!'

      let expectedMessageCount = 10
      let actualMessageCount = 0

      var remoteChannel = client2.channels[0]
      remoteChannel.on('message', (source, messageText) => {
        if (messageText === expectedSpamMessage) {
          actualMessageCount++
        }
        if (actualMessageCount === expectedMessageCount) {
          remoteChannel.removeAllListeners()
          done()
        }
      })

      for (let i = 0; i < expectedMessageCount; i++) {
        client1.channels[0].sendMessage(expectedSpamMessage)
      }
    })

    it('setNickName', function (done) {
      let expectedNickName = 'Ridicully'

      client1.localUser.once('nickName', () => {
        if (client1.localUser.nickName === expectedNickName) {
          done()
        }
      })

      client1.setNickName(expectedNickName)
    })

    it('setTopic', function (done) {
      let expectedTopic = 'Nunc Id Vides, Nunc Ne Vides'
      let expectedUser = client1.localUser

      client1.channels[0].once('topic', (user, topic) => {
        if (user === expectedUser && topic === expectedTopic) {
          done()
        }
      })

      client1.setTopic(client1.channels[0].name, expectedTopic)
    })

    it('op', function (done) {
      let channelUser2 = client1.channels[0].users.find(x => x.user.nickName === nickName2)
      channelUser2.once('modes', () => {
        if (channelUser2.modes.includes('o')) {
          done()
        }
      })

      channelUser2.op()
    })

    it('deop', function (done) {
      let channelUser2 = client1.channels[0].users.find(x => x.user.nickName === nickName2)
      channelUser2.once('modes', () => {
        if (!channelUser2.modes.includes('o')) {
          done()
        }
      })

      channelUser2.deop()
    })

    it('voice', function (done) {
      let channelUser2 = client1.channels[0].users.find(x => x.user.nickName === nickName2)
      channelUser2.once('modes', () => {
        if (channelUser2.modes.includes('v')) {
          done()
        }
      })

      channelUser2.voice()
    })

    it('devoice', function (done) {
      let channelUser2 = client1.channels[0].users.find(x => x.user.nickName === nickName2)
      channelUser2.once('modes', () => {
        if (!channelUser2.modes.includes('v')) {
          done()
        }
      })

      channelUser2.devoice()
    })

    it('ban', function (done) {
      let channelUser2 = client1.channels[0].users.find(x => x.user.nickName === nickName2)

      client1.channels[0].once('modes', () => {
        if (client1.channels[0].modes.includes('b')) {
          done()
        }
      })

      channelUser2.ban()
    })

    it('getModes', function (done) {
      let expectedBanMask = `${nickName2}!*@*`

      client1.channels[0].once('banList', (banList) => {
        if (banList && banList[0].banMask === expectedBanMask) {
          done()
        }
      })

      client1.channels[0].getModes('b')
    })

    it('unban', function (done) {
      client1.channels[0].once('modes', () => {
        if (!client1.channels[0].modes.includes('b')) {
          done()
        }
      })

      client1.channels[0].unban(nickName2)
    })

    it('kick', function (done) {
      client1.channels[0].once('userKicked', (channelUser) => {
        if (channelUser.user.nickName === nickName2) {
          done()
        }
      })

      client1.kick(client1.channels[0], [nickName2], 'Tourist, Rincewind had decided, meant "idiot"')
    })

    it('leaveChannel', function (done) {
      client1.localUser.once('partedChannel', (channel) => {
        done()
      })

      client1.leaveChannel(client1.channels[0].name)
    })

    it('invite', function (done) {
      client1.joinChannel('#unseenuniversity')

      setTimeout(function () {
        client1.channels[0].once('userInvite', (_) => {
          done()
        })

        client1.channels[0].invite(nickName2)
      }, 2000)
    })

    it('who', function (done) {
      this.timeout(10000)

      client1.once('whoReply', () => {
        done()
      })

      client1.queryWho([nickName2])
    })

    it('whoIs', function (done) {
      client1.once('whoIsReply', () => {
        done()
      })

      client1.queryWhoIs([nickName2])
    })

    it('whoWas', function (done) {
      client1.once('whoWasReply', () => {
        done()
      })

      client1.queryWhoWas([nickName2])
    })
  })

  describe('CtcpClient', function () {
    this.slow(2500)

    it('ctcp ping', function (done) {
      ctcpClient1.once('ping', (source, pingTime) => {
        done()
      })

      ctcpClient1.ping([nickName2])
    })

    it('ctcp version', function (done) {
      ctcpClient1.once('version', (source, versionInfo) => {
        done()
      })

      ctcpClient1.version([nickName2])
    })

    it('ctcp time', function (done) {
      ctcpClient1.once('time', (source, dateTime) => {
        done()
      })

      ctcpClient1.time([nickName2])
    })

    it('ctcp finger', function (done) {
      ctcpClient1.once('finger', (source, data) => {
        done()
      })

      ctcpClient1.finger([nickName2])
    })

    it('ctcp action', function (done) {
      let expectedMessageText = 'slaps Twoflower around a bit with a large trout'
      let channelName = '#MendedDrum'
      client1.joinChannel(channelName)
      client2.joinChannel(channelName)

      setTimeout(function () {
        client2.channels.find(x => x.name === channelName).once('action', (source, messageText) => {
          if (messageText === expectedMessageText) {
            done()
          }
        })

        ctcpClient1.action([channelName], expectedMessageText)
      }, 2000)
    })
  })
})
