'use strict';
exports.info = {
  desc: 'Set a custom prefix for commands in this guild.',
  usage: '<prefix>',
  aliases: [],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  if (msg.author.id !== client.config.owner_id && msg.author.id !== msg.guild.owner.id) return;
  // Exit if not run un a text channel where there is a guild
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  // Exit if nothing passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Get any existing configs
  let conf = client.defaultGuildConfig;
  if (client.guildConfigs.has(msg.guild.id)) {
    conf = client.guildConfigs.get(msg.guild.id);
  }
  // Store new prefix in memory
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
      client.logger.debug(`Saved setPrefix ${conf.prefix} for guild ${msg.guild.name}`);
      msg.reply(`you have changed the prefix of all commands on this server to: \`\`${conf.prefix}\`\``)
        .then(resolve).catch(reject);
    })
    .catch(err => {
      client.logger.error(`There was an error saving setPrefix ${conf.prefix} for guild ${msg.guild.name}`, err);
      msg.channel.sendMessage('There was a database error, please try again.');
      reject(err);
    });
});
