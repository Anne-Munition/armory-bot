const pmx = require('pmx').init({
  http: true,
  ignore_routes: [/socket\.io/],
  errors: true,
  custom_probes: true,
  network: true,
  ports: true,
});

const logger = require('./logger')();
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const notify = require('./notify');
const now = require('performance-now');
const perms = require('./permissions')();
const subGames = require('./subGames');
require('./memoryUsage');

logger.info('Starting Bot: PID:', process.pid);

// Create the Discord Client
const client = new Discord.Client({
  disableEveryone: true,
  disabledEvents: [
    'TYPING_START',
  ],
});

// Extent the client object
// circular Discord object for RichEmbeds
client.Discord = Discord;
client.config = require('../config');
client.utils = require('./utilities');
client.logger = logger;

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
  prefix: client.config.prefix,
};

// Create property to count items
client.count = {
  messages: 0,
  commands: 0,
  twitch: 0,
};

// Instantiate other modules into the client object
client.mongo = require('./mongo')(client);
client.twitch = require('./twitch')(client);

// A list of twitch channels that are waiting to sync with twitchClient
client.twitch.waiting = [];

client.utils.loadAllCommands(client)
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

// Discord general warning
client.on('warn', info => {
  logger.warn('Discord warning', info);
});

// Discord is reconnecting
client.on('reconnecting', () => {
  logger.info('Discord reconnecting');
});

// Discord has resumed
client.on('resumed', replayed => {
  logger.info(`Discord has resumed, replayed ${replayed} item(s)`);
});

// Discord has erred
client.on('error', err => {
  logger.error('Discord client error:', err ? err.stack : '');
});

client.on('ready', () => {
  logger.info(`Successful connection to Discord as '${client.user.username}'`);
});

// Run only on once on script launch
client.once('ready', () => {
  // If this bot is not DBKynd's test Bot...
  if (client.user.id !== '120105547633524736') {
    // Send the Owner a message that the Bot has started, indicates a crash or restart
    const owner = client.users.get(client.config.owner_id);
    if (owner) {
      owner.send(`I just started running. Did I crash? :worried:\nPID:\`\`${process.pid}\`\``);
    }
  }
  // Start the Twitch and Twitter Clients
  client.twitch.start();
  // Websocket client to post Twitch bans from AnneMunition's channel
  require('./twitchMessages')(client);
  // Timers
  require('./timers')(client);
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

// A message has been deleted
client.on('messageDelete', message => {
  notify.messageDeleted(client, message);
});

// A message has been updated / edited
client.on('messageUpdate', (oldMessage, newMessage) => {
  notify.messageUpdated(client, oldMessage, newMessage);
});

// Received a message from a discord chat
client.on('message', msg => {
  // Don't listen to other Bots
  if (msg.author.bot) return;
  // Save time of message start process
  msg.startTime = now();
  // Increment the message count
  client.count.messages++;
  // Check for and run any prefixed commands
  prefixedCommands(msg);

  // Do other stuff with messages below...

  // AnneMunition Schedule Auto Pinning
  schedulePinning(msg);
});

async function schedulePinning(msg) {
  // If the message occurred in the #tweets channel
  // 140025699867164673 Test
  // 362349719663542272 #tweets
  if (msg.channel.id === '140025699867164673') {
    // If the new message has the correct terms
    if (contentHasScheduleTerms(msg)) {
      // Get all the pinned messages
      const pinnedMessages = await msg.channel.fetchPinnedMessages();
      // Sort for messages that has the correct terms
      if (pinnedMessages) pinnedMessages.filter(x => contentHasScheduleTerms(x)).forEach(x => x.unpin());
      // Remove all pinned messages that meet the criteria
      // Pin the current message
      await msg.pin();
      // Find the Latest message that was a PINS_ADD
      const newestMessages = await msg.channel.fetchMessages({ after: msg.id });
      if (newestMessages) newestMessages.filter(x => x.type === 'PINS_ADD').forEach(x => x.delete());
    }
  }
}

function contentHasScheduleTerms(msg) {
  const content = msg.content.toLowerCase();
  return content.includes('schedule') && content.includes('mon') && content.includes('fri');
}

client.on('voiceStateUpdate', (oldMember, newMember) => {
  subGames().voiceStateUpdate(client, oldMember, newMember);
});

// Connect to Discord
logger.debug('Connecting to Discord...');
client.login(client.config.bot_token).catch(logger.error);

setInterval(() => {
  // Ensure we are logged every 5 minutes
  // Relog if the client is not in good status
  if (client.status !== 0) relog();
}, 1000 * 60 * 5);

async function relog() {
  logger.info('Re-logging to Discord');
  try {
    await client.destroy();
    client.login(client.config.bot_token);
  } catch (e) {
    logger.error(e);
  }
  return null;
}

function prefixedCommands(msg) {
  // Get the default guild config
  let conf = client.defaultGuildConfig;
  if (msg.channel.type === 'text') {
    // Get stored guild config if exists and not a dm channel
    if (client.guildConfigs.has(msg.guild.id)) {
      conf = client.guildConfigs.get(msg.guild.id);
    }
    // Exit if message doesn't use the guild prefix
    if (!msg.content.startsWith(conf.prefix)) return;
  } else if (msg.channel.type === 'dm') {
    // If a dm channel, ability to use a prefix from any of the setprefixs from all connected guilds
    if (!msg.content.startsWith(conf.prefix)) {
      // See if the prefix matches any stored from any guild ArmoryBot is in
      const anyConfig = client.guildConfigs.find(x => msg.content.startsWith(x.prefix));
      if (!anyConfig) return;
      // Store the prefix the DM user used
      conf.prefix = anyConfig.prefix;
    }
  }
  // Save the prefix used on this message so we can use it to build guild specific help commands
  msg.prefix = conf.prefix;
  // Split message into an array on any number of spaces
  const params = msg.content.split(/ +/g);
  // Pull first index and remove prefix
  const cmd = params.shift().slice(conf.prefix.length).toLowerCase();
  // Exit if no command was given (prefix only)
  if (!cmd) return;
  logger.debug('Command:', cmd, JSON.stringify(params));
  // Attempt to get command from Collection
  let command;
  if (client.commands.has(cmd)) {
    command = client.commands.get(cmd);
  } else if (client.aliases.has(cmd)) {
    command = client.aliases.get(cmd);
  }
  if (!command || !command.run || typeof command.run !== 'function') {
    logger.debug(`The cmd '${cmd}' does not exist, is not loaded, or is missing the 'run' function`);
    return;
  }
  // Store command name to the message object
  msg.cmd = cmd;
  // Log the command usage
  if (msg.channel.type === 'dm') {
    logger.info(`[DM] <${msg.author.tag}>: ${msg.content}`);
  } else {
    logger.info(`[${msg.guild.name}] (#${msg.channel.name}) ` +
      `<${msg.author.tag}>: ${msg.content}`);
  }
  logger.debug('Command Required Permissions:', command.info.permissions);
  // Ensure the bot client has every permissions required to run this command on Discord's end
  if (msg.channel.type === 'text' && command.info.permissions &&
    !msg.channel.permissionsFor(client.user).has(command.info.permissions)) {
    client.utils.ownerError('Permission Requirement', client, null, msg, cmd);
    logger.error('We do not have the required permissions in this channel to execute the command to completion.');
    return;
  }
  const allowed = perms.check(client, msg, cmd);
  if (allowed) {
    logger.info(`ALLOWED '${msg.author.username}' ${cmd}' in channel ` +
      `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
    // Increment the commands counter
    client.count.commands++;
    // Attempt to run the command
    command.run(client, msg, params)
      .then(() => {
        // If the command completes OK run cleanup tasks
        logger.info(`${cmd} finished in: ${(now() - msg.startTime).toFixed(3)}ms`);
      })
      .catch(err => {
        // If the command fails for some reason, message the bot owner about it
        client.utils.ownerError('Command', client, err, msg, cmd);
      });
  } else {
    logger.info(`DENIED '${msg.author.username}' ${cmd}' in channel ` +
      `'${msg.channel.type === 'dm' ? 'DM' : msg.channel.name}'`);
    msg.reply('You do not have permission to run this command here.');
  }
}

// Message the bot owner on any unhandled errors
process.on('unhandledRejection', err => {
  client.utils.ownerError('Unhandled', client, err);
});

// Message the bot owner on any uncaught errors
process.on('uncaughtException', err => {
  client.utils.ownerError('Uncaught', client, err);
});
