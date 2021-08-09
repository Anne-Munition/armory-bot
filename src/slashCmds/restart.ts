import { Snowflake } from 'discord.js'
import * as app from '../app'

export const info: SlashInfo = {
  global: false,
  guilds: ['140025699867164673'],
}

export const permissions: SlashPerms = [
  {
    id: <Snowflake>process.env.OWNER_ID,
    type: 'USER',
    permission: true,
  },
]

export const commandData: SlashData = {
  name: 'restart',
  description: 'Restart the bot client.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  if (interaction.user.id !== process.env.OWNER_ID) return
  await interaction.reply({ content: ':ok_hand:', ephemeral: true })
  app.stop().finally(() => {
    process.exit(0)
  })
}
