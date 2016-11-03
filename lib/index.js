const config = require('../config');
const logger = require('winston');
const Discord = require('discord.js');
const perms = require('./permissions');
const now = require('performance-now');
const fs = require('fs');
const path = require('path');
require('./memoryUsage');

logger.info('Starting Bot: PID:', process.pid);

// Create the Discord Client
const client = new Discord.Client({
  fetchAllMembers: true,
  disableEveryone: true,
});

// Extent the client object
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.guildConfigs = new Map();
client.commandPermissions = new Map();
client.mongo = require('./mongo')(client);
client.assetsDir = path.join(process.cwd(), 'assets');
client.tempDir = path.join(process.cwd(), 'temp');
client.commandsDir = path.join(process.cwd(), 'lib/cmds');

// Create property to count items
client.count = {
  messages: 0,
  commands: 0,
  tweets: 0,
};

// Default Guild Config if one doesn't exist in mongo
client.defaultGuildConfig = {
  prefix: config.prefix,
};

// Create a temp directory if one doesn't not exist on startup
if (!fs.existsSync(client.tempDir)) {
  fs.mkdirSync(client.tempDir);
}

client.loadOneCommand = require('./loadOneCommand');
client.loadAllCommands = require('./loadAllCommands');
client.loadAllCommands(client)
  .then(() => {
    logger.info(`Loaded ${client.commands.size} command${client.commands.size === 1 ? '' : 's'}, ` +
      `with ${client.aliases.size} aliases.`);
  })
  .catch(err => {
    logger.error('Error loading commands', err);
  });

let firstConnection = true;
client.on('ready', () => {
  logger.info(`Successful connection to Discord as '${client.user.username}'`);
  // Only on initial ready event, send a startup message to owner
  if (firstConnection) {
    firstConnection = false;
    // If this bot is not DBKynd's test Bot...
    if (client.user.id !== '120105547633524736') {
      // Send the Owner a message that the Bot has started, usually indicates a crash
      client.users.get(config.owner_id)
        .sendMessage(`I just started running. Did I crash? :worried:\nPID:\`\`${process.pid}\`\``);
    }
  }
});

// The bot has joined a guild, notify the owner
client.on('guildCreate', guild => {
  const str = `${client.user.username} joined Discord guild: '${guild.name}' ` +
    `- Owner: '${guild.owner.user.username} #${guild.owner.user.discriminator}'`;
  logger.info(str);
  // Get the owner's user object
  const user = client.users.get(config.owner_id);
  if (user) {
    user.sendMessage(str);
  }
});

// The client has left a guild, notify the owner
client.on('guildDelete', guild => {
  const str = `${client.user.username} parted Discord guild: '${guild.name}' ` +
    `-  Owner: '${guild.owner.user.username} #${guild.owner.user.discriminator}'`;
  logger.info(str);
  // Get the owner's user object
  const user = client.users.get(config.owner_id);
  if (user) {
    user.sendMessage(str);
  }
});

// A new member has joined a connected server
client.on('guildMemberAdd', member => {
  // Get list of welcome channels with same server_id
  logger.debug('A member joined the server');
  client.mongo.welcomeChannels.find({ server_id: member.guild.id })
    .then(channels => {
      // Post welcome message to each channel found
      logger.debug(`Posting welcome messages in (${channels.length}) registered channels`);
      channels.forEach(c => {
        // Resolve the channel
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` has just joined the Discord Server!`);
        }
      });
    })
    .catch(err => {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    });
});

// A member has left/kick/ban from a connected server
client.on('guildMemberRemove', member => {
  // Get list of welcome channels with same server_id
  logger.debug('A member left/kick/ban from the server');
  client.mongo.welcomeChannels.find({ server_id: member.guild.id })
    .then(channels => {
      // Post farewell message to each channel found
      channels.forEach(c => {
        // Resolve the channel
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` was removed from the Discord Server.`);
        }
      });
    })
    .catch(err => {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    });
});

// Discord was disconnected
client.on('reconnecting', () => {
  logger.warn('Discord disconnected, attempting to reconnect');
});

// Log any Discord Errors
client.on('error', err => {
  logger.error('Discord client error:', err);
});

client.on('message', msg => {
  // Save time of message start process
  msg.time = {
    start: now(),
    cpu: 0,
    io: 0,
  };
  client.count.messages++;
  // Don't listen to other Bots
  if (msg.author.bot) {
    return;
  }
  // Check and run any prefixed commands
  prefixedCommands(msg);
});

// Connect to Discord after event handlers have been defined
logger.debug('Connecting to Discord...');
client.login(config.bot_token);

function prefixedCommands(msg) {
  let conf = client.defaultGuildConfig;
  // Get any stored guild config
  if (msg.channel.type === 'text' && client.guildConfigs.has(msg.guild.id)) {
    conf = client.guildConfigs.get(msg.guild.id);
  }
  // Exit if message doesn't use the guild prefix
  if (!msg.content.startsWith(conf.prefix)) {
    return;
  }
  // Split message into an array
  const params = msg.content.split(' ');
  // Pull first index and remove prefix
  const cmd = params.shift().slice(conf.prefix.length).toLowerCase();
  // Exit if no command was given (prefix only)
  if (!cmd) {
    return;
  }
  // Save the prefix used on this message (guild) so we can use it to build guild specific help commands
  msg.prefix = conf.prefix;
  logger.debug('Command:', cmd, JSON.stringify(params));
  // Attempt to get command from Collection
  let command;
  if (client.commands.has(cmd)) {
    command = client.commands.get(cmd);
  } else if (client.aliases.has(cmd)) {
    command = client.aliases.get(cmd);
  }
  // Run the command if it exists and has a run function
  if (command && command.run && typeof command.run === 'function') {
    if (msg.channel.type === 'dm') {
      logger.info(`[DM] <${msg.author.username}#${msg.author.discriminator}>: ${msg.content}`);
    } else {
      logger.info(`[${msg.guild.name}] (#${msg.channel.name}) ` +
        `<${msg.author.username}#${msg.author.discriminator}>: ${msg.content}`);
    }
    // Check command permissions
    perms(client, msg, cmd, params)
      .then(() => {
        logger.info(`ALLOWED '${msg.author.username}' ${cmd}' in channel ` +
          `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
        client.count.commands++;
        command.run(client, msg, params);
      })
      .catch(() => {
        logger.info(`DENIED '${msg.author.username}' ${cmd}' in channel ` +
          `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
      });
  } else {
    logger.debug(`The cmd '${cmd}' does not exist, is not loaded, or is missing the function 'run'`);
  }
}
