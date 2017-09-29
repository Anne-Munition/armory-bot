'use strict';
exports.info = {
  desc: 'Reload command(s) without restarting the bot.',
  usage: '<commandName | all>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Reloading commands should be restricted to the bot owner
  if (msg.author.id !== client.config.owner_id) {
    msg.reply('Only the bot owner has permissions to use ``reload``.').then(resolve).catch(reject);
    return;
  }
  // Exit if no command was passed to load/reload
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // All parameters to lowercase
  params.forEach(x => x.toLowerCase());
  if (params[0] === 'all') {
    client.logger.debug('reloading all commands');
    client.utils.loadAllCommands(client)
      .then(() => {
        msg.reply(`${client.commands.size} command${client.commands.size === 1 ? '' : 's'} ` +
          `have been loaded successfully.`).then(resolve).catch(reject);
      }).catch(reject);
  }

  if (params[0] === 'twitterclient') {
    msg.reply(`Twitter client resetting.`);
    client.logger.debug('Manually resetting twitter client');
    client.twitter.reset();
    resolve();
    return;
  }

  client.utils.loadOneCommand(client, params[0])
    .then(() => {
      msg.reply(`Command **${params[0]}** loaded successfully`)
        .then(resolve).catch(reject);
    }).catch(reject);
});
