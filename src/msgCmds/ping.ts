import Discord from 'discord.js'

export const info: CmdInfo = {
  desc: "Shows latency with a 'Pong!' message.",
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const pingMsg = await msg.channel.send('Ping...')

  const codeBlock = Discord.Formatters.codeBlock(
    'apache',
    `Latency: ${
      pingMsg.createdTimestamp - msg.createdTimestamp
    }ms\nHeartbeat: ${msg.client.ws.ping.toFixed(0)}ms`,
  )

  await pingMsg.edit(codeBlock)
}
