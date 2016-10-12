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

  let first = true;
  const cmdsPath = path.join(process.cwd(), 'lib/cmds');

  logger.debug('Loading commands into memory');
  fs.readdir(cmdsPath, (err, files) => {
    if (err) {
      logger.error('Error reading commands directory:', err);
    } else {
      logger.info(`Loading ${files.length} command(s).`);
      files.forEach(f => {
        const cmdPath = path.join(cmdsPath, f);
        logger.debug(cmdPath);
        const cmd = require(cmdPath);
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
    if (first) {
      first = false;
      if (discord.user.id !== '120105547633524736') {
        discord.users.get('84770528526602240')
          .sendMessage(`I just started running. Did I crash? :worried:\nPID:\`\`${process.pid}\`\``);
      }
    }
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
