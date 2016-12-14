'use strict';
exports.info = {
  desc: 'Reload command(s) without restarting the bot.',
  usage: '<cmd>',
  aliases: [],
};

const config = require('../../config');
const logger = require('winston');
const utils = require('../utilities');
// const twitter = require('../twitter')();
// TODO

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Reloading commands should be restricted to the bot owner
  if (msg.author.id !== config.owner_id) {
    return reject('Not authorized');
  }
  // Exit if no command was passed to load/reload
  if (params.length === 0) {
    logger.debug('No parameters were passed to reload');
    msg.reply(`\`\`${msg.prefix}reload <commandName | all>\`\``);
    return resolve();
  }
  // All parameters to lowercase
  params.forEach(x => x.toLowerCase());
  if (params[0] === 'all') {
    logger.debug('reloading all commands');
    utils.loadAllCommands(client)
      .then(() => {
        msg.reply(`${client.commands.size} command${client.commands.size === 1 ? '' : 's'} ` +
          `have been loaded successfully.`);
        return resolve();
      }).catch(reject);
    return null;
  }

  /*if (params[0] === 'twitterclient') {
   msg.reply(`Twitter Client reset.`);
   logger.debug('Manually resetting twitter client');
   twitter.reset(client);
   utils.finish(msg, exports.name);
   return;
   }*/

  utils.loadOneCommand(client, params[0])
    .then(() => {
      msg.reply(`Command **${params[0]}** loaded successfully`);
      return resolve();
    }).catch(reject);
  return null;
});
