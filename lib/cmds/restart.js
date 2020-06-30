'use strict'
exports.info = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
}

const ignoredChannels = ['119944592832331776']

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    // Do not respond in ignored channels
    if (ignoredChannels.indexOf(msg.channel.id) !== -1) return
    // Only works for the bot owner
    if (msg.author.id !== client.config.owner_id) return
    msg.channel
      .send(':ok_hand:')
      .then(() => {
        process.exit(0)
        // Doesn't ever actually resolve
        resolve()
      })
      .catch(reject)
  })
