// Copyright (c) 2018 Claus Jørgensen
'use strict'

const IrcClient = require('./irc/IrcClient.js')
const strftime = require('./strftime.js')

var client = new IrcClient()

function addParagraph(text, source = null) {
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
  
  var p = document.createElement('p')
  p.classList.add('message')
  p.innerText = formattedText
  
  const messages = document.getElementById('messages')
  messages.appendChild(p)
  messages.scrollTop = messages.scrollHeight
}

function focusInputField() {
  const input = document.getElementById('chat-input')
  input.focus()
}

function listenForEnter() {
  const input = document.getElementById('chat-input')
  input.addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
      client.sendRawMessage(input.value)
      input.value = ''
    }
  });
}

client.on('error', function (error) {
  if (error.code == 'ECONNREFUSED') {
    addParagraph(`* Couldn't connect to ${error.address}:${error.port}`)
  } else if (error.code == 'ECONNRESET') {
    addParagraph(`* Disconnected (Connection Reset)`)
  }
})

client.on('registered', function () {
  client.localUser.on('message', function (messageText, source) {
    addParagraph(messageText, source) 
  })
  client.localUser.on('notice', function (noticeText, source) {
    addParagraph(noticeText, source) 
  })
})

client.on('disconnected', function () {
  addParagraph('* Disconnected')
})

client.on('notice', function (noticeText, source) {
  addParagraph(noticeText, source)
})

client.on('motd', function (messageOfTheDay) {
  addParagraph(` - ${client.serverName} Message of the Day - `)
  var lines = messageOfTheDay.split('\r\n')
  lines.forEach(l => addParagraph(l))
})

document.addEventListener('DOMContentLoaded', function (event) {
  addParagraph('* Connecting to 127.0.0.1 (6667)')

  client.connect('127.0.0.1', 6667, {
    'nickName': 'Rincewind',
    'password': null,
    'userName': 'Rincewind',
    'realName': 'Rincewind the Wizzard',
    'userModes': []
  })

  focusInputField()
  listenForEnter()
})
