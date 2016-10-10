'use strict';
const config = require('../config');
const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs');
const path = require('path');

module.exports = function DiscordClient() {
  logger.debug('Loading Discord Module');
  // Instantiate a new Discord Client
  const discord = new Discord.Client();
  // Create a collection for all of our commands
  const commands = new Discord.Collection();

  const cmdsPath = path.join(__dirname, './cmds/');
  logger.debug('Loading commands into memory');
  fs.readdir(cmdsPath, (err, files) => {
    if (err) {
      logger.error('Error reading commands directory:', err);
    } else {
      logger.info(`Loading ${files.length} command(s).`);
      files.forEach(f => {
        const cmd = require(path.join(cmdsPath, f));
        // Don't load the command if it does not have a run function
        if (cmd.run && typeof cmd.run === 'function' && cmd.info) {
          logger.debug(`Adding command '${cmd.info.name}'`);
          commands.set(cmd.info.name, cmd);
        } else {
          logger.debug(`Skipping command '${cmd.info.name}' - Missing run function`);
        }
      });
    }
  });

  // Create property to count items
  discord.count = {
    messages: 0,
    commands: 0,
    tweets: 0,
  };

  // The discord client has connected
  discord.on('ready', () => {
    logger.info(`Successful connection to Discord as '${discord.user.username}'`);
  });

  // The bot has joined a guild
  discord.on('guildCreate', (guild) => {
    logger.info(`${discord.user.username} joined Discord guild: '${guild.name}' ` +
      `- Owner: '${guild.owner.user.username} #${guild.owner.user.discriminator}'`);
  });

  // The client has left a guild
  discord.on('guildDelete', (guild) => {
    logger.info(`${discord.user.username} parted Discord guild: '${guild.name}' ` +
      `-  Owner: '${guild.owner.user.username} #${guild.owner.user.discriminator}'`);
  });

  // Discord was disconnected
  discord.on('reconnecting', () => {
    logger.warn('Discord disconnected, attempting to reconnect');
  });

  // Log any Discord Errors
  discord.on('error', err => {
    logger.error('Discord error:', err);
  });

  logger.debug('Connecting to Discord...');
  discord.login(config.bot_token);

  return {
    client: discord,
    cmds: commands,
  };
};
