# jsIRC

A JavaScript (Node.js) library for IRC, with almost full [RFC 2813](https://tools.ietf.org/html/rfc2813) support.

## Documentation

Documentation is published at https://clausjoergensen.github.io/jsIRC

## Installation

```shell
npm install jsirc
```

## Usage

```javascript
let client = new IrcClient()

client.on('registered', () => {
  client.localUser.on('joinedChannel', (channel) => {
    channel.sendMessage("What's for lunch?")
  })
  client.joinChannel('#greathall')
}) 

client.connect('irc.quakenet.org', 6667, {
  'nickName': 'Ridcully',
  'userName': 'archchancellor@unseen-university.edu',
  'realName': 'Mustrum Ridcully'
})
```

## License

[MIT License](LICENSE.txt)

## Acknowledgements

- [dcodeIO/long](https://github.com/dcodeIO/long)
- [kelektiv/node-uuid](https://github.com/kelektiv/node-uuid)
