import Discord, { Intents } from 'discord.js'
import log from './logger'
import messageHandler from './messages/message_handler'
import notify from './notifications'

const client = new Discord.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  allowedMentions: {
    roles: [],
    repliedUser: true,
  },
  partials: ['CHANNEL'],
})

/***** GENERAL EVENTS *****/

// Emitted for general warnings
client.on('warn', (info) => {
  log.warn(`Discord warning: ${info}`)
})

// Emitted when the client encounters an error.
client.on('error', (err) => {
  log.error(`Discord client error: ${err ? err.stack : ''}`)
})

// Emitted when the client's session becomes invalidated. You are expected to handle closing the process gracefully and preventing a boot loop if you are listening to this event.
client.on('invalidated', () => {
  // TODO
})

/***** GUILD EVENTS *****/

// Emitted whenever the client joins a guild.
client.on('guildCreate', notify.guildCreate)

// Emitted whenever a guild kicks the client or the guild is deleted/left.
client.on('guildDelete', notify.guildDelete)

// Emitted whenever a user joins a guild.
client.on('guildMemberAdd', notify.guildMemberAdd)

// Emitted whenever a member leaves a guild, or is kicked.
client.on('guildMemberRemove', notify.guildMemberRemove)

// Emitted whenever a member is banned from a guild.
client.on('guildBanAdd', notify.guildBanAdd)

// Emitted whenever a member is unbanned from a guild.
client.on('guildBanRemove', notify.guildBanRemove)

// Emitted whenever a thread is created or when the client user is added to a thread.
client.on('threadCreate', notify.threadCreate)

/***** MESSAGE EVENTS *****/

// Emitted whenever a message is created.
client.on('messageCreate', messageHandler)

// Emitted whenever a message is deleted.
client.on('messageDelete', (msg) => {
  // TODO
})

// Emitted whenever a message is updated - e.g. embed or content change.
client.on('messageUpdate', (msg) => {
  // TODO
})

client.once('ready', () => {})

export async function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info('Connecting to Discord...')
    client.login(process.env.BOT_TOKEN)
    const timer = setTimeout(() => {
      reject(new Error('Took longer than 60 seconds to connect to Discord.'))
    }, 1000 * 60)
    client.once('ready', () => {
      clearTimeout(timer)
      log.info(`Connected to Discord as '${client?.user?.tag}'`)
      resolve()
    })
  })
}

export function disconnect(): void {
  client.destroy()
}

export default client
