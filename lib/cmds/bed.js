'use strict'
exports.info = {
  desc: 'Bed Response',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    msg.channel.send('No').then(resolve).catch(reject)
  })
