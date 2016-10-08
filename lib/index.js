'use strict';
const config = require('../config');
const logger = require('./logger')();
const fs = require('fs');
const path = require('path');
const mongo = require('./mongo')();
const discord = require('./discord')();
const perms = require('./permissions')();
require('./perf');

logger.info('Starting ArmoryBot: PID:', process.pid);

// Create a temp folder if it does not exist
config.tempPath = path.join(__dirname, '../temp');
if (!fs.existsSync(config.tempPath)) {
  logger.debug('Creating temp directory');
  fs.mkdirSync(config.tempPath);
}

// A new member has joined a connected server
discord.client.on('guildMemberAdd', (guild, member) => {
  // Get list of welcome channels with same server_id
  logger.debug('A member joined the server');
  mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => {
    if (err) {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    } else {
      // Post welcome message to each channel found
      logger.debug('Posting welcome messages in registered channels');
      channels.forEach(c => {
        // Resolve the channel
        const channel = guild.channels.find('id', c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` has just joined the Discord Server!`);
        }
      });
    }
  });
});

// A member has left/kick/ban from a connected server
discord.client.on('guildMemberRemove', (guild, member) => {
  // Get list of welcome channels with same server_id
  logger.debug('A member left/kick/ban from the server');
  mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => {
    if (err) {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    } else {
      // Post farewell message to each channel found
      channels.forEach(c => {
        // Resolve the channel
        let channel = guild.channels.find('id', c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` was removed from the Discord Server.`);
        }
      });
    }
  });
});

discord.client.on('message', msg => {
  prefixCommands(msg);
});

function prefixCommands(msg) {
  // Exit if message doesn't use our prefix
  if (!msg.content.startsWith(config.commands.prefix)) {
    return;
  }
  // Split message into an array
  const params = msg.content.split(' ');
  // Pull first index and remove prefix
  const cmd = params.shift().slice(config.commands.prefix.length);
  // Exit if no command was given (prefix only)
  if (!cmd) {
    return;
  }
  logger.debug(cmd, JSON.stringify(params));
  // Attempt to get command from Collection
  const command = discord.cmds.get(cmd);
  // Run the command if it exists
  if (command) {
    // Check command permissions against database
    logger.debug(`Checking permissions for command '${cmd}'`);
    perms.check(msg.channel.id, cmd)
      .then((allowed) => {
        if (allowed) {
          logger.debug(`Running cmd '${cmd}'`);
          command.run(discord.client, msg, params, mongo);
        } else {
          logger.debug(`'${msg.author.username}' does not have perms to run '${cmd}' in channel '${msg.channel.name}'`);
        }
      })
      .catch(err => {
        logger.error('Unable to get permissions from mongoDB', msg.channel.id, cmd, err);
      });
  } else {
    logger.debug(`The cmd '${cmd}' does not exist or is not loaded.`);
  }
}
