// Copyright (c) 2018 Claus Jørgensen
// This code is licensed under MIT license (see LICENSE.txt for details)
'use strict'

const { IrcClient } = require('./../index.js')

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

class MarkovChain {
  constructor () {
    this.nodes = []
  }

  generateSequence () {
    let sequence = []
    let currentNode = this.getNode()
    while (true) {
      if (currentNode.links.length === 0) {
        break
      }
      currentNode = currentNode.links[getRandomInt(0, currentNode.links.length - 1)]
      if (!currentNode.value) {
        break
      }
      sequence.push(currentNode.value)
    }
    return sequence
  }

  train (fromValue, toValue) {
    let fromNode = this.getNode(fromValue)
    let toNode = this.getNode(toValue)
    fromNode.links.push(toNode)
  }

  getNode (value = null) {
    let node = this.nodes.find(x => x.value === value)
    if (!node) {
      node = {
        value: value,
        links: []
      }
      this.nodes.push(node)
    }
    return node
  }
}

class MarkovChainBot {
  constructor () {
    this.markovChain = new MarkovChain()
    this.launchTime = new Date()
    this.trainingMessagesReceived = 0
    this.trainingWordsReceived = 0
    this.client = new IrcClient()
    this.client.on('in', (raw) => { console.debug(raw.trim()) })
    this.client.on('out', (raw) => { console.debug(raw.trim()) })
    this.client.on('error', (error) => { console.debug(error) })
    this.client.on('registered', () => {
      this.client.localUser.on('joinedChannel', (channel) => {
        channel.on('message', (source, messageText) => {
          let sentences = messageText.split([ '.', '!', '?', ',', ';', ':' ])
          sentences.forEach(sentence => {
            let lastWord
            // eslint-disable-next-line no-useless-escape
            sentence.split(' ').map(x => x.replace(/[()\[\]{}'""`~]/, '')).forEach(word => {
              if (word) {
                if (!lastWord && channel.users.find(x => x.user.nickName === word)) {
                  return
                }
                this.markovChain.train(lastWord, word)
                lastWord = word
                this.trainingWordsReceived++
              }
            })
            this.markovChain.train(lastWord, null)
          })
          this.trainingMessagesReceived++
        })
      })
      this.client.sendRawMessage('JOIN #testing')
    })
  }

  talk () {
    let trials = 0
    let words = []
    while (words.length < 3 && trials++ < 10) {
      words = this.markovChain.generateSequence()
    }
    let sentence = words.join(' ')
    this.client.sendMessage(['#testing'], sentence)
  }
}

let bot = new MarkovChainBot()

bot.client.connect('localhost', 6667, {
  nickName: 'MarkovBot',
  userName: 'MarkovBot',
  realName: 'Markov Chain Bot',
  userModes: []
})

process.openStdin().addListener('data', function (data) {
  let input = data.toString().trim()
  if (input === 'TALK') {
    bot.talk()
  } else if (input) {
    bot.client.sendRawMessage(input)
  }
})
