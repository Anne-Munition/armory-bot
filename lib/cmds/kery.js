'use strict'
exports.info = {
  desc: "Sends the 'Kery\'s fault' image.",
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'ATTACH_FILES'],
}

const path = require('path')

exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    // Send the shame gif from our assets directory to the channel where the command was ran
    msg.channel
      .send({
        files: [
          {
            attachment: path.join(client.assetsDir, 'kery.png'),
            name: 'kery.png',
          },
        ],
      })
      .then(resolve)
      .catch(reject)
  })
