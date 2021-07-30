client.twitch = require('./twitch')(client)

// A list of twitch channels that are waiting to sync with twitchClient
client.twitch.waiting = []

// Run only on once on script launch
client.once('ready', () => {
  // If this bot is not DBKynd's test Bot...
  if (client.user.id !== '120105547633524736') {
    // Send the Owner a message that the Bot has started, indicates a crash or restart
    const owner = client.users.cache.get(client.config.owner_id)
    if (owner) {
      owner.send(
        `I just started running. Did I crash? :worried:\nPID:\`\`${process.pid}\`\``,
      )
    }
  }
  // Start the Twitch and Twitter Clients
  client.twitch.start()
  // Websocket client to post Twitch bans from AnneMunition's channel
  require('./twitchMessages')(client)
})

// A message has been deleted
client.on('messageDelete', (message) => {
  notify.messageDeleted(client, message)
})

// A message has been updated / edited
client.on('messageUpdate', (oldMessage, newMessage) => {
  notify.messageUpdated(client, oldMessage, newMessage)
})
