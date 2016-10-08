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
        let cmd = require(path.join(cmdsPath, f));
        logger.debug(`Adding command '${cmd.info.name}'`);
        commands.set(cmd.info.name, cmd);
      });
    }
  });

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

  /*
   discord.on('guildMemberAdd', (guild, member) => { //A new member has joined a connected server
   mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => { //Get list of welcome channels with same server_id
   if (err) return utils.log(JSON.stringify(err));
   for (let i = 0; i < channels.length; i++) {
   if (!guild.available) continue;
   let channel = guild.channels.find('id', channels[i].channel_id); //Attempt to resolve the channel
   if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
   channel.sendMessage("**" + member.user.username + "** #" + member.user.discriminator + " has just joined the Discord Server!"); //Post welcome message to each channel found
   }
   });
   });

   discord.on('guildMemberRemove', (guild, member) => { //A member has left/kick/ban from a connected server
   mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => { //Get list of welcome channels with same server_id
   if (err) return utils.log(JSON.stringify(err));
   for (let i = 0; i < channels.length; i++) {
   if (!guild.available) continue;
   let channel = guild.channels.find('id', channels[i].channel_id); //Attempt to resolve the channel
   if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
   channel.sendMessage("**" + member.user.username + "** #" + member.user.discriminator + " was removed from the Discord Server."); //Post welcome message to each channel found
   }
   });
   });
   */
  return {
    cmds: commands,
    // client: discord
  };
};
