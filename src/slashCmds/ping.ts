import Discord from 'discord.js'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'ping',
  description: 'Get latency and heartbeat.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const msg = (await interaction.reply({
    content: 'Ping...',
    fetchReply: true,
  })) as Discord.Message

  const diff = msg.createdTimestamp - interaction.createdTimestamp
  await interaction.editReply(
    `Roundtrip Latency: ${diff}ms\nDiscord Heartbeat: ${interaction.client.ws.ping}ms`,
  )
}
