'use strict'
exports.info = {
  desc: "Show latency with a 'Pong!' message.",
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    msg.channel
      .send('Ping...')
      .then((m) => {
        m.edit(
          `Latency: ${
            m.createdTimestamp - msg.createdTimestamp
          }ms\nHeartbeat: ${client.ws.ping.toFixed(0)}ms`,
          { code: 'apache' },
        )
          .then(resolve)
          .catch(reject)
      })
      .catch(reject)
  })
