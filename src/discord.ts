import { Client, GatewayIntentBits, Partials } from 'discord.js';
import interactionHandler from './interactions/interaction_handler.js';
import interactionLoader from './interactions/interaction_loader.js';
import log from './logger.js';
import auditor from './messages/message_auditor.js';
import messageHandler from './messages/message_handler.js';
import notify from './notifications.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

/***** GENERAL EVENTS *****/

// Emitted for general warnings
client.on('warn', (info) => {
  log.warn(`Discord warning: ${info}`);
});

// Emitted when the client encounters an error.
client.on('error', (err) => {
  log.error(`Discord client error: ${err ? err.stack : ''}`);
});

// Emitted when the client's session becomes invalidated. You are expected to handle closing the process gracefully and preventing a boot loop if you are listening to this event.
client.on('invalidated', () => {
  // TODO
});

/***** GUILD EVENTS *****/

// Emitted whenever the client joins a guild.
client.on('guildCreate', notify.guildCreate);

// Emitted whenever a guild kicks the client or the guild is deleted/left.
client.on('guildDelete', notify.guildDelete);

// Emitted whenever a user joins a guild.
client.on('guildMemberAdd', notify.guildMemberAdd);

// Emitted whenever a member leaves a guild, or is kicked.
client.on('guildMemberRemove', notify.guildMemberRemove);

// Emitted whenever a member is banned from a guild.
client.on('guildBanAdd', notify.guildBanAdd);

// Emitted whenever a member is unbanned from a guild.
client.on('guildBanRemove', notify.guildBanRemove);

/***** MESSAGE EVENTS *****/

// Emitted whenever a message is created.
client.on('messageCreate', messageHandler);

// Emitted whenever a message is deleted.
client.on('messageDelete', (msg) => {
  auditor.messageDelete(msg).catch(() => {
    // Do Nothing
  });
});

// Emitted whenever a message is updated - e.g. embed or content change.
client.on('messageUpdate', (prev, next) => {
  auditor.messageUpdate(prev, next);
});

/***** INTERACTION EVENTS *****/

client.on('interactionCreate', interactionHandler);

export async function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info('Connecting to Discord...');
    client.login(process.env.BOT_TOKEN);
    const timer = setTimeout(() => {
      reject(new Error('Took longer than 60 seconds to connect to Discord.'));
    }, 1000 * 60);
    client.once('ready', async () => {
      clearTimeout(timer);
      log.info(`Connected to Discord as '${client?.user?.tag}'`);

      // Fetch all members from all guilds so we are aware of guild member parts after a bot restart

      for (const guild of client.guilds.cache) {
        await guild[1].members.fetch();
        await guild[1].channels.fetch();
      }
      await interactionLoader(client);
      resolve();
    });
  });
}

export function disconnect(): void {
  client.destroy();
  log.info('Closed the Discord connection.');
}

export default client;
