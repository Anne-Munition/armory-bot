'use strict';
exports.info = {
  desc: 'Set a custom prefix for commands in this guild.',
  usage: '<prefix>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');

exports.run = (client, msg, params = []) => new Promise(resolve => {
  // Exit if not run un a text channel where there is a guild
  if (msg.channel.type !== 'text') {
    logger.debug('Not in text channel');
    msg.reply(`Unable to use the **setprefix** command from DM channels.`);
    return resolve();
  }
  // Exit if nothing passed
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  // Get any existing configs
  let conf = client.defaultGuildConfig;
  if (client.guildConfigs.has(msg.guild.id)) {
    conf = client.guildConfigs.get(msg.guild.id);
  }
  // Store new prefix locally
  conf.prefix = params[0];
  client.guildConfigs.set(msg.guild.id, conf);
  // Create mongo entry
  const data = {
    server_id: msg.guild.id,
    config: conf,
  };
  // Store prefix to mongo db
  client.mongo.guildConfigs.update({ server_id: msg.guild.id }, data, { upsert: true })
    .then(() => {
      logger.debug(`Saved setPrefix ${conf.prefix} for guild ${msg.guild.name}`);
      msg.reply(`you have changed the prefix of all commands on this server to: \`\`${conf.prefix}\`\``);
    })
    .catch(err => {
      logger.error(`There was an error saving setPrefix ${conf.prefix} for guild ${msg.guild.name}`, err);
      msg.reply(`there was an error changing the command prefix. Please try again.`);
    });
  return resolve();
});
