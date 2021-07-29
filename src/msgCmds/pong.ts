export const info: CmdInfo = {
  desc: "'Pong!'",
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  await msg.reply(':ping_pong:')
}
