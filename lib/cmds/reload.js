'use strict';
exports.info = {
  desc: 'Reload command(s) without restarting the bot.',
  usage: '<cmd>',
  aliases: [],
};

const config = require('../../config');
const path = require('path');
const logger = require('winston');
const utils = require('../utilities');

exports.run = (client, msg, params = []) => {
  // Reloading commands should be restricted to the bot owner
  if (msg.author.id !== config.owner_id) {
    return;
  }
  // Exit if no command was passed to load/reload
  if (params.length === 0) {
    logger.debug('No parameters were passed to reload');
    return;
  }
  // All parameters to lowercase
  params.forEach(x => x.toLowerCase());
  if (params[0] === 'all') {
    logger.debug('reloading all commands');
    client.loadAllCommands(client)
      .then(() => {
        msg.reply(`${client.commands.size} command${client.commands.size === 1 ? '' : 's'} ` +
          `have been loaded successfully.`);
        utils.finish(client, msg, exports.name);
      })
      .catch(err => {
        logger.error(err);
        msg.reply(`Error loading all commands.\n\`\`\`${err.message}\`\`\``);
        utils.finish(client, msg, exports.name);
      });
    return;
  }

  const cmdPath = path.join(process.cwd(), 'lib/cmds', `${params[0]}.js`);
  client.loadOneCommand(client, cmdPath)
    .then(() => {
      msg.reply(`Command **${params[0]}** loaded successfully`);
      utils.finish(client, msg, exports.name);
    })
    .catch(err => {
      logger.error(err);
      msg.reply(`Error loading command **${params[0]}**\n\`\`\`${err.message}\`\`\``);
      utils.finish(client, msg, exports.name);
    });
};
