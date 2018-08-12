// Copyright (c) 2018 Claus Jørgensen
'use strict'

const { remote } = require('electron')

document.addEventListener('DOMContentLoaded', function (event) {
  document.getElementById('ok').addEventListener('click', () => {
    remote.getCurrentWindow().close()
  });

  document.getElementById('cancel').addEventListener('click', () => {
    remote.getCurrentWindow().close()
  });
})
