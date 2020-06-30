'use strict'
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    // Get array of ids of guild owners
    const ownerIds = client.guilds.cache.map((guild) => guild.ownerID)
    // Add the bot owner id. Can be redundant
    ownerIds.push(client.config.owner_id)
    const seeHidden = ownerIds.includes(msg.author.id)
    const commands = client.commands
      // Only show hidden commands to proper members
      .filter((x) => !(x.info.hidden && !seeHidden))
      // Formatted lines
      .map((c) => `${c.name}: ${c.info.desc}`)
    // Post list to user's dm channel
    msg.author
      .send(commands.sort().join('\n'), { code: 'apache' })
      .then(() => {
        // If we were in a text channel to begin with, send a message about the dm
        if (msg.channel.type === 'text') {
          msg
            .reply('I just sent you a DM with a list of commands.')
            .then(resolve)
            .catch(reject)
        }
      })
      // Likely cause of failure here is blocked by user
      .catch(() =>
        msg.reply(
          'Unable to send you a list of commands, Did you block me or DMs in general?',
        ),
      )
  })
