import { CommandInteraction, Interaction } from 'discord.js'

export default async function (interaction: Interaction): Promise<void> {
  if (interaction.isCommand()) await command(interaction)
}

async function command(interaction: CommandInteraction): Promise<void> {
  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!')
  }
}
