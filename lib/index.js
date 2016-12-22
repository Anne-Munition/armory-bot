const logger = require('winston');
const Discord = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const notify = require('./notify');
const now = require('performance-now');
const perms = require('./permissions')();
const utils = require('./utilities');
require('./memoryUsage');

logger.info('Starting Bot: PID:', process.pid);

// Create the Discord Client
const client = new Discord.Client({
  fetchAllMembers: true,
  disableEveryone: true,
  disabledEvents: [
    'TYPING_START',
  ],
});

// Extent the client object
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.guildConfigs = new Discord.Collection();
client.commandPerms = new Discord.Collection();

// Shortcuts to different file paths
client.tempDir = path.join(process.cwd(), 'temp');
client.assetsDir = path.join(process.cwd(), 'assets');
client.commandsDir = path.join(process.cwd(), 'lib/cmds');

// Default Guild Config
client.defaultGuildConfig = {
  prefix: config.prefix,
};

// Create property to count items
client.count = {
  messages: 0,
  commands: 0,
  tweets: 0, // TODO: count this property when we add twitter back in
};

// Instantiate other modules into the client object
client.mongo = require('./mongo')(client);
client.twitch = require('./twitch')(client);
client.twitter = require('./twitter')(client);

client.twitch.waiting = [];
client.twitch.count = { users: 0, channels: 0 };
client.twitter.mentions = [];

utils.loadAllCommands(client)
  .then(() => {
    logger.info(`Loaded ${client.commands.size} command${client.commands.size === 1 ? '' : 's'}, ` +
      `with ${client.aliases.size} aliases.`);
  })
  .catch(err => {
    logger.error('Error loading commands', err);
  });

// Create a temp directory if one doesn't not exist on startup
if (!fs.existsSync(client.tempDir)) fs.mkdirSync(client.tempDir);

// Discord has disconnected
client.on('disconnect', () => {
  logger.warn('Discord disconnected');
});

// Discord is reconnecting
client.on('reconnecting', () => {
  logger.info('Discord reconnecting');
});

// Discord has erred
client.on('error', err => {
  logger.error('Discord client error:', err ? err.stack : '');
});

let firstConnection = true;
client.on('ready', () => {
  logger.info(`Successful connection to Discord as '${client.user.username}'`);
  // Only on initial ready event, send a startup message to owner
  if (firstConnection) {
    firstConnection = false;
    // If this bot is not my test Bot...
    if (client.user.id !== '120105547633524736') {
      // Send the Owner a message that the Bot has started, indicates a crash or restart
      const owner = client.users.get(config.owner_id);
      if (owner) {
        owner.sendMessage(`I just started running. Did I crash? :worried:\nPID:\`\`${process.pid}\`\``);
      }
    }
    client.twitch.start();
  }
});

// The bot has joined a guild, notify the owner
client.on('guildCreate', guild => {
  notify.guildCreate(client, guild);
});

// The client has left a guild, notify the owner
client.on('guildDelete', guild => {
  notify.guildDelete(client, guild);
});

// A new member has joined a connected server
client.on('guildMemberAdd', member => {
  notify.guildMemberAdd(client, member);
});

// A member has left/kick/ban from a connected server
client.on('guildMemberRemove', member => {
  notify.guildMemberRemove(client, member);
});

// Received a message from a discord chat
client.on('message', msg => {
  // Save time of message start process
  msg.startTime = now();
  // Increment the message count if the message was not from self
  if (msg.author.id !== client.user.id) client.count.messages++;
  // Don't listen to other Bots
  if (msg.author.bot) return;
  // Check for and run any prefixed commands
  prefixedCommands(msg);
  // Do other stuff with messages...
});

// Connect to Discord
logger.debug('Connecting to Discord...');
client.login(config.bot_token).catch(logger.error);

setInterval(() => {
  // Ensure we are logged every 5 minutes
  // Exit if the client is in good status
  if (client.status !== 0) relog();
}, 1000 * 60 * 5);

async function relog() {
  logger.info('Re-logging to Discord');
  try {
    await client.destroy();
    client.login(config.bot_token);
  } catch (e) {
    logger.error(e);
  }
  return null;
}

async function prefixedCommands(msg) {
  let conf = client.defaultGuildConfig;
  // Get stored guild config if exists and not a dm channel
  if (msg.channel.type !== 'dm' && client.guildConfigs.has(msg.guild.id)) {
    conf = client.guildConfigs.get(msg.guild.id);
  }
  // Exit if message doesn't use the guild prefix
  if (!msg.content.startsWith(conf.prefix)) return null;
  // Save the prefix used on this message so we can use it to build guild specific help commands
  // Split message into an array
  const params = msg.content.split(' ');
  // Pull first index and remove prefix
  const cmd = params.shift().slice(config.prefix.length).toLowerCase();
  // Exit if no command was given (prefix only)
  if (!cmd) return null;
  logger.debug('Command:', cmd, JSON.stringify(params));
  // Attempt to get command from Collection
  let command;
  if (client.commands.has(cmd)) {
    command = client.commands.get(cmd);
  } else if (client.aliases.has(cmd)) {
    command = client.aliases.get(cmd);
  }
  if (!command || !command.run || typeof command.run !== 'function') {
    logger.debug(`The cmd '${cmd}' does not exist, is not loaded, or is missing the function 'run'`);
    return null;
  }
  // Log the command usage
  if (msg.channel.type === 'dm') {
    logger.info(`[DM] <${msg.author.username}#${msg.author.discriminator}>: ${msg.content}`);
  } else {
    logger.info(`[${msg.guild.name}] (#${msg.channel.name}) ` +
      `<${msg.author.username}#${msg.author.discriminator}>: ${msg.content}`);
  }
  const allowed = perms.check(client, msg, cmd);
  if (allowed) {
    logger.info(`ALLOWED '${msg.author.username}' ${cmd}' in channel ` +
      `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
    client.count.commands++;
    msg.prefix = conf.prefix;
    msg.cmd = cmd;
    command.run(client, msg, params)
      .then(() => {
        utils.finish(msg, cmd);
      })
      .catch(err => {
        logger.error(`Error executing command '${cmd}'`, err);
        utils.ownerError(client, err, msg, cmd);
      });
  } else {
    logger.info(`DENIED '${msg.author.username}' ${cmd}' in channel ` +
      `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
    msg.reply('You do not have permission to run this command here.');
  }
  return null;
}
