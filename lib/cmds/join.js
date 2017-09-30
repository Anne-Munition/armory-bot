'use strict';
exports.info = {
  desc: 'Post a link for people to join this bot to their own Discord server.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Format and send link for others to join this bot to their own Discord Server
  msg.channel.send(`Follow this link to add **${client.user.username}** to your Discord server:\n` +
    `<https://discordapp.com/oauth2/authorize?&client_id=${client.config.bot_app_id}&scope=bot>`)
    .then(resolve).catch(reject);
});
