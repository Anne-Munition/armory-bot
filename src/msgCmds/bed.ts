export const info: CmdInfo = {
  desc: 'Bed Response',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  await msg.channel.send('No')
}
